import {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
} from "@whiskeysockets/baileys";
import type { Boom } from "@hapi/boom";
import qrcode from "qrcode-terminal";
import { registerMessageHandlers } from "./handlers.js";
import { logger } from "../logger.js";

// Each user gets their own linked device (own auth folder), so each has an
// independent WhatsApp session paired to their own account instead of all
// of them sharing a single number.
export async function startWhatsAppClient(sessionName: string): Promise<void> {
  const { state, saveCreds } = await useMultiFileAuthState(`auth_sessions/${sessionName}`);
  const { version } = await fetchLatestBaileysVersion();

  const socket = makeWASocket({ auth: state, version });

  socket.ev.on("creds.update", saveCreds);

  socket.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      console.log(`[whatsapp:${sessionName}] scan this QR code from that person's phone (WhatsApp → Linked devices):`);
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      logger.info(`[whatsapp:${sessionName}] connected`);
    }

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      logger.warn(
        `[whatsapp:${sessionName}] connection closed (status ${statusCode ?? "unknown"}), ${shouldReconnect ? "reconnecting" : "logged out"}`,
      );
      if (shouldReconnect) {
        startWhatsAppClient(sessionName).catch((error) => {
          logger.error(`[whatsapp:${sessionName}] failed to reconnect:`, error);
        });
      }
    }
  });

  registerMessageHandlers(socket, sessionName);
}
