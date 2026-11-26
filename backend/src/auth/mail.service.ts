import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createTransport, Transporter } from 'nodemailer';

@Injectable()
export class MailService {
  private readonly log = new Logger(MailService.name);
  private readonly transport: Transporter | null;

  constructor(private readonly cfg: ConfigService) {
    const url = cfg.get<string>('SMTP_URL');
    this.transport = url ? createTransport(url) : null;
  }

  async sendPasswordReset(to: string, token: string): Promise<void> {
    const base = this.cfg.get<string>('PASSWORD_RESET_URL') ?? 'spotmusic://reset-password';
    const link = `${base}${base.includes('?') ? '&' : '?'}token=${encodeURIComponent(token)}`;

    if (!this.transport) {
      // Integration not configured. Dev only: print the link instead of emailing it.
      if (this.cfg.get('NODE_ENV') === 'production') {
        this.log.error('SMTP_URL is not set: password-reset email was NOT sent.');
        return;
      }
      this.log.warn(`[DEV ONLY] Password reset link for ${to}: ${link}`);
      return;
    }

    await this.transport.sendMail({
      from: this.cfg.get<string>('MAIL_FROM') ?? 'SpotMusic <no-reply@localhost>',
      to,
      subject: 'Reset your SpotMusic password',
      text:
        `Someone asked to reset the password for your SpotMusic account.\n\n` +
        `Open this link within 30 minutes to choose a new one:\n${link}\n\n` +
        `If this wasn't you, you can ignore this email.`,
    });
  }
}
