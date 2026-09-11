export interface SmsSendInput {
  to: string;
  message: string;
  templateId: string;
}

export interface SmsSendResult {
  status: "SENT" | "FAILED";
  providerResponse: string;
}

export interface SmsProvider {
  send(input: SmsSendInput): Promise<SmsSendResult>;
}

/** Logs instead of sending — the default until a real SMS_PROVIDER is
 * configured (Section 54's documented exception: this integration
 * genuinely needs an external DLT-registered gateway credential). */
class DevSmsProvider implements SmsProvider {
  async send(input: SmsSendInput): Promise<SmsSendResult> {
    console.log(`[dev-sms] to=${input.to} template=${input.templateId} message="${input.message}"`);
    return { status: "SENT", providerResponse: "dev-provider: logged, not actually sent" };
  }
}

/**
 * Generic REST gateway for a DLT-registered Indian SMS provider (e.g.
 * MSG91's Flow API shape: POST with a template id + variable map). Most
 * DLT providers follow this general request shape; if yours differs,
 * this is the one file to adapt — everything else in the app talks to
 * the SmsProvider interface, not to this class directly.
 */
class HttpSmsProvider implements SmsProvider {
  constructor(
    private readonly apiKey: string,
    private readonly senderId: string,
    private readonly endpoint: string
  ) {}

  async send(input: SmsSendInput): Promise<SmsSendResult> {
    try {
      const res = await fetch(this.endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json", authkey: this.apiKey },
        body: JSON.stringify({
          sender: this.senderId,
          template_id: input.templateId,
          recipients: [{ mobiles: input.to, message: input.message }],
        }),
      });
      const body = await res.text();
      return { status: res.ok ? "SENT" : "FAILED", providerResponse: body.slice(0, 1000) };
    } catch (err) {
      return { status: "FAILED", providerResponse: err instanceof Error ? err.message : "Unknown SMS send error" };
    }
  }
}

export function getSmsProvider(): SmsProvider {
  const provider = process.env.SMS_PROVIDER || "dev";
  if (provider === "dev") return new DevSmsProvider();

  const apiKey = process.env.SMS_API_KEY;
  const senderId = process.env.SMS_SENDER_ID;
  if (!apiKey || !senderId) {
    console.warn(`SMS_PROVIDER=${provider} but SMS_API_KEY/SMS_SENDER_ID are not set — falling back to dev provider`);
    return new DevSmsProvider();
  }
  const endpoint = process.env.SMS_HTTP_ENDPOINT || "https://api.msg91.com/api/v5/flow/";
  return new HttpSmsProvider(apiKey, senderId, endpoint);
}
