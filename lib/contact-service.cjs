'use strict';

/**
 * Contact Form Validation, Delivery & Auto-Reply Service — JoshBoyer.ca
 * - Enforces required name, strict valid email address, and required message.
 * - Sends all contact form emails to hello@joshboyer.ca.
 * - Sends an automated thank-you reply to the user from noreply@joshboyer.ca.
 * - Fails closed when no email transport is configured and never leaks raw provider exceptions.
 */

const CONTACT_RECIPIENT_EMAIL = 'hello@joshboyer.ca';
const CONTACT_AUTOREPLY_FROM_EMAIL = 'noreply@joshboyer.ca';
const CONTACT_OWNER_FROM_DISPLAY = `JoshBoyer.ca Contact <${CONTACT_AUTOREPLY_FROM_EMAIL}>`;
const CONTACT_AUTOREPLY_FROM_DISPLAY = `Josh Boyer <${CONTACT_AUTOREPLY_FROM_EMAIL}>`;

const CONTACT_LIMITS = Object.freeze({
  maxRequestBodyBytes: 24 * 1024,
  maxNameChars: 120,
  maxEmailChars: 254,
  maxLocalPartChars: 64,
  maxDomainLabelChars: 63,
  maxMessageChars: 5000,
  rateLimitWindowMs: 15 * 60 * 1000, // 900,000 ms (15 minutes)
  rateLimitMaxRequests: 5,
  maxRateLimitClients: 10000,
  deliveryTimeoutMs: 15000
});

const CLOSED_ERROR_MESSAGES = Object.freeze({
  INVALID_PAYLOAD: 'Invalid contact form request payload.',
  BOT_DETECTED: 'Spam check failed.',
  NAME_REQUIRED: 'Please enter your name.',
  NAME_TOO_LONG: 'Name must be 120 characters or fewer.',
  INVALID_NAME_CONTROL_CHARS: 'Please enter a valid name without line breaks or control characters.',
  EMAIL_REQUIRED: 'Please enter your email address.',
  EMAIL_INVALID: 'Please enter a valid email address (for example, name@example.com).',
  INVALID_EMAIL_CONTROL_CHARS: 'Please enter a valid email address.',
  MESSAGE_REQUIRED: 'Please enter a message.',
  MESSAGE_TOO_LONG: 'Message must be 5,000 characters or fewer.',
  INVALID_MESSAGE_CONTROL_CHARS: 'Message contains invalid control characters.',
  RATE_LIMITED: 'Too many messages sent recently. Please wait a few minutes before using the contact form again.',
  EMAIL_PROVIDER_UNCONFIGURED: 'The contact form is temporarily unavailable. Your message has not been sent.',
  CONTACT_DELIVERY_FAILED: 'Unable to dispatch your message right now. Your text is preserved; please try the form again later.',
  CONTACT_AUTOREPLY_FAILED: 'Your message was accepted, but the automated confirmation could not be dispatched. Please do not resend the same message.'
});

// Header fields must reject every ASCII control, including tabs and DEL.
// eslint-disable-next-line no-control-regex -- Intentional rejection of hostile header characters.
const SINGLE_LINE_CONTROL_RE = /[\u0000-\u001f\u007f\u2028\u2029]/;
const NUL_OR_LINE_SEP_RE = /[\0\u2028\u2029]/;
const LOCAL_PART_RE = /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+$/;
const DOMAIN_LABEL_RE = /^[A-Za-z0-9](?:[A-Za-z0-9-]{0,61}[A-Za-z0-9])?$/;
const TLD_LABEL_RE = /^[A-Za-z]{2,63}$/;

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function isValidEmailAddress(rawEmail) {
  if (typeof rawEmail !== 'string') return false;
  if (SINGLE_LINE_CONTROL_RE.test(rawEmail)) return false;
  const email = rawEmail.trim();
  if (email.length < 3 || email.length > CONTACT_LIMITS.maxEmailChars) return false;
  if (/\s/.test(email)) return false;

  const atIndex = email.indexOf('@');
  if (atIndex <= 0 || atIndex !== email.lastIndexOf('@') || atIndex === email.length - 1) {
    return false;
  }

  const local = email.slice(0, atIndex);
  const domain = email.slice(atIndex + 1);

  if (local.length < 1 || local.length > CONTACT_LIMITS.maxLocalPartChars) return false;
  if (local.startsWith('.') || local.endsWith('.') || local.includes('..')) return false;
  if (!LOCAL_PART_RE.test(local)) return false;

  if (domain.length < 3 || domain.length > 253) return false;
  if (domain.startsWith('.') || domain.endsWith('.') || domain.includes('..')) return false;

  const labels = domain.split('.');
  if (labels.length < 2) return false;
  for (let i = 0; i < labels.length; i++) {
    const label = labels[i];
    if (!label || label.length > CONTACT_LIMITS.maxDomainLabelChars) return false;
    if (!DOMAIN_LABEL_RE.test(label)) return false;
  }

  const tld = labels[labels.length - 1];
  if (!TLD_LABEL_RE.test(tld)) return false;

  return true;
}

