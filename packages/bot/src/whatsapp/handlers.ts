import type { WAMessageKey, WASocket } from "@whiskeysockets/baileys";
import { jidDecode } from "@whiskeysockets/baileys";
import { config } from "../config.js";
import { runAgent } from "../agent/index.js";
import { transcribeAudio } from "../agent/tools/transcribe.js";
import { getOrCreateUser } from "../db/users.js";

// IDs of messages the bot itself just sent. In a self-chat, WhatsApp marks
// every message as fromMe:true regardless of who typed it, so we can't use
// fromMe alone to skip echoes of our own replies — we track them by id instead.
const sentMessageIds = new Set<string>();

// WhatsApp drops the _italic_ markers if they span a blank line, so a single
// _.../_ wrapper around a multi-paragraph reply renders as literal underscores.
// Instead we italicize line by line, keeping any leading emoji (e.g. a
// shopping list bullet like "🍞 1x Pan") outside the markers so it still shows.
function formatBotReply(reply: string): string {
  const lines = reply.split("\n").map((line) => {
    if (line.trim() === "") return "";
    const match = line.match(/^(\p{Extended_Pictographic}️?)\s*(.*)$/u);
    if (match) {
      const [, emoji, rest] = match;
      return rest ? `${emoji} _${rest}_` : emoji;
    }
    return `_${line}_`;
  });
  lines[0] = `🤖 ${lines[0]}`;
  return lines.join("\n");
}

// WhatsApp is migrating chats to private "@lid" identifiers instead of the
// real phone number JID ("@s.whatsapp.net"). When that happens, remoteJid is
// the opaque LID and the actual phone number travels separately on the key —
// except in a self-chat, where it doesn't travel at all and we have to match
// the LID against our own account (socket.authState.creds.me).
function resolvePhone(key: WAMessageKey, socket: WASocket): string | undefined {
  const decoded = jidDecode(key.remoteJid ?? undefined);
  if (decoded && decoded.server !== "lid") return decoded.user;

  const phoneJid = key.senderPn ?? key.participantPn;
  const resolved = jidDecode(phoneJid)?.user;
  if (resolved) return resolved;

  const me = socket.authState.creds.me;
  if (decoded && jidDecode(me?.lid)?.user === decoded.user) {
    return jidDecode(me?.id)?.user;
  }
  return undefined;
}

export function registerMessageHandlers(socket: WASocket): void {
  socket.ev.on("messages.upsert", async ({ messages }) => {
    console.log(`[whatsapp] received ${messages.length} message(s)`);

    for (const message of messages) {
      const messageId = message.key.id;
      if (messageId && sentMessageIds.has(messageId)) {
        sentMessageIds.delete(messageId);
        continue;
      }

      const remoteJid = message.key.remoteJid;
      const phone = resolvePhone(message.key, socket);
      if (!remoteJid || !phone) {
        console.log(`[whatsapp] could not resolve a phone number for jid ${remoteJid ?? "unknown"}, skipping`);
        continue;
      }

      if (!config.allowedPhones.includes(phone)) {
        console.log(`[whatsapp] ignored message from non-whitelisted number ${phone}`);
        continue;
      }

      try {
        const text =
          message.message?.conversation ?? message.message?.extendedTextMessage?.text;
        const audioMessage = message.message?.audioMessage;

        const userMessage = audioMessage
          ? await transcribeAudio(audioMessage)
          : text;

        if (!userMessage) {
          console.log(`[whatsapp] message from ${phone} had no readable text/audio, skipping`);
          continue;
        }

        console.log(`[whatsapp] processing message from ${phone}`);
        const userId = await getOrCreateUser(phone, message.pushName ?? phone);
        const reply = await runAgent(userMessage, userId);

        if (reply) {
          const formattedReply = formatBotReply(reply);
          const sent = await socket.sendMessage(remoteJid, { text: formattedReply });
          if (sent?.key.id) sentMessageIds.add(sent.key.id);
          console.log(`[whatsapp] replied to ${phone}`);
        } else {
          console.log(`[whatsapp] agent returned no reply for ${phone}`);
        }
      } catch (error) {
        console.error(`[whatsapp] error handling message from ${phone}:`, error);
      }
    }
  });
}
