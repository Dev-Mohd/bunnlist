import type { Mailer } from "./emailService";

// Sends the login code by email through Resend's HTTP API. The API key and the
// "from" address come from the environment; if the key is missing the mailer
// throws, and the request route swallows it to keep the response neutral (the
// code simply never arrives until the key is configured). No secrets are logged.

const RESEND_ENDPOINT = "https://api.resend.com/emails";
const DEFAULT_FROM = "BunnList <onboarding@resend.dev>";

export function otpEmail(code: string): { subject: string; text: string; html: string } {
  const subject = `رمز الدخول إلى BunnList: ${code}`;
  const text = [
    "رمز الدخول إلى BunnList:",
    code,
    "",
    "الرمز صالح لمدة ١٠ دقائق. إذا لم تطلبه، فتجاهل هذه الرسالة ولن يتغيّر شيء في حسابك.",
    "",
    "BunnList — قهوتك الجاية، هنا.",
    "https://bunnlist.com",
  ].join("\n");
  // BunnList's colors: cream ground, espresso type, the code on olive.
  const html = `<!doctype html><html dir="rtl" lang="ar"><head><meta charset="utf-8"><meta name="color-scheme" content="light"></head>
<body style="margin:0;background:#f7f1e8;padding:32px 16px;font-family:-apple-system,BlinkMacSystemFont,'SF Arabic','Segoe UI',Tahoma,Arial,sans-serif;color:#171411">
  <div style="max-width:440px;margin:0 auto;background:#fffdf9;border-radius:22px;padding:32px 28px;text-align:center;border:1px solid rgba(74,52,40,0.10)">
    <div style="font-size:22px;font-weight:700;letter-spacing:0.5px;direction:ltr">BunnList</div>
    <p style="margin:20px 0 14px;font-size:16px;color:#6b5f55">رمز الدخول إلى حسابك</p>
    <div style="display:inline-block;background:#536344;color:#f7f1e8;border-radius:14px;padding:14px 22px;font-size:32px;font-weight:700;letter-spacing:8px;direction:ltr">${code}</div>
    <p style="margin:20px 0 0;font-size:14px;line-height:1.7;color:#6b5f55">الرمز صالح لمدة ١٠ دقائق. إذا لم تطلبه، فتجاهل هذه الرسالة ولن يتغيّر شيء في حسابك.</p>
  </div>
  <p style="max-width:440px;margin:18px auto 0;text-align:center;font-size:12px;color:#987024">قهوتك الجاية، هنا. · <a href="https://bunnlist.com" style="color:#987024">bunnlist.com</a></p>
</body></html>`;
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