function hasSuspiciousOwnKeys(obj) {
  const ownNames = Object.getOwnPropertyNames(obj);
  for (const key of ownNames) {
    if (key === '__proto__' || key === 'constructor' || key === 'prototype') {
      return true;
    }
  }
  return false;
}

function safeReadOwnString(obj, key) {
  if (!Object.prototype.hasOwnProperty.call(obj, key)) return '';
  const desc = Object.getOwnPropertyDescriptor(obj, key);
  if (!desc || typeof desc.get === 'function' || typeof desc.set === 'function') {
    throw new Error('Accessor properties are not allowed');
  }
  if (desc.value === undefined || desc.value === null) return '';
  if (typeof desc.value !== 'string') {
    throw new Error('Field must be a string');
  }
  return desc.value;
}

function validateContactPayload(payload) {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return {
      ok: false,
      code: 'INVALID_PAYLOAD',
      field: null,
      error: CLOSED_ERROR_MESSAGES.INVALID_PAYLOAD
    };
  }

  try {
    if (hasSuspiciousOwnKeys(payload)) {
      return {
        ok: false,
        code: 'INVALID_PAYLOAD',
        field: null,
        error: CLOSED_ERROR_MESSAGES.INVALID_PAYLOAD
      };
    }

    const rawWebsite = safeReadOwnString(payload, 'website');
    if (rawWebsite.trim().length > 0) {
      return {
        ok: false,
        code: 'BOT_DETECTED',
        field: 'website',
        error: CLOSED_ERROR_MESSAGES.BOT_DETECTED
      };
    }

    const rawName = safeReadOwnString(payload, 'name');
    if (SINGLE_LINE_CONTROL_RE.test(rawName)) {
      return {
        ok: false,
        code: 'INVALID_NAME_CONTROL_CHARS',
        field: 'name',
        error: CLOSED_ERROR_MESSAGES.INVALID_NAME_CONTROL_CHARS
      };
    }
    const name = rawName.trim();
    if (!name) {
      return {
        ok: false,
        code: 'NAME_REQUIRED',
        field: 'name',
        error: CLOSED_ERROR_MESSAGES.NAME_REQUIRED
      };
    }
    if (name.length > CONTACT_LIMITS.maxNameChars) {
      return {
        ok: false,
        code: 'NAME_TOO_LONG',
        field: 'name',
        error: CLOSED_ERROR_MESSAGES.NAME_TOO_LONG
      };
    }

    const rawEmail = safeReadOwnString(payload, 'email') || safeReadOwnString(payload, 'contact');
    if (SINGLE_LINE_CONTROL_RE.test(rawEmail)) {
      return {
        ok: false,
        code: 'INVALID_EMAIL_CONTROL_CHARS',
        field: 'email',
        error: CLOSED_ERROR_MESSAGES.INVALID_EMAIL_CONTROL_CHARS
      };
    }
    const email = rawEmail.trim().toLowerCase();
    if (!email) {
      return {
        ok: false,
        code: 'EMAIL_REQUIRED',
        field: 'email',
        error: CLOSED_ERROR_MESSAGES.EMAIL_REQUIRED
      };
    }
    if (!isValidEmailAddress(email)) {
      return {
        ok: false,
        code: 'EMAIL_INVALID',
        field: 'email',
        error: CLOSED_ERROR_MESSAGES.EMAIL_INVALID
      };
    }

    const rawMessage = safeReadOwnString(payload, 'message');
    if (NUL_OR_LINE_SEP_RE.test(rawMessage)) {
      return {
        ok: false,
        code: 'INVALID_MESSAGE_CONTROL_CHARS',
        field: 'message',
        error: CLOSED_ERROR_MESSAGES.INVALID_MESSAGE_CONTROL_CHARS
      };
    }
    const message = rawMessage.replace(/\r\n?/g, '\n').trim();
    if (!message) {
      return {
        ok: false,
        code: 'MESSAGE_REQUIRED',
        field: 'message',
        error: CLOSED_ERROR_MESSAGES.MESSAGE_REQUIRED
      };
    }
    if (message.length > CONTACT_LIMITS.maxMessageChars) {
      return {
        ok: false,
        code: 'MESSAGE_TOO_LONG',
        field: 'message',
        error: CLOSED_ERROR_MESSAGES.MESSAGE_TOO_LONG
      };
    }

    return {
      ok: true,
      code: 'VALID',
      data: { name, email, message }
    };
  } catch {
    return {
      ok: false,
      code: 'INVALID_PAYLOAD',
      field: null,
      error: CLOSED_ERROR_MESSAGES.INVALID_PAYLOAD
    };
  }
}

