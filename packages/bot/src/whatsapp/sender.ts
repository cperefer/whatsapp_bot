import type { WASocket } from "@whiskeysockets/baileys";
import { jidDecode } from "@whiskeysockets/baileys";

// Populated by client.ts as each session's socket connects/disconnects, so
// other parts of the app (the dashboard API) can reach a specific user's
// linked WhatsApp session without needing to know about Baileys directly.
const activeSockets = new Map<string, WASocket>();

export function registerActiveSocket(sessionName: string, socket: WASocket): void {
  activeSockets.set(sessionName, socket);
}

export function unregisterActiveSocket(sessionName: string): void {
  activeSockets.delete(sessionName);
}

// Finds the session whose linked account is `phone` and sends it a message in
// that account's self-chat — the same channel the bot already talks to each
// user through. Used to deliver dashboard login codes. Returns false if no
// session for that phone is currently connected.
export async function sendSelfMessage(phone: string, text: string): Promise<boolean> {
  for (const socket of activeSockets.values()) {
    const me = socket.authState.creds.me;
    if (!me || jidDecode(me.id)?.user !== phone) continue;

    await socket.sendMessage(me.id, { text });
    return true;
  }
  return false;
}
