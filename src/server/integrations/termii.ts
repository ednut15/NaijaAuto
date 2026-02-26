import { env, isProduction } from "@/lib/env";

export interface SendOtpResult {
  messageId: string;
  mocked: boolean;
}

export class TermiiClient {
  async sendOtp(phone: string, code: string): Promise<SendOtpResult> {
    if (!env.TERMII_API_KEY) {
      if (!isProduction) {
        return {
          messageId: `mock-${Date.now()}`,
          mocked: true,
        };
      }
      throw new Error("TERMII_API_KEY is required in production.");
    }

    const payload = {
      to: phone,
      from: env.TERMII_SENDER_ID ?? "NaijaAuto",
      sms: `Your NaijaAuto verification code is ${code}.`,
      type: "plain",
      channel: "generic",
      api_key: env.TERMII_API_KEY,
    };

    const response = await fetch("https://api.ng.termii.com/api/sms/send", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const details = await response.text();
      throw new Error(`Termii OTP failed: ${details}`);
    }

    const data = (await response.json()) as { message_id?: string };

    return {
      messageId: data.message_id ?? `termii-${Date.now()}`,
      mocked: false,
    };
  }
}
