export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export interface EmailProvider {
  send(message: EmailMessage): Promise<void>;
}

export class MemoryEmailProvider implements EmailProvider {
  public readonly messages: EmailMessage[] = [];

  public send(message: EmailMessage): Promise<void> {
    this.messages.push(message);
    return Promise.resolve();
  }
}
