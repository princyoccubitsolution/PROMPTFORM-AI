import nodemailer, { Transporter } from 'nodemailer';
import { promises as dns } from 'dns';
import { logger } from '../lib/logger';

// Common misspellings of major mailbox providers. Gmail accepts mail to these, then retries
// silently for days (e.g. gmali.com has no MX), so the sender sees "sent" but nothing arrives.
const DOMAIN_TYPOS: Record<string, string> = {
  'gmali.com': 'gmail.com', 'gmial.com': 'gmail.com', 'gmal.com': 'gmail.com', 'gamil.com': 'gmail.com',
  'gnail.com': 'gmail.com', 'gmail.co': 'gmail.com', 'gmaill.com': 'gmail.com', 'gmail.con': 'gmail.com',
  'gmail.cm': 'gmail.com', 'gmai.com': 'gmail.com', 'yaho.com': 'yahoo.com', 'yahooo.com': 'yahoo.com',
  'hotmal.com': 'hotmail.com', 'hotmial.com': 'hotmail.com', 'outlok.com': 'outlook.com', 'outllok.com': 'outlook.com'
};

const mxCache = new Map<string, { ok: boolean; reason?: string; at: number }>();

/** Returns an error string if the recipient's domain cannot receive mail, otherwise null. */
async function checkRecipientDomain(email: string): Promise<string | null> {
  const domain = email.split('@')[1]?.toLowerCase() || '';
  if (DOMAIN_TYPOS[domain]) {
    return `"${email}" looks misspelled (did you mean @${DOMAIN_TYPOS[domain]}?)`;
  }
  const cached = mxCache.get(domain);
  if (cached && Date.now() - cached.at < 10 * 60 * 1000) {
    return cached.ok ? null : cached.reason || null;
  }
  try {
    const mx = await dns.resolveMx(domain);
    // RFC 7505 null MX ("." exchange) means the domain explicitly accepts no mail
    const usable = mx.filter((r) => r.exchange && r.exchange !== '.');
    const reason = usable.length ? undefined : `The domain "${domain}" does not accept email (no mail server)`;
    mxCache.set(domain, { ok: !reason, reason, at: Date.now() });
    return reason || null;
  } catch (err: any) {
    if (err?.code === 'ENOTFOUND' || err?.code === 'ENODATA') {
      const reason = `The domain "${domain}" has no mail server (MX record), so email to ${email} cannot be delivered`;
      mxCache.set(domain, { ok: false, reason, at: Date.now() });
      return reason;
    }
    // Transient DNS failure: don't block sending
    logger.warn(`MX lookup for ${domain} failed (${err?.code || err?.message}); sending anyway`);
    return null;
  }
}

interface SendOwnerNotificationParams {
  formTitle: string;
  recipientEmails: string[];
  answers: Record<string, any>;
  responseId: string;
  submittedAt?: Date | string;
}

interface SendAutoResponderParams {
  formTitle: string;
  recipientEmail: string;
  subject?: string;
  message?: string;
  answers?: Record<string, any>;
}

interface SendWorkflowEmailParams {
  to: string;
  subject: string;
  body: string;
}

interface SendTeamInvitationParams {
  teamName: string;
  recipientEmail: string;
  inviterName: string;
  role: string;
  inviteUrl: string;
}

export interface DeliveryInfo {
  // 'accepted' = the SMTP provider queued it. Inbox delivery is not confirmed; bounces arrive at SMTP_USER's mailbox.
  status?: 'accepted';
  messageId?: string;
  accepted?: string[];
  response?: string;
}

