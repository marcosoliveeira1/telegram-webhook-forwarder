# telegram-webhook-forwarder 📨

A lightweight, extensible TypeScript service that forwards Telegram messages to multiple publishers. Listen to incoming Telegram messages and forward them to webhooks, databases, or any custom destination.

## Features

- 🔄 Real-time message forwarding
- 📸 Support for text and image messages
- 🔌 Extensible publisher architecture
- 🔐 Secure session-based authentication
- 🐳 Docker-ready deployment
- 📦 Built with GramJS (official Telegram client library)

## Architecture

The project follows a **ports and adapters** architecture, making it easy to add new message destinations:

```
telegram-webhook-forwarder/
├── src/
│   ├── main.ts                    # Application entry point
│   ├── ports/
│   │   └── MessagePublisher.ts    # Publisher interface
│   ├── adapters/
│   │   └── WebhookPublisher.ts    # Webhook implementation
│   ├── application/
│   │   └── handleMessage.ts       # Message processing logic
│   └── infra/
│       └── telegramClient.ts      # Telegram client wrapper
├── Dockerfile
├── package.json
├── tsconfig.json
└── .env
```

## Prerequisites

- Node.js 22+ (or Docker)
- Telegram API credentials (API ID and API Hash)
- A webhook endpoint to receive messages (optional)

## Getting Started

### 1. Obtain Telegram API Credentials

1. Visit [my.telegram.org](https://my.telegram.org)
2. Log in with your phone number
3. Go to "API development tools"
4. Create a new application to get your `API_ID` and `API_HASH`

### 2. Setup

Clone the repository and install dependencies:

```bash
npm install
```

Copy the environment template:

```bash
cp .env.example .env
```

Edit `.env` with your credentials:

```env
API_ID=your_api_id
API_HASH=your_api_hash
TELEGRAM_SESSION=
WEBHOOK_URL=https://your-webhook-endpoint.com/webhook
```

### 3. First Run (Generate Session)

On first run, you'll need to authenticate and generate a session string:

```bash
npm run dev
```

Follow the prompts to:
1. Enter your phone number
2. Enter the verification code sent to Telegram
3. Enter your 2FA password (if enabled)

The service will print a session string. **Copy this string** and add it to your `.env` file:

```env
TELEGRAM_SESSION=your_session_string_here
```

### 4. Run the Service

**Development mode:**
```bash
npm run dev
```

**Production mode:**
```bash
npm run build
npm start
```

**Docker:**
```bash
docker build -t telegram-webhook-forwarder .
docker run -d --env-file .env telegram-webhook-forwarder
```

## Extending with Custom Publishers

The system is designed to be extensible. You can easily add new publishers by implementing the `MessagePublisher` interface:

### Example: Creating a Console Logger Publisher

```typescript
// src/adapters/ConsolePublisher.ts
import { MessagePublisher } from "../ports/MessagePublisher";

export class ConsolePublisher implements MessagePublisher {
  async publish(data: any): Promise<void> {
    console.log("📝 [ConsolePublisher] Message received:", {
      text: data.text,
      chatId: data.chatId,
      timestamp: new Date(data.timestamp * 1000).toISOString()
    });
  }
}
```

### Example: Creating a Google Sheets Publisher

```typescript
// src/adapters/SheetsPublisher.ts
import { MessagePublisher } from "../ports/MessagePublisher";
import { google } from "googleapis";

export class SheetsPublisher implements MessagePublisher {
  private sheets;
  
  constructor(private spreadsheetId: string) {
    const auth = new google.auth.GoogleAuth({
      keyFile: "./credentials.json",
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });
    this.sheets = google.sheets({ version: "v4", auth });
  }

  async publish(data: any): Promise<void> {
    await this.sheets.spreadsheets.values.append({
      spreadsheetId: this.spreadsheetId,
      range: "Messages!A:D",
      valueInputOption: "RAW",
      requestBody: {
        values: [[
          new Date(data.timestamp * 1000).toISOString(),
          data.chatId,
          data.text,
          data.image ? "Has image" : "No image"
        ]]
      }
    });
    console.log("✅ [SheetsPublisher] Message saved to spreadsheet");
  }
}
```

### Adding Publishers to Your Application

Edit `src/main.ts`:

```typescript
import { WebhookPublisher } from "./adapters/WebhookPublisher";
import { ConsolePublisher } from "./adapters/ConsolePublisher";
import { SheetsPublisher } from "./adapters/SheetsPublisher";

// Configure multiple publishers
const publishers = [
  new WebhookPublisher(webhookUrl),
  new ConsolePublisher(),
  new SheetsPublisher(process.env.SPREADSHEET_ID!)
];

const handler = new MessageHandler(publishers);
```

### Publisher Behavior

- Messages are sent to **all publishers in parallel** using `Promise.allSettled`
- If one publisher fails, others will still receive the message
- Failed publishers are logged but don't stop the process
- Success/failure stats are logged for each message

## Message Format

Messages are forwarded to publishers as JSON:

```json
{
  "type": "message",
  "text": "Hello world",
  "image": {
    "id": "5470158841234567890",
    "accessHash": "1234567890123456789"
  },
  "timestamp": 1698765432,
  "chatId": "1234567890",
  "isReply": false,
  "photo": { /* full photo object */ }
}
```

## Configuration

| Variable | Description | Required |
|----------|-------------|----------|
| `API_ID` | Telegram API ID from my.telegram.org | ✅ |
| `API_HASH` | Telegram API Hash from my.telegram.org | ✅ |
| `TELEGRAM_SESSION` | Session string (generated on first login) | ✅ |
| `WEBHOOK_URL` | Your webhook endpoint URL | ⚠️ Optional* |

*If `WEBHOOK_URL` is empty, the WebhookPublisher will skip sending messages.

## Security Notes

- 🔒 Never commit your `.env` file or session string to version control
- 🔑 Treat your session string like a password - it provides full account access
- 🛡️ Use environment variables or secrets management in production
- ⚠️ Running multiple instances with the same session may cause conflicts

## Troubleshooting

**"Could not find the input entity"**
- Make sure you're logged into the correct Telegram account
- Verify the chat/user you're trying to message exists

**Connection issues**
- Check your internet connection
- Verify your API credentials are correct
- Ensure you're not running multiple instances with the same session

**Publisher not receiving messages**
- Check publisher-specific logs in the console
- Verify publisher configuration (URLs, credentials, etc.)
- Ensure your endpoint/service is accessible

**Some publishers fail but others work**
- This is expected behavior - failures are isolated
- Check the specific publisher logs for error details
- Failed publishers don't affect successful ones

## Development

```bash
# Install dependencies
npm install

# Run in development mode with hot reload
npm run dev

# Build TypeScript
npm run build

# Run production build
npm start
```

## License

MIT

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

---

Built with ❤️ using [GramJS](https://github.com/gram-js/gramjs)