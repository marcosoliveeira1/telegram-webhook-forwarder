import * as dotenv from "dotenv";
import { TelegramService } from "./infra/telegramClient";
import { MessageHandler } from "./application/handleMessage";
import { WebhookPublisher } from "./adapters/WebhookPublisher";

dotenv.config();

const apiId = Number(process.env.API_ID);
const apiHash = process.env.API_HASH ?? "";
const session = process.env.TELEGRAM_SESSION ?? "";
const webhookUrl = process.env.WEBHOOK_URL ?? "";

async function startApp() {
  const telegram = new TelegramService(apiId, apiHash, session);
  const client = await telegram.connect();

  const publishers = [
    new WebhookPublisher(webhookUrl)
  ];

  const handler = new MessageHandler(publishers);

  telegram.onMessage((event) => handler.onMessage(event));

  await client.sendMessage("me", { message: "🤖 Bot started and listening!" });
}

startApp()
  .catch(console.error);