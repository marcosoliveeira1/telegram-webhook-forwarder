import { MessagePublisher } from "../ports/MessagePublisher";

export class WebhookPublisher implements MessagePublisher {
  constructor(private webhookUrl: string) {
    if (!webhookUrl) {
      console.warn("⚠️ Webhook URL is empty. WebhookPublisher will not send messages.");
    }
  }

  async publish(data: any): Promise<void> {
    if (!this.webhookUrl) {
      console.warn("⚠️ Webhook URL not configured. Message skipped.");
      return;
    }

    try {
      const response = await fetch(this.webhookUrl, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      console.log(`✅ [WebhookPublisher] Message sent successfully at ${new Date().toISOString()}`);
    } catch (error: any) {
      console.error("❌ [WebhookPublisher] Error sending message:", error.message);
      throw error;
    }
  }
}