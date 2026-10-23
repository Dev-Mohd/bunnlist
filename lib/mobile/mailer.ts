import type { Mailer } from "./emailService";

// Sends the login code by email through Resend's HTTP API. The API key and the
// "from" address come from the environment; if the key is missing the mailer
// throws, and the request route swallows it to keep the response neutral (the
// code simply never arrives until the key is configured). No secrets are logged.

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FROM = "BunnList <onboarding@resend.dev>";

function otpEmail(code: string): { subject: string; text: string; html: string } {
  const subject = `رمز الدخول إلى بن لست: ${code}`;
  const text = `رمز الدخول الخاص بك هو: ${code}\nصالح لمدة 10 دقائق. إذا لم تطلب هذا الرمز، تجاهل هذه الرسالة.`;
  const html = `<!doctype html><html dir="rtl" lang="ar"><body style="font-family:system-ui,Arial,sans-serif;background:#faf7f2;padding:24px;color:#2b2b2b">
  <div style="max-width:420px;margin:auto;background:#fff;border-radius:16px;padding:28px;text-align:center">
    <h1 style="font-size:20px;margin:0 0 12px">بن لست</h1>
    <p style="margin:0 0 16px;color:#666">رمز الدخول الخاص بك:</p>
    <div style="font-size:34px;font-weight:700;letter-spacing:8px;direction:ltr">${code}</div>
    <p style="margin:18px 0 0;font-size:13px;color:#999">صالح لمدة 10 دقائق. إذا لم تطلب هذا الرمز، تجاهل هذه الرسالة.</p>
  </div></body></html>`;
  return { subject, text, html };
}

export function createResendMailer(): Mailer {
  return {
    async sendOtp(email: string, code: string): Promise<void> {
      const apiKey = process.env.RESEND_API_KEY;
      if (!apiKey) throw new Error("RESEND_API_KEY is not configured.");
      const from = process.env.MOBILE_MAIL_FROM || DEFAULT_FROM;
      const { subject, text, html } = otpEmail(code);

      const res = await fetch(RESEND_ENDPOINT, {
        method: "POST",
        headers: { Authorization: `Bearer ${apiKey}`, "Content-Type": "application/json" },
        body: JSON.stringify({ from, to: [email], subject, text, html }),
      });
      if (!res.ok) {
        // Do not include the body verbatim in case it echoes the address.
        throw new Error(`Resend send failed with status ${res.status}`);
      }
    },
  };
}
