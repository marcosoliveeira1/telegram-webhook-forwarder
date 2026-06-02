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

console.log("🚀 Starting Telegram Bot with the following configuration:")
console.log(`- API ID: ${apiId}`)
console.log(`- API Hash: ${apiHash ? "✅ Provided" : "❌ Missing"}`)
console.log(`- Session: ${session} (${session ? "✅ Provided" : "❌ Missing"})`)
console.log(`- Webhook URL: ${webhookUrl ? "✅ Provided" : "❌ Missing"}`)
console.log(`- Health Check Port: ${port}`);

async function startApp() {
  const telegram = new TelegramService(apiId, apiHash, session);

  // Start health check server
  const healthCheck = new HealthCheckServer(telegram, port);
  healthCheck.start();

  const client = await telegram.connect();

  // Fetch dialogs so gramJS registers all groups/channels for receiving updates
  const dialogs = await client.getDialogs();
  console.log(`📋 Loaded ${dialogs.length} dialogs:`);
  for (const d of dialogs) {
    console.log(`  - [${d.isGroup ? 'GROUP' : d.isChannel ? 'CHANNEL' : 'PRIVATE'}] ${d.title || d.name} (id: ${d.id})`);
  }

  const publishers = [
    new WebhookPublisher(webhookUrl)
  ];

  const handler = new MessageHandler(publishers);

  // Diagnóstico: loga os updates crus que o servidor entrega (push)
  telegram.logRawUpdates();

  // Encaminhamento confiável via polling (pull), independente do push instável
  const pollMs = Number(process.env.POLL_INTERVAL_MS) || 5000;
  await telegram.startPolling((message, chatId) => handler.forward(message, chatId), pollMs);

  await client.sendMessage("me", { message: "🤖 Bot started and listening!" });
}

startApp()
  .catch(console.error);