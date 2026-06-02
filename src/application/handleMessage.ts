import { MessagePublisher } from "../ports/MessagePublisher";
import { NewMessageEvent } from "telegram/events";
import { Api } from "telegram";

export class MessageHandler {
  constructor(private publishers: MessagePublisher[]) {
    if (publishers.length === 0) {
      console.warn("⚠️ No publishers configured. Messages will not be forwarded.");
    }
  }

  async onMessage(event: NewMessageEvent): Promise<void> {
    await this.forward(event.message, event.chatId?.toString() || null);
  }

  async forward(message: Api.Message, chatId: string | null): Promise<void> {
    try {
      const photo =
        message.photo && message.photo instanceof Api.Photo ? message.photo : null;

      const payload = {
        type: "message",
        text: message.text || "",
        image: photo
          ? {
              id: photo.id?.toString(),
              accessHash: photo.accessHash?.toString() ?? null,
            }
          : null,
        timestamp: message.date,
        chatId: chatId,
        isReply: message.replyToMsgId ? true : false,
        photo: photo?.toJSON() || null,
      };

      const results = await Promise.allSettled(
        this.publishers.map(publisher => publisher.publish(payload))
      );

      results.forEach((result, index) => {
        if (result.status === 'rejected') {
          console.error(`❌ Publisher ${index} failed:`, result.reason);
        }
      });

      const successCount = results.filter(r => r.status === 'fulfilled').length;
      console.log(`📊 Message forwarded to ${successCount}/${this.publishers.length} publishers`);

    } catch (error) {
      console.error("❌ Error handling message:", error);
    }
  }
}