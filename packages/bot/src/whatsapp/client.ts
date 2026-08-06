import {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
} from "@whiskeysockets/baileys";
import type { Boom } from "@hapi/boom";
import qrcode from "qrcode-terminal";
import { registerMessageHandlers } from "./handlers.js";
import { registerActiveSocket, unregisterActiveSocket } from "./sender.js";
import { logger } from "../logger.js";

const MAX_RECONNECT_DELAY_MS = 60_000;
const reconnectAttempts = new Map<string, number>();

// Each user gets their own linked device (own auth folder), so each has an
// independent WhatsApp session paired to their own account instead of all
// of them sharing a single number.
export async function startWhatsAppClient(sessionName: string): Promise<void> {
  const { state, saveCreds } = await useMultiFileAuthState(`auth_sessions/${sessionName}`);
  const { version } = await fetchLatestBaileysVersion();

  // Baileys defaults to markOnlineOnConnect: true, which broadcasts an
  // "available" presence the moment the socket connects. Since this bot
  // stays connected indefinitely, that made the linked account (and the
  // partner's chat with it) show as permanently online in WhatsApp.
  const socket = makeWASocket({ auth: state, version, markOnlineOnConnect: false });

  socket.ev.on("creds.update", saveCreds);

  socket.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log(`[whatsapp:${sessionName}] scan this QR code from that person's phone (WhatsApp → Linked devices):`);
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      reconnectAttempts.delete(sessionName);
      registerActiveSocket(sessionName, socket);
      logger.info(`[whatsapp:${sessionName}] connected`);
    }

    if (connection === "close") {
      unregisterActiveSocket(sessionName);
      const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
      // loggedOut: the device was unlinked from the phone. forbidden: WhatsApp
      // rejected the account (e.g. banned). Retrying either just hammers a
      // dead session, which looks like abusive/bot behavior to WhatsApp.
      const shouldReconnect =
        statusCode !== DisconnectReason.loggedOut && statusCode !== DisconnectReason.forbidden;

      if (!shouldReconnect) {
        reconnectAttempts.delete(sessionName);
        logger.warn(`[whatsapp:${sessionName}] connection closed (status ${statusCode ?? "unknown"}), not reconnecting`);
        return;
      }

      const attempt = (reconnectAttempts.get(sessionName) ?? 0) + 1;
      reconnectAttempts.set(sessionName, attempt);
      const delayMs = Math.min(1000 * 2 ** (attempt - 1), MAX_RECONNECT_DELAY_MS);

      logger.warn(
        `[whatsapp:${sessionName}] connection closed (status ${statusCode ?? "unknown"}), reconnecting in ${delayMs}ms (attempt ${attempt})`,
      );
      setTimeout(() => {
        startWhatsAppClient(sessionName).catch((error) => {
          logger.error(`[whatsapp:${sessionName}] failed to reconnect:`, error);
        });
      }, delayMs);
    }
  });

  registerMessageHandlers(socket, sessionName);
}
