export abstract class MessagePublisher {
  abstract publish(data: any): Promise<void>;
}