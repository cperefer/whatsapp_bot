import { config } from "./config.js";
import { startWhatsAppClient } from "./whatsapp/client.js";

await Promise.all(config.whatsappSessions.map((sessionName) => startWhatsAppClient(sessionName)));