function brandedContactEmail(content) {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"></head>
<body style="margin:0;padding:0;background:#e8eef5;color:#152337;font-family:Arial,Helvetica,sans-serif;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0" style="width:100%;background:#e8eef5;"><tr><td align="center" style="padding:20px 10px;">
<table role="presentation" width="600" cellspacing="0" cellpadding="0" border="0" style="width:100%;max-width:600px;background:#ffffff;border:1px solid #cbd5e1;border-radius:12px;">
<tr><td style="padding:24px;background:#091729;border-radius:12px 12px 0 0;">
<table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr>
<td width="78" valign="top"><img src="https://joshboyer.ca/assets/jb-mark.png" width="64" height="64" alt="JB — Josh Boyer" style="display:block;width:64px;height:64px;border:0;"></td>
<td valign="top" style="font-family:Arial,Helvetica,sans-serif;"><p style="margin:0 0 10px;color:#ffffff;font-size:13px;font-weight:bold;letter-spacing:2px;">JOSH BOYER</p>
<p style="margin:0;font-size:16px;line-height:24px;font-weight:bold;"><span style="color:#d7dfe9;">Grounded in the Metal,</span><br><span style="color:#fbbf24;">Shaped by the Business,</span><br><span style="color:#60a5fa;">Building in the Cloud.</span></p></td>
</tr></table></td></tr>
<tr><td><table role="presentation" width="100%" cellspacing="0" cellpadding="0" border="0"><tr><td height="4" width="33%" style="background:#aeb8c7;font-size:0;line-height:0;">&nbsp;</td><td height="4" width="34%" style="background:#fbbf24;font-size:0;line-height:0;">&nbsp;</td><td height="4" width="33%" style="background:#38bdf8;font-size:0;line-height:0;">&nbsp;</td></tr></table></td></tr>
<tr><td><img src="https://joshboyer.ca/assets/footer-panorama-bg.jpg" width="600" alt="From metal infrastructure to clouds at sunset" style="display:block;width:100%;max-width:600px;height:auto;border:0;"></td></tr>
<tr><td style="padding:26px 24px;font-size:16px;line-height:25px;word-break:break-word;overflow-wrap:anywhere;">${content}</td></tr>
<tr><td align="center" style="padding:16px 24px 22px;border-top:1px solid #dbe4ef;font-size:13px;line-height:20px;"><a href="https://joshboyer.ca/" style="color:#075985;text-decoration:underline;">JoshBoyer.ca</a></td></tr>
</table></td></tr></table></body></html>`;
}

function buildContactEmails({ name, email, message, submittedAtIso }) {
  const safeIso = typeof submittedAtIso === 'string' && submittedAtIso ? submittedAtIso : 'Unknown';
  const escapedName = escapeHtml(name);
  const escapedEmail = escapeHtml(email);
  const escapedIso = escapeHtml(safeIso);
  const escapedMessageHtml = escapeHtml(message).replace(/\n/g, '<br>');

  const ownerEmail = {
    kind: 'owner_notification',
    from: CONTACT_OWNER_FROM_DISPLAY,
    fromAddress: CONTACT_AUTOREPLY_FROM_EMAIL,
    to: CONTACT_RECIPIENT_EMAIL,
    replyTo: email,
    subject: `New Contact Message from ${name} — JoshBoyer.ca`,
    text: [
      'New contact form message received on JoshBoyer.ca:',
      '',
      `Name: ${name}`,
      `Email: ${email}`,
      `Submitted: ${safeIso}`,
      '',
      'Message:',
      message
    ].join('\n'),
    html: [
      '<div style="font-family:system-ui,-apple-system,sans-serif;color:#0f172a;line-height:1.5;">',
      '<h2 style="margin:0 0 12px;">New Contact Message — JoshBoyer.ca</h2>',
      `<p style="margin:4px 0;"><strong>Name:</strong> ${escapedName}</p>`,
      `<p style="margin:4px 0;"><strong>Email:</strong> <a href="mailto:${escapedEmail}">${escapedEmail}</a></p>`,
      `<p style="margin:4px 0 16px;"><strong>Submitted:</strong> ${escapedIso}</p>`,
      '<div style="padding:14px;border-radius:8px;background:#f8fafc;border:1px solid #cbd5e1;">',
      escapedMessageHtml,
      '</div>',
      '</div>'
    ].join('')
  };

  const autoReplyEmail = {
    kind: 'sender_autoreply',
    from: CONTACT_AUTOREPLY_FROM_DISPLAY,
    fromAddress: CONTACT_AUTOREPLY_FROM_EMAIL,
    to: email,
    replyTo: CONTACT_AUTOREPLY_FROM_EMAIL,
    subject: 'Thank you for your message — Josh Boyer',
    text: [
      'Hello,',
      '',
      'Thank you for your message! I have received your note and will respond as soon as I can.',
      '',
      'Best regards,',
      'Josh Boyer',
      'https://joshboyer.ca',
      '',
      '---',
      `This is an automated confirmation from ${CONTACT_AUTOREPLY_FROM_EMAIL}. This no-reply address is not monitored. To follow up, use the contact form at https://joshboyer.ca/#home-connect.`
    ].join('\n'),
    html: [
      '<div style="font-family:system-ui,-apple-system,sans-serif;color:#0f172a;line-height:1.5;">',
      '<p>Hello,</p>',
      '<p>Thank you for your message! I have received your note and will respond as soon as I can.</p>',
      '<p style="margin-top:20px;">Best regards,<br><strong>Josh Boyer</strong><br><a href="https://joshboyer.ca">joshboyer.ca</a></p>',
      '<hr style="border:none;border-top:1px solid #e2e8f0;margin:20px 0;">',
      `<p style="font-size:12px;color:#64748b;">This is an automated confirmation from <strong>${CONTACT_AUTOREPLY_FROM_EMAIL}</strong>. This no-reply address is not monitored. To follow up, use the <a href="https://joshboyer.ca/#home-connect">contact form</a>.</p>`,
      '</div>'
    ].join('')
  };

  const brandText = 'Josh Boyer\nGrounded in the Metal, Shaped by the Business, Building in the Cloud.\n\n';
  ownerEmail.html = brandedContactEmail(ownerEmail.html);
  autoReplyEmail.html = brandedContactEmail(autoReplyEmail.html);
  ownerEmail.text = brandText + ownerEmail.text;
  autoReplyEmail.text = brandText + autoReplyEmail.text;
  return { ownerEmail, autoReplyEmail };
}

