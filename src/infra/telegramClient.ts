import { Api, TelegramClient } from "telegram";
import { StringSession } from "telegram/sessions";
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
      deviceModel: "Servidor Node",
      systemVersion: "Linux",
      appVersion: "1.0",
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

    const me = await this.client.getMe();
    console.log(`✅ Logado como: ${me.firstName || me.username}`);

    // Registra os diálogos para o gramJS reconhecer grupos/canais nos updates
    console.log("Sincronizando chats para receber mensagens...");
    await this.client.getDialogs({ limit: 1000 });

    console.log("✅ Conectado e escutando ativamente!");
    console.log("🔑 Save this session string:\n", this.client.session.save());
    return this.client;
  }

  isConnected(): boolean {
    return this?.client && this?.client?.connected === true;
  }

  /** Log leve de todos os updates crus, só para diagnóstico do que o servidor entrega. */
  logRawUpdates(): void {
    this.client.addEventHandler((update: any) => {
      const className = update?.className || update?.constructor?.name;
      const text =
        update?.message?.message?.substring?.(0, 50) ||
        update?.message?.substring?.(0, 50);
      const chatId =
        update?.chatId?.toString() || update?.message?.chatId?.toString();

      console.log(
        `📡 [RAW UPDATE] ${new Date().toISOString()} type=${className} chatId=${chatId ?? "-"} text=${text ?? ""}`
      );
    });
  }

  /**
   * Encaminhamento por POLLING (pull). Como o push de updates é instável para
   * algumas contas/DCs (issues #654/#575/#280 do gramJS, idem no Telethon),
   * em vez de esperar o servidor empurrar, buscamos ativamente as novas
   * mensagens de cada diálogo. Dedupe por id de mensagem garante que nada
   * seja encaminhado duas vezes.
   */
  async startPolling(
    forward: (message: Api.Message, chatId: string) => Promise<void>,
    intervalMs = 5000
  ): Promise<void> {
    const lastIds = new Map<string, number>();

    // Inicializa com a última mensagem de cada chat: só encaminhamos o que vier DEPOIS.
    const dialogs = await this.client.getDialogs({ limit: 1000 });
    for (const d of dialogs) {
      const id = d.id?.toString();
      if (id) lastIds.set(id, typeof d.message?.id === "number" ? d.message.id : 0);
    }
    console.log(
      `🛰️ Polling ativo: ${lastIds.size} chats, a cada ${intervalMs / 1000}s`
    );

    let running = false;
    setInterval(async () => {
      if (running || !this.isConnected()) return;
      running = true;
      try {
        const current = await this.client.getDialogs({ limit: 1000 });
        for (const d of current) {
          const chatId = d.id?.toString();
          if (!chatId) continue;

          const topId = typeof d.message?.id === "number" ? d.message.id : 0;
          const lastId = lastIds.get(chatId) ?? topId;
          if (topId <= lastId) {
            lastIds.set(chatId, topId);
            continue;
          }

          // Busca tudo que chegou desde a última checagem (vem do mais novo p/ o mais antigo).
          const messages = await this.client.getMessages(d.entity, {
            minId: lastId,
            limit: 100,
          });
          for (const m of [...messages].reverse()) {
            if (m instanceof Api.Message && m.id > lastId) {
              await forward(m, chatId);
            }
          }
          lastIds.set(chatId, topId);
        }
      } catch (err) {
        console.error("⚠️ [polling] erro:", err);
      } finally {
        running = false;
      }
    }, intervalMs);
  }
}