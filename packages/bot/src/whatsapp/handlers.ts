import type { WASocket } from "@whiskeysockets/baileys";
import { config } from "../config.js";
import { runAgent } from "../agent/index.js";
import { transcribeAudio } from "../agent/tools/transcribe.js";

export function registerMessageHandlers(socket: WASocket): void {
  socket.ev.on("messages.upsert", async ({ messages }) => {
    for (const message of messages) {
      const remoteJid = message.key.remoteJid;
      const phone = remoteJid?.split("@")[0];
      if (!remoteJid || !phone || !config.allowedPhones.includes(phone)) continue;

      const text =
        message.message?.conversation ?? message.message?.extendedTextMessage?.text;
      const audioMessage = message.message?.audioMessage;

      const userMessage = audioMessage
        ? await transcribeAudio(audioMessage)
        : text;

      if (!userMessage) continue;

      const reply = await runAgent(userMessage);
      if (reply) {
        await socket.sendMessage(remoteJid, { text: reply });
      }
    }
  });
}
