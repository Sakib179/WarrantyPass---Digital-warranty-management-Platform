import nodemailer, { type Transporter } from 'nodemailer';

import type { AppConfig } from '../../config/env.js';
import type { EmailMessage, EmailProvider } from './email-provider.js';

export class SmtpEmailProvider implements EmailProvider {
  private readonly transporter: Transporter;

  public constructor(private readonly config: AppConfig) {
    this.transporter = nodemailer.createTransport({
      host: config.SMTP_HOST,
      port: config.SMTP_PORT,
      secure: config.SMTP_SECURE,
      ...(config.SMTP_USER && config.SMTP_PASSWORD
        ? { auth: { user: config.SMTP_USER, pass: config.SMTP_PASSWORD } }
        : {}),
    });
  }

  public async send(message: EmailMessage): Promise<void> {
    await this.transporter.sendMail({
      from: {
        name: this.config.SMTP_FROM_NAME,
        address: this.config.SMTP_FROM_EMAIL,
      },
      ...message,
    });
  }
}
