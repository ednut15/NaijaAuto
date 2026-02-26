import { Resend } from "resend";

import { env } from "@/lib/env";

export class Mailer {
  private client: Resend | null = env.RESEND_API_KEY ? new Resend(env.RESEND_API_KEY) : null;

  async send(params: { to: string; subject: string; html: string }): Promise<void> {
    if (!this.client) {
      return;
    }

    await this.client.emails.send({
      from: env.EMAIL_FROM,
      to: params.to,
      subject: params.subject,
      html: params.html,
    });
  }
}
