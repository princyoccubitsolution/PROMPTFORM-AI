import nodemailer, { Transporter } from 'nodemailer';
import { logger } from '../lib/logger';

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

class EmailService {
  private transporter: Transporter | null = null;
  private fromEmail: string = 'notifications@promptform.ai';
  private isInitializing: Promise<void> | null = null;

  constructor() {
    this.isInitializing = this.initTransporter();
  }

  private async initTransporter() {
    const smtpHost = process.env.SMTP_HOST;
    const smtpPort = parseInt(process.env.SMTP_PORT || '587', 10);
    const smtpUser = process.env.SMTP_USER;
    const smtpPass = process.env.SMTP_PASS;

    const isPlaceholder = !smtpUser || smtpUser.includes('your-email') || smtpUser.includes('example.com');

    if (smtpHost && smtpUser && smtpPass && !isPlaceholder) {
      try {
        this.transporter = nodemailer.createTransport({
          host: smtpHost,
          port: smtpPort,
          secure: smtpPort === 465,
          auth: {
            user: smtpUser,
            pass: smtpPass
          }
        });
        this.fromEmail = process.env.SMTP_FROM || smtpUser;
        logger.info(`EmailService initialized with Custom SMTP: ${smtpHost} (${this.fromEmail})`);
        return;
      } catch (err: any) {
        logger.warn(`Failed to initialize custom SMTP: ${err.message}. Falling back to Ethereal Transporter.`);
      }
    }

    // Auto-create real test mail account on Ethereal if no custom SMTP configured
    try {
      const testAccount = await nodemailer.createTestAccount();
      this.transporter = nodemailer.createTransport({
        host: 'smtp.ethereal.email',
        port: 587,
        secure: false,
        auth: {
          user: testAccount.user,
          pass: testAccount.pass
        }
      });
      this.fromEmail = `"PromptForm AI" <${testAccount.user}>`;
      logger.info(`EmailService initialized with Auto-Provisioned Real Email Transporter (User: ${testAccount.user})`);
    } catch (etherealErr: any) {
      logger.warn(`Could not provision test email account: ${etherealErr.message}. Email service running in console fallback mode.`);
      this.transporter = null;
    }
  }

  private async dispatchEmail(to: string | string[], subject: string, html: string, text: string): Promise<boolean> {
    if (this.isInitializing) {
      await this.isInitializing;
    }

    const recipients = Array.isArray(to) ? to.join(', ') : to;
    if (!recipients || recipients.trim() === '') return false;

    if (this.transporter) {
      try {
        const info = await this.transporter.sendMail({
          from: this.fromEmail,
          to: recipients,
          subject,
          text,
          html
        });
        logger.info(`Email successfully dispatched to ${recipients} | Subject: "${subject}"`);
        
        const previewUrl = nodemailer.getTestMessageUrl(info);
        if (previewUrl) {
          logger.info(`📬 View Sent Email In Live Web Inbox: ${previewUrl}`);
        }
        return true;
      } catch (error: any) {
        logger.error(`Failed to send email to ${recipients}: ${error.message}`, error);
        this.logDevEmail(recipients, subject, text);
        return false;
      }
    } else {
      this.logDevEmail(recipients, subject, text);
      return true;
    }
  }

  private logDevEmail(recipients: string, subject: string, text: string) {
    logger.info(`[DEV EMAIL LOG] To: ${recipients} | Subject: "${subject}"`);
    logger.debug(`[DEV EMAIL CONTENT]:\n${text}`);
  }

  public async sendOwnerNotification(params: SendOwnerNotificationParams): Promise<boolean> {
    const { formTitle, recipientEmails, answers, responseId, submittedAt } = params;
    if (!recipientEmails || recipientEmails.length === 0) return false;

    const subject = `📥 New Response Received: "${formTitle}"`;
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
        <div style="display: flex; items-center: center; margin-bottom: 20px;">
          <h2 style="margin: 0; color: #4f46e5; font-size: 20px; font-weight: 700;">PromptForm AI Notification</h2>
        </div>
        <p style="font-size: 15px; margin-top: 0; color: #3f3f46;">A new response was submitted for your form <strong>"${formTitle}"</strong>.</p>
        <div style="background: #f8fafc; border-left: 4px solid #6366f1; padding: 12px 16px; margin: 16px 0; border-radius: 4px;">
          <span style="font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase;">Submission Details</span>
          <p style="margin: 4px 0 0 0; font-size: 13px; font-weight: 600; color: #0f172a;">Response ID: ${responseId}</p>
          <p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">Submitted At: ${formattedDate}</p>
        </div>
        <h3 style="font-size: 14px; margin-top: 20px; color: #27272a; text-transform: uppercase; tracking-wide: 0.5px;">Submitted Data</h3>
        ${answersHtml}
        <div style="margin-top: 28px; padding-top: 16px; border-top: 1px solid #f4f4f5; text-align: center; font-size: 12px; color: #a1a1aa;">
          PromptForm AI Automated Notification System &bull; Powered by Deep AI Intelligence
        </div>
      </div>
    `;

    const text = `New response received for "${formTitle}" (Response ID: ${responseId})\nTime: ${formattedDate}\n\nSubmitted Data:\n${answersText}`;
    return this.dispatchEmail(recipientEmails, subject, html, text);
  }

  public async sendAutoResponder(params: SendAutoResponderParams): Promise<boolean> {
    const { formTitle, recipientEmail, subject, message, answers } = params;
    if (!recipientEmail || recipientEmail.trim() === '') return false;

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
    if (!to || !to.trim()) return false;

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
}

export const emailService = new EmailService();
