import { config } from "../../bot/src/config.js";
import { db } from "../../bot/src/db/index.js";
import { sendSelfMessage } from "../../bot/src/whatsapp/sender.js";
import { createApp } from "./app.js";

const PORT = Number(process.env.API_PORT ?? 3001);

const app = createApp({ db, sendSelfMessage, allowedPhones: config.allowedPhones });
app.listen(PORT, () => {
  console.log(`[api] listening on port ${PORT}`);
});
