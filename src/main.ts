import * as dotenv from "dotenv";
import { TelegramService } from "./infra/telegramClient";
import { MessageHandler } from "./application/handleMessage";
import { WebhookPublisher } from "./adapters/WebhookPublisher";
import { HealthCheckServer } from "./infra/healthCheck";

dotenv.config();

const apiId = Number(process.env.API_ID);
const apiHash = process.env.API_HASH ?? "";
const session = process.env.TELEGRAM_SESSION ?? "";
const webhookUrl = process.env.WEBHOOK_URL ?? "";
const port = Number(process.env.PORT) || 3000;

async function startApp() {
  const telegram = new TelegramService(apiId, apiHash, session);
  
  // Start health check server
  const healthCheck = new HealthCheckServer(telegram, port);
  healthCheck.start();

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