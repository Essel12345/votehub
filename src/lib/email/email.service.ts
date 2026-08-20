/**
 * Email Service Abstraction Layer
 * Provides a provider-agnostic interface for sending emails.
 * 
 * Supported providers:
 * - SENDGRID: Requires EMAIL_PROVIDER=sendgrid and EMAIL_API_KEY
 * - RESEND: Requires EMAIL_PROVIDER=resend and EMAIL_API_KEY
 * - SMTP: Requires EMAIL_PROVIDER=smtp with SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD
 * 
 * For development/testing without provider configured:
 * - Logs emails to console (no actual sending)
 */

export interface EmailPayload {
  to: string;
  subject: string;
  htmlContent: string;
  textContent?: string;
  replyTo?: string;
  cc?: string[];
  bcc?: string[];
}

export interface SendEmailResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

/**
 * Send an email using the configured provider
 * Returns success/failure status without throwing errors
 * This allows election operations to continue even if email delivery fails
 */
export async function sendEmail(
  payload: EmailPayload
): Promise<SendEmailResult> {
  const provider = process.env.EMAIL_PROVIDER?.toLowerCase() ?? "none";

  try {
    switch (provider) {
      case "sendgrid":
        return await sendViasendgrid(payload);
      case "resend":
        return await sendViaResend(payload);
      case "smtp":
        return await sendViaSMTP(payload);
      default:
        // Development/testing mode - log email
        console.log("📧 [Email Logging Mode]", {
          to: payload.to,
          subject: payload.subject,
          timestamp: new Date().toISOString(),
        });
        return { success: true, messageId: `dev-${Date.now()}` };
    }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error("Email send failed:", {
      provider,
      to: payload.to,
      error: errorMessage,
    });
    return {
      success: false,
      error: errorMessage,
    };
  }
}

/**
 * SendGrid provider implementation
 * Requires: EMAIL_API_KEY set to SendGrid API key
 */
async function sendViasendgrid(payload: EmailPayload): Promise<SendEmailResult> {
  const apiKey = process.env.EMAIL_API_KEY;
  if (!apiKey) {
    throw new Error("SendGrid API key not configured (EMAIL_API_KEY)");
  }

  const response = await fetch("https://api.sendgrid.com/v3/mail/send", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      personalizations: [
        {
          to: [{ email: payload.to }],
          cc: payload.cc?.map((email) => ({ email })),
          bcc: payload.bcc?.map((email) => ({ email })),
        },
      ],
      from: { email: process.env.EMAIL_FROM ?? "noreply@votehub.local" },
      subject: payload.subject,
      content: [
        payload.htmlContent ? { type: "text/html", value: payload.htmlContent } : null,
        payload.textContent ? { type: "text/plain", value: payload.textContent } : null,
      ].filter(Boolean),
      reply_to: payload.replyTo ? { email: payload.replyTo } : undefined,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`SendGrid API error: ${response.status} - ${errorText}`);
  }

  // SendGrid returns 202 on success without a response body
  const messageId = response.headers.get("x-message-id") || `sendgrid-${Date.now()}`;
  return { success: true, messageId };
}

/**
 * Resend provider implementation
 * Requires: EMAIL_API_KEY set to Resend API key
 */
async function sendViaResend(payload: EmailPayload): Promise<SendEmailResult> {
  const apiKey = process.env.EMAIL_API_KEY;
  if (!apiKey) {
    throw new Error("Resend API key not configured (EMAIL_API_KEY)");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: process.env.EMAIL_FROM ?? "noreply@votehub.local",
      to: payload.to,
      subject: payload.subject,
      html: payload.htmlContent,
      text: payload.textContent,
      reply_to: payload.replyTo,
      cc: payload.cc,
      bcc: payload.bcc,
    }),
  });

  if (!response.ok) {
    const errorData = await response.json();
    throw new Error(`Resend API error: ${errorData.message || response.statusText}`);
  }

  const data = (await response.json()) as { id: string };
  return { success: true, messageId: data.id };
}

/**
 * SMTP provider implementation
 * Requires: SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD
 * Note: This is a placeholder - actual SMTP sending requires additional dependencies
 */
async function sendViaSMTP(_payload: EmailPayload): Promise<SendEmailResult> {
  const host = process.env.SMTP_HOST;
  const port = process.env.SMTP_PORT;
  const user = process.env.SMTP_USER;
  const password = process.env.SMTP_PASSWORD;

  if (!host || !port || !user || !password) {
    throw new Error("SMTP configuration incomplete (SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASSWORD required)");
  }

  // Placeholder: In production, use 'nodemailer' or similar SMTP library
  console.warn("SMTP provider selected but not fully implemented. Please configure SendGrid or Resend.");
  
  return {
    success: false,
    error: "SMTP provider not fully implemented in this version",
  };
}
