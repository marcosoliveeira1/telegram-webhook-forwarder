import { MessagePublisher } from "../ports/MessagePublisher";
import { NewMessageEvent } from "telegram/events";

export class MessageHandler {
  constructor(private publishers: MessagePublisher[]) {
    if (publishers.length === 0) {
      console.warn("⚠️ No publishers configured. Messages will not be forwarded.");
    }
  }

  async onMessage(event: NewMessageEvent): Promise<void> {
    try {
      const { message } = event;

      const payload = {
        type: "message",
        text: message.text || "",
        image: message.photo && 'id' in message.photo ? {
          id: message.photo.id?.toString(),
          accessHash: 'accessHash' in message.photo ? message.photo.accessHash?.toString() : null,
        } : null,
        timestamp: message.date,
        chatId: event.chatId?.toString() || null,
        isReply: message.replyToMsgId ? true : false,
        photo: message.photo?.toJSON() || null,
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