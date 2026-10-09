import { NextRequest, NextResponse } from 'next/server';
import tls from 'tls';
import net from 'net';
import crypto from 'crypto';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
}

interface RelayPayload {
  to: string | string[];
  subject: string;
  html: string;
  text: string;
  from?: string;
  replyTo?: string;
  smtp?: Partial<SmtpConfig>;
}

function cleanEnvValue(val?: string): string {
  if (!val) return '';
  return val.trim().replace(/^["']|["']$/g, '').trim();
}

function extractEmailAddress(input: string): string {
  const match = input.match(/<([^>]+)>/);
  const raw = match ? match[1] : input;
  return raw.trim();
}

function wrapBase64(b64: string): string {
  return b64.replace(/(.{76})/g, '$1\r\n');
}

function encodeHeaderUtf8(val: string): string {
  const clean = val.replace(/\r?\n/g, ' ').trim();
  if (/^[\x20-\x7E]*$/.test(clean)) {
    return clean;
  }
  return `=?UTF-8?B?${Buffer.from(clean, 'utf8').toString('base64')}?=`;
}

function formatFromHeader(rawFrom: string, fallbackUser: string): string {
  const cleaned = rawFrom.replace(/\\"/g, '"').replace(/\\/g, '').trim().replace(/^["']|["']$/g, '');
  const match = cleaned.match(/^([^<]+)<([^>]+)>$/);
  if (match) {
    const displayName = match[1].trim().replace(/^["']|["']$/g, '');
    const addr = match[2].trim();
    return `"${displayName}" <${addr}>`;
  }
  if (cleaned.includes('@')) {
    return `"PromptForm AI" <${cleaned}>`;
  }
  return `"PromptForm AI" <${fallbackUser}>`;
}

function sendSmtpMail(params: {
  host: string;
  port: number;
  user: string;
  pass: string;
  fromHeader: string;
  envelopeFrom: string;
  recipients: string[];
  subject: string;
  text: string;
  html: string;
}): Promise<{ messageId: string; response: string; accepted: string[] }> {
  return new Promise((resolve, reject) => {
    const { host, port, user, pass, fromHeader, envelopeFrom, recipients, subject, text, html } = params;
    let settled = false;
    let socket: tls.TLSSocket | net.Socket | null = null;

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true;
        if (socket) socket.destroy();
        reject(new Error(`SMTP connection timed out after 15000ms (${host}:${port})`));
      }
    }, 15000);

    const finishError = (err: Error) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        if (socket) socket.destroy();
        reject(err);
      }
    };

    const finishSuccess = (res: { messageId: string; response: string; accepted: string[] }) => {
      if (!settled) {
        settled = true;
        clearTimeout(timeout);
        if (socket) {
          try {
            socket.write('QUIT\r\n');
            socket.end();
          } catch {}
        }
        resolve(res);
      }
    };

    const domain = envelopeFrom.split('@')[1] || 'promptform.ai';
    const messageId = `<${crypto.randomUUID()}@${domain}>`;
    const boundary = `----=_Part_${crypto.randomBytes(12).toString('hex')}`;
    const textB64 = wrapBase64(Buffer.from(text || '', 'utf8').toString('base64'));
    const htmlB64 = wrapBase64(Buffer.from(html || text || '', 'utf8').toString('base64'));

    const mimeLines = [
      `From: ${fromHeader}`,
      `To: ${recipients.join(', ')}`,
      `Reply-To: ${envelopeFrom}`,
      `Subject: ${encodeHeaderUtf8(subject)}`,
      `Message-ID: ${messageId}`,
      `Date: ${new Date().toUTCString()}`,
      `MIME-Version: 1.0`,
      `Content-Type: multipart/alternative; boundary="${boundary}"`,
      ``,
      `--${boundary}`,
      `Content-Type: text/plain; charset=utf-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      textB64,
      ``,
      `--${boundary}`,
      `Content-Type: text/html; charset=utf-8`,
      `Content-Transfer-Encoding: base64`,
      ``,
      htmlB64,
      ``,
      `--${boundary}--`,
      `.`,
      ``
    ];
    const mimeBody = mimeLines.join('\r\n');

    let step = 0;
    let rcptIndex = 0;
    let buffer = '';

    const processResponses = (activeSocket: tls.TLSSocket | net.Socket) => {
      const lines = buffer.split('\r\n');
      // Keep incomplete last line in buffer
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line) continue;
        // Multi-line SMTP responses have a hyphen at index 3 (e.g. "250-SIZE 35882577")
        // Final line of response has a space at index 3 (e.g. "250 SMTPUTF8")
        if (line.length >= 4 && line[3] === '-') {
          continue;
        }

        const code = parseInt(line.slice(0, 3), 10);
        if (code >= 400) {
          return finishError(new Error(`SMTP Error (${code}): ${line}`));
        }

        if (step === 0 && code === 220) {
          step = 1;
          activeSocket.write(`EHLO ${domain}\r\n`);
        } else if (step === 1 && code === 250) {
          step = 2;
          activeSocket.write(`AUTH LOGIN\r\n`);
        } else if (step === 2 && code === 334) {
          step = 3;
          activeSocket.write(`${Buffer.from(user, 'utf8').toString('base64')}\r\n`);
        } else if (step === 3 && code === 334) {
          step = 4;
          activeSocket.write(`${Buffer.from(pass, 'utf8').toString('base64')}\r\n`);
        } else if (step === 4 && code === 235) {
          step = 5;
          activeSocket.write(`MAIL FROM:<${envelopeFrom}>\r\n`);
        } else if (step === 5 && code === 250) {
          if (rcptIndex < recipients.length) {
            const target = recipients[rcptIndex++];
            activeSocket.write(`RCPT TO:<${target}>\r\n`);
          } else {
            step = 6;
            activeSocket.write(`DATA\r\n`);
          }
        } else if (step === 6 && code === 354) {
          step = 7;
          activeSocket.write(mimeBody);
        } else if (step === 7 && code === 250) {
          finishSuccess({
            messageId,
            response: line,
            accepted: recipients
          });
        }
      }
    };

    try {
      socket = tls.connect({
        host,
        port,
        servername: host,
        rejectUnauthorized: true,
        family: 4
      } as tls.ConnectionOptions);

      socket.on('data', (chunk) => {
        buffer += chunk.toString('utf8');
        if (socket) processResponses(socket);
      });

      socket.on('error', (err) => {
        finishError(err);
      });

      socket.on('close', () => {
        if (!settled) {
          finishError(new Error('SMTP connection closed unexpectedly before completion'));
        }
      });
    } catch (err: any) {
      finishError(err);
    }
  });
}

export async function POST(req: NextRequest) {
  try {
    const relayHeader = req.headers.get('x-promptform-relay');
    if (relayHeader !== 'v1') {
      return NextResponse.json({ success: false, error: 'Unauthorized relay request' }, { status: 401 });
    }

    const body = (await req.json()) as RelayPayload;
    const { to, subject, html, text, from, smtp } = body;

    // Credentials must come from the caller; never fall back to this deployment's env,
    // otherwise anyone could send mail as the owner's account through this public route.
    const smtpHost = cleanEnvValue(smtp?.host || 'smtp.gmail.com');
    const smtpPort = Number(smtp?.port || 465);
    const smtpUser = cleanEnvValue(smtp?.user);
    const smtpPass = cleanEnvValue(smtp?.pass);

    // Restrict to approved SMTP hosts to prevent abuse
    const allowedHosts = ['smtp.gmail.com', cleanEnvValue(process.env.SMTP_HOST)].filter(Boolean);
    if (!allowedHosts.includes(smtpHost)) {
      return NextResponse.json({ success: false, error: `Disallowed SMTP host: ${smtpHost}` }, { status: 403 });
    }

    if (!smtpUser || !smtpPass) {
      return NextResponse.json(
        { success: false, error: 'Missing SMTP_USER or SMTP_PASS credentials' },
        { status: 400 }
      );
    }

    const rawList = Array.isArray(to) ? to : String(to || '').split(',');
    const recipients = rawList
      .map((r) => extractEmailAddress(String(r)))
      .filter((r) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(r));

    if (recipients.length === 0) {
      return NextResponse.json({ success: false, error: 'No valid recipient email addresses provided' }, { status: 400 });
    }

    // Ensure From address aligns with authenticated Gmail user for SPF/DKIM/DMARC alignment
    const rawFrom = from || process.env.SMTP_FROM || smtpUser;
    const envelopeFrom = smtpHost.includes('gmail') ? smtpUser : extractEmailAddress(rawFrom) || smtpUser;
    const fromHeader = formatFromHeader(
      smtpHost.includes('gmail') && !rawFrom.includes(smtpUser)
        ? `"PromptForm AI" <${smtpUser}>`
        : rawFrom,
      smtpUser
    );

    const result = await sendSmtpMail({
      host: smtpHost,
      port: smtpPort === 587 ? 465 : smtpPort,
      user: smtpUser,
      pass: smtpPass,
      fromHeader,
      envelopeFrom,
      recipients,
      subject: subject || 'PromptForm AI Notification',
      text: text || '',
      html: html || text || ''
    });

    return NextResponse.json({
      success: true,
      accepted: result.accepted,
      messageId: result.messageId,
      response: result.response
    });
  } catch (error: any) {
    return NextResponse.json(
      {
        success: false,
        error: error?.message || 'Failed to relay email via SMTP'
      },
      { status: 502 }
    );
  }
}