function buildProviderTransport(env, fetchImpl) {
  const fetchFn = fetchImpl || globalThis.fetch;
  if (!env || typeof env !== 'object') return null;

  const provider = String(env.CONTACT_EMAIL_PROVIDER || '').trim().toLowerCase();
  const resendKey = String(env.RESEND_API_KEY || '').trim();
  const sendgridKey = String(env.SENDGRID_API_KEY || '').trim();
  const webhookUrl = String(env.CONTACT_WEBHOOK_URL || '').trim();
  const mailchannelsEnabled = String(env.MAILCHANNELS_ENABLED || '').trim().toLowerCase() === 'true';

  // Native Cloudflare Sending: fixed sender; confirmation contains no submitted message.
  if ((provider === 'cloudflare' || !provider) && typeof env.CONTACT_MAILER?.send === 'function') {
    return async function sendViaCloudflare(mail) {
      const result = await env.CONTACT_MAILER.send({
        from: { email: CONTACT_AUTOREPLY_FROM_EMAIL, name: 'Josh Boyer' },
        to: mail.to,
        replyTo: mail.replyTo,
        subject: mail.subject,
        text: mail.text,
        html: mail.html
      });
      if (!result || typeof result.messageId !== 'string' || !result.messageId) {
        throw new Error('Cloudflare did not acknowledge the message');
      }
      return { provider: 'cloudflare', id: result.messageId };
    };
  }

  if ((provider === 'resend' || (!provider && resendKey)) && resendKey) {
    return async function sendViaResend(mail) {
      const resp = await fetchFn('https://api.resend.com/emails', {
        signal: AbortSignal.timeout(CONTACT_LIMITS.deliveryTimeoutMs),
        redirect: 'error',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${resendKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          from: mail.from,
          to: [mail.to],
          reply_to: mail.replyTo,
          subject: mail.subject,
          text: mail.text,
          html: mail.html
        })
      });
      if (!resp.ok) {
        throw new Error(`Resend HTTP ${resp.status}`);
      }
      return { provider: 'resend' };
    };
  }

  if ((provider === 'sendgrid' || (!provider && sendgridKey)) && sendgridKey) {
    return async function sendViaSendGrid(mail) {
      const resp = await fetchFn('https://api.sendgrid.com/v3/mail/send', {
        signal: AbortSignal.timeout(CONTACT_LIMITS.deliveryTimeoutMs),
        redirect: 'error',
        method: 'POST',
        headers: {
          Authorization: `Bearer ${sendgridKey}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: mail.to }] }],
          from: { email: mail.fromAddress, name: 'Josh Boyer' },
          reply_to: { email: mail.replyTo },
          subject: mail.subject,
          content: [
            { type: 'text/plain', value: mail.text },
            { type: 'text/html', value: mail.html }
          ]
        })
      });
      if (!resp.ok) {
        throw new Error(`SendGrid HTTP ${resp.status}`);
      }
      return { provider: 'sendgrid' };
    };
  }

  if ((provider === 'mailchannels' || (!provider && mailchannelsEnabled)) && mailchannelsEnabled) {
    return async function sendViaMailChannels(mail) {
      const resp = await fetchFn('https://api.mailchannels.net/tx/v1/send', {
        signal: AbortSignal.timeout(CONTACT_LIMITS.deliveryTimeoutMs),
        redirect: 'error',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          personalizations: [{ to: [{ email: mail.to }] }],
          from: { email: mail.fromAddress, name: 'Josh Boyer' },
          reply_to: { email: mail.replyTo },
          subject: mail.subject,
          content: [
            { type: 'text/plain', value: mail.text },
            { type: 'text/html', value: mail.html }
          ]
        })
      });
      if (!resp.ok) {
        throw new Error(`MailChannels HTTP ${resp.status}`);
      }
      return { provider: 'mailchannels' };
    };
  }

  if ((provider === 'webhook' || (!provider && webhookUrl)) && webhookUrl) {
    return async function sendViaWebhook(mail) {
      const resp = await fetchFn(webhookUrl, {
        signal: AbortSignal.timeout(CONTACT_LIMITS.deliveryTimeoutMs),
        redirect: 'error',
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mail)
      });
      if (!resp.ok) {
        throw new Error(`Webhook HTTP ${resp.status}`);
      }
      return { provider: 'webhook' };
    };
  }

  return null;
}

function createContactService(options = {}) {
  let currentEnv = options.env || {};
  const nowFn = typeof options.nowFn === 'function' ? options.nowFn : () => Date.now();
  const customSendMailFn = typeof options.sendMailFn === 'function' ? options.sendMailFn : null;
  const fetchImpl = options.fetchImpl;
  const rateBuckets = new Map();
  let nextPruneAt = 0;

  function pruneAndCheckRateLimit(clientIp, nowMs) {
    const key = String(clientIp || '127.0.0.1');
    const winMs = CONTACT_LIMITS.rateLimitWindowMs;
    const maxReq = CONTACT_LIMITS.rateLimitMaxRequests;
    if (nowMs >= nextPruneAt) {
      for (const [ip, timestamps] of rateBuckets) {
        if (timestamps.every(ts => nowMs - ts >= winMs)) rateBuckets.delete(ip);
      }
      nextPruneAt = nowMs + winMs;
    }
    // Bound memory even when an attacker rotates addresses. Fail closed at capacity.
    if (!rateBuckets.has(key) && rateBuckets.size >= CONTACT_LIMITS.maxRateLimitClients) return false;
    const existing = rateBuckets.get(key) || [];
    const active = existing.filter(ts => nowMs - ts < winMs);
    if (active.length >= maxReq) {
      rateBuckets.set(key, active);
      return false;
    }
    active.push(nowMs);
    rateBuckets.set(key, active);
    return true;
  }

  async function handleSubmission({ body, clientIp = '127.0.0.1' } = {}) {
    const validation = validateContactPayload(body);
    if (!validation.ok) {
      return {
        status: 400,
        body: {
          ok: false,
          code: validation.code,
          field: validation.field,
          error: validation.error
        }
      };
    }

    const nowMs = nowFn();
    const safeNowMs = Number.isFinite(nowMs) ? nowMs : 0;
    if (!pruneAndCheckRateLimit(clientIp, safeNowMs)) {
      return {
        status: 429,
        body: {
          ok: false,
          code: 'RATE_LIMITED',
          error: CLOSED_ERROR_MESSAGES.RATE_LIMITED,
          autoReplyFrom: CONTACT_AUTOREPLY_FROM_EMAIL
        }
      };
    }

    const transport = customSendMailFn || buildProviderTransport(currentEnv, fetchImpl);
    if (!transport) {
      return {
        status: 503,
        body: {
          ok: false,
          code: 'EMAIL_PROVIDER_UNCONFIGURED',
          deliveryStatus: 'unconfigured',
          error: CLOSED_ERROR_MESSAGES.EMAIL_PROVIDER_UNCONFIGURED,
          autoReplyFrom: CONTACT_AUTOREPLY_FROM_EMAIL
        }
      };
    }

    const submittedAtIso = new Date(safeNowMs).toISOString();
    const { ownerEmail, autoReplyEmail } = buildContactEmails({
      ...validation.data,
      submittedAtIso
    });

    let ownerReceipt, autoReplyReceipt;
    try {
      ownerReceipt = await transport(ownerEmail);
    } catch {
      return {
        status: 502,
        body: {
          ok: false,
          code: 'CONTACT_DELIVERY_FAILED',
          deliveryStatus: 'failed',
          error: CLOSED_ERROR_MESSAGES.CONTACT_DELIVERY_FAILED,
          autoReplyFrom: CONTACT_AUTOREPLY_FROM_EMAIL
        }
      };
    }

    try {
      autoReplyReceipt = await transport(autoReplyEmail);
    } catch {
      return {
        status: 502,
        body: {
          ok: false,
          code: 'CONTACT_AUTOREPLY_FAILED',
          ownerDeliveryStatus: 'accepted_by_provider',
          autoReplyDeliveryStatus: 'failed',
          error: CLOSED_ERROR_MESSAGES.CONTACT_AUTOREPLY_FAILED,
          autoReplyFrom: CONTACT_AUTOREPLY_FROM_EMAIL
        }
      };
    }

    return {
      status: 200,
      body: {
        ok: true,
        code: 'CONTACT_ACCEPTED',
        deliveryStatus: 'accepted_by_provider',
        ownerMessageId: ownerReceipt?.id,
        autoReplyMessageId: autoReplyReceipt?.id,
        ownerDeliveryStatus: 'accepted_by_provider',
        autoReplyDeliveryStatus: 'accepted_by_provider',
        autoReplyFrom: CONTACT_AUTOREPLY_FROM_EMAIL,
        message: 'Thank you for your message. Your note and automated confirmation have been accepted. This no-reply address is not monitored; use the contact form to follow up.'
      }
    };
  }

  function setEnv(nextEnv) {
    currentEnv = nextEnv || {};
  }

  function resetRateLimits() {
    rateBuckets.clear();
    nextPruneAt = 0;
  }

  return {
    handleSubmission,
    setEnv,
    resetRateLimits
  };
}

module.exports = {
  CONTACT_RECIPIENT_EMAIL,
  CONTACT_AUTOREPLY_FROM_EMAIL,
  CONTACT_LIMITS,
  CLOSED_ERROR_MESSAGES,
  isValidEmailAddress,
  validateContactPayload,
  buildContactEmails,
  createContactService
};
