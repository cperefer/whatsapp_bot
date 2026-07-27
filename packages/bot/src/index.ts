import { config } from "./config.js";
import { startWhatsAppClient } from "./whatsapp/client.js";
import { logger } from "./logger.js";

// Without these, an unhandled rejection anywhere (a transient network error
// during a WhatsApp reconnect, for example) silently kills the process. PM2
// then restarts it with no trace of why, which looked like the bot randomly
// re-processing and re-sending the last message on every restart.
process.on("unhandledRejection", (error) => {
  logger.error("unhandled rejection:", error);
});

process.on("uncaughtException", (error) => {
  logger.error("uncaught exception:", error);
});

await Promise.all(config.whatsappSessions.map((sessionName) => startWhatsAppClient(sessionName)));
