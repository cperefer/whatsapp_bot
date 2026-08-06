import type { WASocket } from "@whiskeysockets/baileys";
import { jidDecode } from "@whiskeysockets/baileys";

// Populated by client.ts as each session's socket connects/disconnects, so
// other parts of the app (the dashboard API) can reach a specific user's
// linked WhatsApp session without needing to know about Baileys directly.
const activeSockets = new Map<string, WASocket>();

// IDs of messages we sent ourselves, per session. In a self-chat every
// message — ours and the user's — arrives via messages.upsert marked
// fromMe:true, so the only way to tell our own echoes apart from real
// incoming messages is by id. Anything that sends into a self-chat (the
// bot's own replies in handlers.ts, or a dashboard OTP via sendSelfMessage)
// must register its id here so handlers.ts can skip the echo instead of
// feeding it back into the agent.
const sentMessageIds = new Map<string, Set<string>>();

export function registerActiveSocket(sessionName: string, socket: WASocket): void {
  activeSockets.set(sessionName, socket);
}

export function unregisterActiveSocket(sessionName: string): void {
  activeSockets.delete(sessionName);
}

export function markSentByUs(sessionName: string, messageId: string): void {
  let ids = sentMessageIds.get(sessionName);
  if (!ids) {
    ids = new Set();
    sentMessageIds.set(sessionName, ids);
  }
  ids.add(messageId);
}

export function wasSentByUs(sessionName: string, messageId: string): boolean {
  const ids = sentMessageIds.get(sessionName);
  if (!ids?.has(messageId)) return false;
  ids.delete(messageId);
  return true;
}

// Finds the session whose linked account is `phone` and sends it a message in
// that account's self-chat — the same channel the bot already talks to each
// user through. Used to deliver dashboard login codes. Returns false if no
// session for that phone is currently connected.
export async function sendSelfMessage(phone: string, text: string): Promise<boolean> {
  for (const [sessionName, socket] of activeSockets.entries()) {
    const me = socket.authState.creds.me;
    if (!me || jidDecode(me.id)?.user !== phone) continue;

    const sent = await socket.sendMessage(me.id, { text });
    if (sent?.key.id) markSentByUs(sessionName, sent.key.id);
    return true;
  }
  return false;
}
