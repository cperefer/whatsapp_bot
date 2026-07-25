import {
  makeWASocket,
  useMultiFileAuthState,
  fetchLatestBaileysVersion,
  DisconnectReason,
} from "@whiskeysockets/baileys";
import type { Boom } from "@hapi/boom";
import qrcode from "qrcode-terminal";
import { registerMessageHandlers } from "./handlers.js";

export async function startWhatsAppClient(): Promise<void> {
  const { state, saveCreds } = await useMultiFileAuthState("auth_session");
  const { version } = await fetchLatestBaileysVersion();

  const socket = makeWASocket({ auth: state, version });

  socket.ev.on("creds.update", saveCreds);

  socket.ev.on("connection.update", (update) => {
    const { connection, lastDisconnect, qr } = update;

    if (qr) {
      qrcode.generate(qr, { small: true });
    }

    if (connection === "open") {
      console.log("[whatsapp] connected");
    }

    if (connection === "close") {
      const statusCode = (lastDisconnect?.error as Boom | undefined)?.output?.statusCode;
      const shouldReconnect = statusCode !== DisconnectReason.loggedOut;
      console.log(
        `[whatsapp] connection closed (status ${statusCode ?? "unknown"}), ${shouldReconnect ? "reconnecting" : "logged out"}`,
      );
      if (shouldReconnect) {
        void startWhatsAppClient();
      }
    }
  });

  registerMessageHandlers(socket);
}