function cleanEnv(val?: string): string {
  if (!val) return '';
  return val.trim().replace(/^["']|["']$/g, '').trim();
}

function formatCleanFrom(rawFrom: string, smtpUser: string, isGmail: boolean): string {
  const unescaped = rawFrom.replace(/\\"/g, '"').replace(/\\/g, '').trim().replace(/^["']|["']$/g, '');
  if (isGmail && smtpUser && !unescaped.toLowerCase().includes(smtpUser.toLowerCase())) {
    return `"PromptForm AI" <${smtpUser}>`;
  }
  const match = unescaped.match(/^([^<]+)<([^>]+)>$/);
  if (match) {
    const displayName = match[1].trim().replace(/^["']|["']$/g, '');
    const emailAddr = match[2].trim();
    return `"${displayName}" <${emailAddr}>`;
  }
  if (unescaped.includes('@')) {
    return `"PromptForm AI" <${unescaped}>`;
  }
  return `"PromptForm AI" <${smtpUser}>`;
}

class EmailService {
  private transporter: Transporter | null = null;
  private fromEmail: string = 'notifications@promptform.ai';
  private replyToEmail: string = '';
  private configuredKey: string = '';
  private lastError: string | null = null;
  private lastDeliveryInfo: DeliveryInfo | null = null;

  constructor() {
    this.ensureConfigured();
  }

  public getLastError(): string | null {
    return this.lastError;
  }

  public getLastDeliveryInfo(): DeliveryInfo | null {
    return this.lastDeliveryInfo;
  }

  private getSmtpCredentials() {
    const smtpHost = cleanEnv(process.env.SMTP_HOST);
    const smtpPort = parseInt(cleanEnv(process.env.SMTP_PORT) || '465', 10);
    const smtpUser = cleanEnv(process.env.SMTP_USER);
    const smtpPass = cleanEnv(process.env.SMTP_PASS);
    const rawFrom = cleanEnv(process.env.SMTP_FROM) || smtpUser;
    const isPlaceholder =
      !smtpHost ||
      !smtpUser ||
      !smtpPass ||
      smtpUser.includes('your-email') ||
      smtpUser.includes('example.com');

    return {
      smtpHost,
      smtpPort: isNaN(smtpPort) ? 465 : smtpPort,
      smtpUser,
      smtpPass,
      rawFrom,
      isPlaceholder
    };
  }

  private ensureConfigured(): boolean {
    const { smtpHost, smtpPort, smtpUser, smtpPass, rawFrom, isPlaceholder } = this.getSmtpCredentials();
    if (isPlaceholder) {
      this.transporter = null;
      return false;
    }

    const key = `${smtpHost}:${smtpPort}:${smtpUser}:${rawFrom}`;
    if (this.transporter && this.configuredKey === key) {
      return true;
    }

    try {
      const isGmail = smtpHost.toLowerCase().includes('gmail');
      const effectivePort = isGmail && smtpPort !== 465 && smtpPort !== 587 ? 465 : smtpPort;
      const isSecure = effectivePort === 465;

      this.transporter = nodemailer.createTransport({
        host: smtpHost,
        port: effectivePort,
        secure: isSecure,
        auth: {
          user: smtpUser,
          pass: smtpPass
        },
        // Force IPv4 to prevent ENETUNREACH on cloud containers without IPv6 routing
        family: 4,
        connectionTimeout: 8000,
        greetingTimeout: 8000,
        socketTimeout: 12000,
        tls: {
          servername: smtpHost,
          rejectUnauthorized: true
        }
      } as any);

      this.fromEmail = formatCleanFrom(rawFrom, smtpUser, isGmail);
      this.replyToEmail = smtpUser;
      this.configuredKey = key;
      logger.info(`EmailService configured with SMTP: ${smtpHost}:${effectivePort} (${this.fromEmail})`);
      return true;
    } catch (err: any) {
      this.lastError = `Failed to configure SMTP transporter: ${err.message}`;
      logger.error(this.lastError);
      this.transporter = null;
      return false;
    }
  }

  private async dispatchViaHttpsRelay(
    recipients: string,
    subject: string,
    html: string,
    text: string
  ): Promise<boolean> {
    const { smtpHost, smtpPort, smtpUser, smtpPass } = this.getSmtpCredentials();
    const relayBaseUrls = Array.from(
      new Set(
        [
          'https://promptform-ai-frontend.vercel.app',
          cleanEnv(process.env.FRONTEND_URL).replace(/\/+$/, ''),
          'https://frontend-tau-nine-n8hxn4thl0.vercel.app'
        ].filter((u) => u && u.startsWith('https://'))
      )
    );

    let lastRelayErr = 'No HTTPS email relay endpoints available';

    for (const baseUrl of relayBaseUrls) {
      const relayUrl = `${baseUrl}/api/email/relay`;
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      try {
        const res = await fetch(relayUrl, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-promptform-relay': 'v1'
          },
          body: JSON.stringify({
            to: recipients,
            subject,
            html,
            text,
            from: this.fromEmail,
            replyTo: this.replyToEmail || smtpUser,
            smtp: {
              host: smtpHost,
              port: smtpPort,
              user: smtpUser,
              pass: smtpPass
            }
          }),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        const data = (await res.json().catch(() => ({}))) as any;
        if (res.ok && data?.success && Array.isArray(data.accepted) && data.accepted.length > 0) {
          this.lastError = null;
          this.lastDeliveryInfo = {
            status: 'accepted',
            messageId: data.messageId,
            accepted: data.accepted,
            response: data.response
          };
          logger.info(
            `Email accepted by SMTP provider via HTTPS relay (${baseUrl}) for ${recipients} | Message-ID: ${data.messageId || 'n/a'} | Response: ${data.response || 'n/a'}`
          );
          return true;
        }

        lastRelayErr = data?.error || `Relay ${baseUrl} returned HTTP ${res.status}`;
      } catch (err: any) {
        clearTimeout(timeoutId);
        lastRelayErr = err?.message || `Relay request to ${baseUrl} failed`;
      }
    }

    this.lastError = lastRelayErr;
    logger.error(`HTTPS SMTP Relay delivery failed for ${recipients}: ${lastRelayErr}`);
    return false;
  }

  private async dispatchViaResend(recipients: string[], subject: string, html: string, text: string): Promise<boolean> {
    const from = cleanEnv(process.env.EMAIL_FROM) || cleanEnv(process.env.RESEND_FROM);
    if (!from) {
      this.lastError = 'RESEND_API_KEY is set but EMAIL_FROM (e.g. "PromptForm AI <noreply@yourdomain.com>") is missing';
      logger.error(this.lastError);
      return false;
    }
    try {
      const res = await fetch('https://api.resend.com/emails', {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cleanEnv(process.env.RESEND_API_KEY)}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from,
          to: recipients,
          subject,
          html,
          text,
          reply_to: cleanEnv(process.env.EMAIL_REPLY_TO) || cleanEnv(process.env.SMTP_USER) || undefined
        })
      });
      const data = (await res.json().catch(() => ({}))) as any;
      if (!res.ok || !data?.id) {
        this.lastError = `Resend rejected the email (HTTP ${res.status}): ${data?.message || data?.name || 'unknown error'}`;
        logger.error(`${this.lastError} | to: ${recipients.join(', ')}`);
        return false;
      }
      this.lastError = null;
      this.lastDeliveryInfo = { status: 'accepted', messageId: data.id, accepted: recipients, response: 'resend:queued' };
      logger.info(`Email accepted by Resend for ${recipients.join(', ')} | Resend ID: ${data.id}`);
      return true;
    } catch (err: any) {
      this.lastError = `Resend request failed: ${err?.message || 'network error'}`;
      logger.error(this.lastError);
      return false;
    }
  }

  /** Looks up the provider's latest delivery event (delivered, bounced, complained, ...) for a Resend message ID. */
  public async getProviderDeliveryStatus(messageId: string): Promise<{ provider: string; lastEvent: string | null; error?: string }> {
    const key = cleanEnv(process.env.RESEND_API_KEY);
    if (!key || !/^[0-9a-f-]{36}$/i.test(messageId)) {
      return { provider: 'gmail-smtp', lastEvent: null, error: 'Gmail SMTP does not expose delivery events; check the sender mailbox for bounces' };
    }
    try {
      const res = await fetch(`https://api.resend.com/emails/${messageId}`, { headers: { Authorization: `Bearer ${key}` } });
      const data = (await res.json().catch(() => ({}))) as any;
      if (!res.ok) return { provider: 'resend', lastEvent: null, error: data?.message || `HTTP ${res.status}` };
      logger.info(`Resend delivery status for ${messageId}: ${data.last_event}`);
      return { provider: 'resend', lastEvent: data.last_event || null };
    } catch (err: any) {
      return { provider: 'resend', lastEvent: null, error: err?.message || 'network error' };
    }
  }

  private async dispatchEmail(
    to: string | string[],
    subject: string,
    html: string,
    text: string
  ): Promise<boolean> {
    this.lastError = null;
    this.lastDeliveryInfo = null;

    const recipientArray = (Array.isArray(to) ? to : String(to || '').split(','))
      .map((e) => e.trim())
      .filter((e) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e));

    const recipients = Array.from(new Set(recipientArray)).join(', ');
    if (!recipients) {
      this.lastError = 'No valid recipient email address provided';
      return false;
    }

    const domainErrors = (await Promise.all(recipientArray.map(checkRecipientDomain))).filter(Boolean);
    if (domainErrors.length > 0) {
      this.lastError = domainErrors.join('; ');
      logger.warn(`Email not sent (undeliverable recipient): ${this.lastError}`);
      return false;
    }

    // Transactional provider (Resend) takes priority when configured: HTTPS-only, verified-domain
    // sender, and per-message delivery status. Falls back to Gmail SMTP if it is not set or fails.
    if (cleanEnv(process.env.RESEND_API_KEY)) {
      const sentViaResend = await this.dispatchViaResend(Array.from(new Set(recipientArray)), subject, html, text);
      if (sentViaResend) return true;
    }
    const resendError = this.lastError;

    const isConfigured = this.ensureConfigured();
    if (!isConfigured || !this.transporter) {
      this.lastError = [resendError, 'SMTP credentials (SMTP_HOST, SMTP_USER, SMTP_PASS) are not configured on the server'].filter(Boolean).join('; ');
      this.logDevEmail(recipients, subject, text);
      return false;
    }

    const isRenderCloud = Boolean(
      process.env.RENDER || process.env.RENDER_SERVICE_ID || process.env.RENDER_EXTERNAL_URL
    );

    // On Render Free Tier, outbound TCP ports 25/465/587 are blocked by infrastructure firewall.
    // Use HTTPS Relay (port 443 -> Vercel Serverless -> Gmail SMTPS 465) first on Render for instant delivery.
    if (isRenderCloud) {
      const relayed = await this.dispatchViaHttpsRelay(recipients, subject, html, text);
      if (relayed) return true;
    }

    try {
      const info = await this.transporter.sendMail({
        from: this.fromEmail,
        replyTo: this.replyToEmail || undefined,
        to: recipients,
        subject,
        text,
        html
      });

      const accepted = Array.isArray(info.accepted) ? info.accepted.map(String) : [];
      if (accepted.length === 0) {
        const rejectedInfo = Array.isArray(info.rejected) ? info.rejected.join(', ') : 'unknown';
        throw new Error(`SMTP server rejected recipient(s): ${rejectedInfo}`);
      }

      this.lastError = null;
      this.lastDeliveryInfo = {
        status: 'accepted',
        messageId: info.messageId,
        accepted,
        response: info.response
      };
      logger.info(
        `Email accepted by SMTP provider via direct SMTP for ${recipients} | Message-ID: ${info.messageId} | Response: ${info.response}`
      );
      return true;
    } catch (error: any) {
      const directErrMsg = error?.message || 'SMTP connection error';
      logger.warn(`Direct SMTP send to ${recipients} failed (${directErrMsg}).`);

      if (!isRenderCloud) {
        logger.info(`Attempting HTTPS SMTP Relay for ${recipients}...`);
        const relayed = await this.dispatchViaHttpsRelay(recipients, subject, html, text);
        if (relayed) return true;
      }

      this.lastError = directErrMsg;
      logger.error(`Email delivery failed to ${recipients}: ${this.lastError}`);
      this.logDevEmail(recipients, subject, text);
      return false;
    }
  }

  private logDevEmail(recipients: string, subject: string, text: string) {
    logger.info(`[DEV EMAIL LOG] To: ${recipients} | Subject: "${subject}"`);
    logger.debug(`[DEV EMAIL CONTENT]:\n${text}`);
  }

  public async sendOwnerNotification(params: SendOwnerNotificationParams): Promise<boolean> {
    const { formTitle, recipientEmails, answers, responseId, submittedAt } = params;
    if (!recipientEmails || recipientEmails.length === 0) {
      this.lastError = 'No recipient emails specified';
      return false;
    }

    const subject = `New Response Received: "${formTitle}"`;
    const formattedDate = new Date(submittedAt || Date.now()).toLocaleString();

    let answersHtml = '<table style="width:100%; border-collapse:collapse; margin-top:16px;">';
    let answersText = '';

    Object.entries(answers || {}).forEach(([key, val]) => {
      const displayVal = typeof val === 'object' ? JSON.stringify(val) : String(val);
      answersHtml += `
        <tr>
          <td style="padding:10px 12px; border:1px solid #e4e4e7; font-weight:600; background:#f4f4f5; width:35%; font-size:13px; color:#27272a;">${key}</td>
          <td style="padding:10px 12px; border:1px solid #e4e4e7; font-size:13px; color:#18181b;">${displayVal}</td>
        </tr>`;
      answersText += `${key}: ${displayVal}\n`;
    });
    answersHtml += '</table>';

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 12px; padding: 24px; color: #18181b;">
        <div style="margin-bottom: 20px;">
          <h2 style="margin: 0; color: #4f46e5; font-size: 20px; font-weight: 700;">PromptForm AI Notification</h2>
        </div>
        <p style="font-size: 15px; margin-top: 0; color: #3f3f46;">A new response was submitted for your form <strong>"${formTitle}"</strong>.</p>
        <div style="background: #f8fafc; border-left: 4px solid #6366f1; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
          <span style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Submission Details</span>
          <p style="margin: 4px 0 0 0; font-size: 13px; font-weight: 600; color: #0f172a;">Response ID: ${responseId}</p>
          <p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">Submitted At: ${formattedDate}</p>
        </div>
        <h3 style="font-size: 14px; margin-top: 20px; color: #27272a; text-transform: uppercase; letter-spacing: 0.5px;">Submitted Data</h3>
        ${answersHtml}
        <div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #f4f4f5; text-align: center; font-size: 12px; color: #a1a1aa;">
          PromptForm AI Notification Service
        </div>
      </div>
    `;

    const text = `New response received for "${formTitle}" (Response ID: ${responseId})\nTime: ${formattedDate}\n\nSubmitted Data:\n${answersText}`;
    return this.dispatchEmail(recipientEmails, subject, html, text);
  }

  public async sendAutoResponder(params: SendAutoResponderParams): Promise<boolean> {
    const { formTitle, recipientEmail, subject, message, answers } = params;
    if (!recipientEmail || recipientEmail.trim() === '') {
      this.lastError = 'No recipient email provided for auto-responder';
      return false;
    }

    const emailSubject = subject || `Confirmation: Thank you for responding to "${formTitle}"`;
    const defaultMsg = `Thank you for taking the time to complete "${formTitle}". We have successfully received your submission!`;
    const customMessage = message || defaultMsg;

    let answersSummary = '';
    if (answers && Object.keys(answers).length > 0) {
      answersSummary = '<div style="margin-top:20px; background:#fafafa; border:1px solid #f4f4f5; border-radius:8px; padding:16px;">';
      answersSummary += '<p style="font-size:12px; font-weight:700; color:#71717a; text-transform:uppercase; margin:0 0 10px 0;">Summary of your submission:</p>';
      Object.entries(answers).forEach(([k, v]) => {
        answersSummary += `<p style="margin:4px 0; font-size:13px; color:#27272a;"><strong>${k}:</strong> ${typeof v === 'object' ? JSON.stringify(v) : String(v)}</p>`;
      });
      answersSummary += '</div>';
    }

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 12px; padding: 24px; color: #18181b;">
        <h2 style="margin-top: 0; color: #10b981; font-size: 20px; font-weight: 700;">Submission Confirmed</h2>
        <p style="font-size: 15px; color: #3f3f46; line-height: 1.6;">${customMessage}</p>
        ${answersSummary}
        <div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #f4f4f5; text-align: center; font-size: 12px; color: #a1a1aa;">
          Thank you for choosing PromptForm AI
        </div>
      </div>
    `;

    const text = `${customMessage}\n\nForm: ${formTitle}`;
    return this.dispatchEmail(recipientEmail, emailSubject, html, text);
  }

  public async sendWorkflowEmail(params: SendWorkflowEmailParams): Promise<boolean> {
    const { to, subject, body } = params;
    if (!to || !to.trim()) {
      this.lastError = 'No recipient email provided for workflow';
      return false;
    }

    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; border: 1px solid #e4e4e7; border-radius: 8px;">
        <h3 style="color: #4f46e5; margin-top: 0;">${subject}</h3>
        <div style="font-size: 14px; color: #27272a; line-height: 1.6;">${body.replace(/\n/g, '<br/>')}</div>
        <div style="margin-top: 20px; padding-top: 12px; border-top: 1px solid #f4f4f5; font-size: 11px; color: #9ca3af;">
          Automated Workflow Action &bull; PromptForm AI
        </div>
      </div>
    `;

    return this.dispatchEmail(to, subject, html, body);
  }

  public async sendTeamInvitation(params: SendTeamInvitationParams): Promise<boolean> {
    const { teamName, recipientEmail, inviterName, role, inviteUrl } = params;
    if (!recipientEmail || recipientEmail.trim() === '') {
      this.lastError = 'No recipient email provided for team invitation';
      return false;
    }

    const subject = `Team Invitation: ${inviterName} invited you to join "${teamName}" on PromptForm AI`;
    const roleCapitalized = role.charAt(0).toUpperCase() + role.slice(1);

    const html = `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff; border: 1px solid #e4e4e7; border-radius: 16px; padding: 32px; color: #18181b;">
        <div style="margin-bottom: 24px;">
          <h2 style="margin: 0; color: #4f46e5; font-size: 22px; font-weight: 800; letter-spacing: -0.5px;">PromptForm AI</h2>
        </div>
        <h3 style="font-size: 18px; color: #0f172a; margin-top: 0; font-weight: 700;">You've been invited to join a team workspace!</h3>
        <p style="font-size: 15px; color: #3f3f46; line-height: 1.6;">
          <strong>${inviterName}</strong> has invited you to join and collaborate on the team workspace <strong>"${teamName}"</strong> as a <strong>${roleCapitalized}</strong>.
        </p>
        <div style="margin: 28px 0; text-align: center;">
          <a href="${inviteUrl}" target="_blank" style="background-color: #4f46e5; background: linear-gradient(135deg, #4f46e5 0%, #7c3aed 100%); color: #ffffff; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 12px; display: inline-block; font-size: 14px;">
            Accept Invitation &amp; Access Workspace
          </a>
        </div>
        <p style="font-size: 13px; color: #71717a; line-height: 1.5;">
          If the button above doesn't work, copy and paste this link into your browser:<br/>
          <a href="${inviteUrl}" style="color: #6366f1; word-break: break-all;">${inviteUrl}</a>
        </p>
        <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid #f4f4f5; text-align: center; font-size: 12px; color: #a1a1aa;">
          PromptForm AI Team Collaboration
        </div>
      </div>
    `;

    const text = `${inviterName} has invited you to join team "${teamName}" as ${roleCapitalized}.\n\nAccess Workspace: ${inviteUrl}`;
    return this.dispatchEmail(recipientEmail, subject, html, text);
  }
}

export const emailService = new EmailService();
