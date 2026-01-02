import { TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
import { NewMessage, NewMessageEvent } from "telegram/events";
import * as readline from "readline";

export class TelegramService {
  private client: TelegramClient;

  constructor(
    private apiId: number,
    private apiHash: string,
    private stringSession: string
  ) {
    this.client = new TelegramClient(new StringSession(stringSession), apiId, apiHash, {
      connectionRetries: 5,
    });
  }

  async connect(): Promise<TelegramClient> {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

    await this.client.start({
      phoneNumber: async () =>
        new Promise<string>((resolve) => rl.question("Please enter your number: ", resolve)),
      password: async () =>
        new Promise<string>((resolve) => rl.question("Please enter your password: ", resolve)),
      phoneCode: async () =>
        new Promise<string>((resolve) => rl.question("Please enter the code you received: ", resolve)),
      onError: (err) => console.error("Login error:", err),
    });

    console.log("✅ Connected successfully!");
    return this.client;
  }

  isConnected(): boolean {
    return this?.client && this?.client?.connected === true;
  }

  onMessage(handler: (event: NewMessageEvent) => Promise<void>): void {
    this.client.addEventHandler(handler, new NewMessage({ incoming: true }));
  }
}