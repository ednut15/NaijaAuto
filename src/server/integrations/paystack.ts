import { env, isProduction } from "@/lib/env";
import { signHmacSha512 } from "@/lib/security";

interface PaystackInitializeInput {
  email: string;
  amountKobo: number;
  reference: string;
  callbackUrl: string;
  metadata?: Record<string, unknown>;
}

export interface PaystackInitializeResult {
  authorizationUrl: string;
  accessCode: string;
  reference: string;
  mocked: boolean;
}

export interface PaystackWebhookPayload {
  event: string;
  data: {
    id: number;
    reference: string;
    status: string;
    amount: number;
    metadata?: Record<string, unknown>;
  };
}

export class PaystackClient {
  verifyWebhookSignature(rawBody: string, signature: string | null): boolean {
    if (!env.PAYSTACK_SECRET_KEY) {
      return !isProduction;
    }

    if (!signature) {
      return false;
    }

    const expected = signHmacSha512(rawBody, env.PAYSTACK_SECRET_KEY);
    return expected === signature;
  }

  async initializeTransaction(input: PaystackInitializeInput): Promise<PaystackInitializeResult> {
    if (!env.PAYSTACK_SECRET_KEY) {
      if (!isProduction) {
        return {
          authorizationUrl: `${env.NEXT_PUBLIC_APP_URL}/seller/dashboard?mock_payment=1&reference=${input.reference}`,
          accessCode: `mock_access_${Date.now()}`,
          reference: input.reference,
          mocked: true,
        };
      }
      throw new Error("PAYSTACK_SECRET_KEY is required in production.");
    }

    const response = await fetch("https://api.paystack.co/transaction/initialize", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${env.PAYSTACK_SECRET_KEY}`,
      },
      body: JSON.stringify({
        email: input.email,
        amount: input.amountKobo,
        reference: input.reference,
        callback_url: input.callbackUrl,
        metadata: input.metadata,
      }),
    });

    if (!response.ok) {
      throw new Error(`Paystack initialization failed: ${await response.text()}`);
    }

    const body = (await response.json()) as {
      data: {
        authorization_url: string;
        access_code: string;
        reference: string;
      };
    };

    return {
      authorizationUrl: body.data.authorization_url,
      accessCode: body.data.access_code,
      reference: body.data.reference,
      mocked: false,
    };
  }
}
