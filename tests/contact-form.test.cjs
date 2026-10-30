'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');

test('R52-R57: Contact Service & Form validation, hello@joshboyer.ca delivery, noreply@joshboyer.ca auto-reply, 3-point boundaries, and adversarial resilience', async (t) => {
  const servicePath = path.join(root, 'lib/contact-service.cjs');
  assert.ok(fs.existsSync(servicePath), 'lib/contact-service.cjs must exist');

  const {
    CONTACT_RECIPIENT_EMAIL,
    CONTACT_AUTOREPLY_FROM_EMAIL,
    CONTACT_LIMITS,
    isValidEmailAddress,
    validateContactPayload,
    buildContactEmails,
    createContactService
  } = require(servicePath);

  await t.test('1. Constants and strict email validator (RFC-compatible + hostile inputs)', () => {
    assert.equal(CONTACT_RECIPIENT_EMAIL, 'hello@joshboyer.ca');
    assert.equal(CONTACT_AUTOREPLY_FROM_EMAIL, 'noreply@joshboyer.ca');

    // Valid emails
    for (const valid of [
      'alice@example.com',
      'first.last+tag@sub.domain.ca',
      'user_name-123@company.co.uk',
      'a@b.org'
    ]) {
      assert.equal(isValidEmailAddress(valid), true, `Expected valid email: ${valid}`);
    }

    // Invalid emails
    for (const invalid of [
      '',
      '   ',
      'plainaddress',
      '@missinglocal.com',
      'missingdomain@',
      'missingtld@domain',
      'singlecharTld@domain.c',
      'numericTld@domain.123',
      '.leadingdot@domain.com',
      'trailingdot.@domain.com',
      'double..dot@domain.com',
      'user@.leadingdotdomain.com',
      'user@trailingdotdomain.com.',
      'user@-leadinghyphen.com',
      'user@trailinghyphen-.com',
      'user@double..dot.com',
      'space in@domain.com',
      'user@space domain.com',
      'two@@domain.com',
      'victim@example.com\r\nBcc:evil@example.com',
      'victim@example.com\nSubject:Injected',
      'null\0byte@example.com',
      'line\u2028sep@example.com',
      `${'a'.repeat(65)}@example.com`,
      `user@${'a'.repeat(64)}.com`,
      `${'a'.repeat(245)}@example.com`
    ]) {
      assert.equal(isValidEmailAddress(invalid), false, `Expected invalid email: ${JSON.stringify(invalid)}`);
    }
  });

  await t.test('2. Payload validation: required name, valid email, required message, honeypot, and hostile objects', () => {
    // Missing name
    assert.equal(validateContactPayload({ name: '   ', email: 'alice@example.com', message: 'Hello' }).ok, false);
    assert.equal(validateContactPayload({ name: '   ', email: 'alice@example.com', message: 'Hello' }).code, 'NAME_REQUIRED');

    // Missing email
    assert.equal(validateContactPayload({ name: 'Alice', email: '', message: 'Hello' }).ok, false);
    assert.equal(validateContactPayload({ name: 'Alice', email: '', message: 'Hello' }).code, 'EMAIL_REQUIRED');

    // Invalid email
    assert.equal(validateContactPayload({ name: 'Alice', email: 'not-an-email', message: 'Hello' }).ok, false);
    assert.equal(validateContactPayload({ name: 'Alice', email: 'not-an-email', message: 'Hello' }).code, 'EMAIL_INVALID');

    // Missing message
    assert.equal(validateContactPayload({ name: 'Alice', email: 'alice@example.com', message: '  ' }).ok, false);
    assert.equal(validateContactPayload({ name: 'Alice', email: 'alice@example.com', message: '  ' }).code, 'MESSAGE_REQUIRED');

    // Control characters in name or email or message
    assert.equal(validateContactPayload({ name: 'Alice\r\nBcc:evil@example.com', email: 'alice@example.com', message: 'Hi' }).code, 'INVALID_NAME_CONTROL_CHARS');
    assert.equal(validateContactPayload({ name: 'Alice', email: 'alice@example.com\r\n', message: 'Hi' }).code, 'INVALID_EMAIL_CONTROL_CHARS');
    assert.equal(validateContactPayload({ name: 'Alice', email: 'alice@example.com', message: 'Hi\0there' }).code, 'INVALID_MESSAGE_CONTROL_CHARS');

    // Honeypot filled
    assert.equal(validateContactPayload({ name: 'Alice', email: 'alice@example.com', message: 'Hi', website: 'https://spam.example' }).code, 'BOT_DETECTED');

    // Length boundaries (3-point boundary on name 119/120/121 and message 4999/5000/5001)
    assert.equal(validateContactPayload({ name: 'A'.repeat(119), email: 'a@b.ca', message: 'Hi' }).ok, true);
    assert.equal(validateContactPayload({ name: 'A'.repeat(120), email: 'a@b.ca', message: 'Hi' }).ok, true);
    assert.equal(validateContactPayload({ name: 'A'.repeat(121), email: 'a@b.ca', message: 'Hi' }).code, 'NAME_TOO_LONG');

    assert.equal(validateContactPayload({ name: 'Alice', email: 'a@b.ca', message: 'M'.repeat(4999) }).ok, true);
    assert.equal(validateContactPayload({ name: 'Alice', email: 'a@b.ca', message: 'M'.repeat(5000) }).ok, true);
    assert.equal(validateContactPayload({ name: 'Alice', email: 'a@b.ca', message: 'M'.repeat(5001) }).code, 'MESSAGE_TOO_LONG');

    // Hostile objects: null, array, __proto__ own property, throwing getter
    assert.equal(validateContactPayload(null).code, 'INVALID_PAYLOAD');
    assert.equal(validateContactPayload([]).code, 'INVALID_PAYLOAD');
    const protoPayload = JSON.parse('{"__proto__":{"polluted":true},"name":"Alice","email":"alice@example.com","message":"Hi"}');
    assert.equal(validateContactPayload(protoPayload).code, 'INVALID_PAYLOAD');
    assert.equal(({}).polluted, undefined);

    const throwingObj = {};
    Object.defineProperty(throwingObj, 'name', {
      enumerable: true,
      get() {
        throw new Error('CANARY-THROW-GETTER-7788');
      }
    });
    const throwRes = validateContactPayload(throwingObj);
    assert.equal(throwRes.ok, false);
    assert.equal(throwRes.code, 'INVALID_PAYLOAD');
    assert.doesNotMatch(JSON.stringify(throwRes), /CANARY-THROW-GETTER-7788/);
  });

  await t.test('3. Email builder produces owner email to hello@joshboyer.ca and auto-reply from noreply@joshboyer.ca with HTML escaping', () => {
    const emails = buildContactEmails({
      name: 'Ada <Lovelace>',
      email: 'ada@analytical.org',
      message: 'Interested in discussing <script>alert(1)</script> & architecture.',
      submittedAtIso: '2026-10-29T04:00:00.000Z'
    });

    // 1. Owner notification email
    assert.equal(emails.ownerEmail.to, 'hello@joshboyer.ca');
    assert.equal(emails.ownerEmail.fromAddress, 'noreply@joshboyer.ca');
    assert.equal(emails.ownerEmail.replyTo, 'ada@analytical.org');
    assert.match(emails.ownerEmail.subject, /Ada <Lovelace>/);
    assert.match(emails.ownerEmail.text, /ada@analytical\.org/);
    assert.doesNotMatch(emails.ownerEmail.html, /<script>/);
    assert.match(emails.ownerEmail.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);

    // 2. Auto-reply confirmation email
    assert.equal(emails.autoReplyEmail.fromAddress, 'noreply@joshboyer.ca');
    assert.match(emails.autoReplyEmail.from, /noreply@joshboyer\.ca/);
    assert.equal(emails.autoReplyEmail.to, 'ada@analytical.org');
    assert.equal(emails.autoReplyEmail.replyTo, 'noreply@joshboyer.ca');
    assert.doesNotMatch(JSON.stringify(emails.autoReplyEmail), /hello@joshboyer\.ca/);
    assert.match(emails.autoReplyEmail.subject, /Thank you for your message/i);
    assert.match(emails.autoReplyEmail.text, /Thank you for your message/i);
    assert.match(emails.autoReplyEmail.text, /respond as soon as I can/i);
    assert.match(emails.autoReplyEmail.text, /noreply@joshboyer\.ca/);
    assert.doesNotMatch(emails.autoReplyEmail.html, /<Lovelace>/);
    assert.doesNotMatch(emails.autoReplyEmail.html, /Ada|Lovelace/);
  });

  await t.test('4. Rate limiting 3-point time boundary (window-1, window, window+1 ms) and count boundary (max-1, max, max+1)', async () => {
    let nowMs = 1_000_000;
    const sent = [];
    const svc = createContactService({
      nowFn: () => nowMs,
      sendMailFn: async (mail) => {
        sent.push(mail);
        return { id: `msg-${sent.length}` };
      }
    });

    const maxReq = CONTACT_LIMITS.rateLimitMaxRequests; // 5
    const winMs = CONTACT_LIMITS.rateLimitWindowMs; // 900_000

    // Requests 1 .. maxReq-1 (4) and maxReq (5) succeed
    for (let i = 1; i <= maxReq; i++) {
      const res = await svc.handleSubmission({
        body: { name: `User ${i}`, email: `user${i}@example.com`, message: `Hello ${i}` },
        clientIp: '198.51.100.42'
      });
      assert.equal(res.status, 200, `Request ${i} of ${maxReq} should succeed`);
      assert.equal(res.body.code, 'CONTACT_ACCEPTED');
    }
    // Each submission sends 2 emails (owner + auto-reply)
    assert.equal(sent.length, maxReq * 2);

    // Request maxReq+1 (6th) at same timestamp -> 429 RATE_LIMITED
    const blockedStart = await svc.handleSubmission({
      body: { name: 'User 6', email: 'user6@example.com', message: 'Hello 6' },
      clientIp: '198.51.100.42'
    });
    assert.equal(blockedStart.status, 429);
    assert.equal(blockedStart.body.code, 'RATE_LIMITED');

    // Boundary point 1: window - 1 ms (1_000_000 + 899_999) -> still 429
    nowMs = 1_000_000 + winMs - 1;
    const blockedBefore = await svc.handleSubmission({
      body: { name: 'User Before', email: 'before@example.com', message: 'Still inside window' },
      clientIp: '198.51.100.42'
    });
    assert.equal(blockedBefore.status, 429);
    assert.equal(blockedBefore.body.code, 'RATE_LIMITED');

    // Boundary point 2: exact window ms (1_000_000 + 900_000) -> allowed (200)
    nowMs = 1_000_000 + winMs;
    const allowedExact = await svc.handleSubmission({
      body: { name: 'User Exact', email: 'exact@example.com', message: 'At exact window expiry' },
      clientIp: '198.51.100.42'
    });
    assert.equal(allowedExact.status, 200);
    assert.equal(allowedExact.body.code, 'CONTACT_ACCEPTED');

    // Refill window and test window + 1 ms
    nowMs = 3_000_000;
    for (let i = 1; i <= maxReq; i++) {
      const r = await svc.handleSubmission({
        body: { name: `Batch2 ${i}`, email: `b2_${i}@example.com`, message: 'Test' },
        clientIp: '198.51.100.99'
      });
      assert.equal(r.status, 200);
    }
    nowMs = 3_000_000 + winMs + 1;
    const allowedAfter = await svc.handleSubmission({
      body: { name: 'User After', email: 'after@example.com', message: 'At window+1ms' },
      clientIp: '198.51.100.99'
    });
    assert.equal(allowedAfter.status, 200);
    assert.equal(allowedAfter.body.code, 'CONTACT_ACCEPTED');
  });

  await t.test('5. Partial failure & provider failure handling: never fakes delivery or leaks raw exception text', async () => {
    const canary = 'CANARY-PROVIDER-SECRET-551199';

    // Case A: Owner email throws raw provider error containing canary
    const failingPrimarySvc = createContactService({
      sendMailFn: async () => {
        throw new Error(`SMTP 535 Authentication failed with key ${canary}`);
      }
    });
    const failRes = await failingPrimarySvc.handleSubmission({
      body: { name: 'Grace Hopper', email: 'grace@navy.mil', message: 'Testing primary failure' },
      clientIp: '127.0.0.1'
    });
    assert.equal(failRes.status, 502);
    assert.equal(failRes.body.ok, false);
    assert.equal(failRes.body.code, 'CONTACT_DELIVERY_FAILED');
    assert.doesNotMatch(JSON.stringify(failRes), new RegExp(canary));

    // Case B: Owner email succeeds, but noreply@joshboyer.ca auto-reply fails -> partial failure reported truthfully
    let callCount = 0;
    const failingAutoReplySvc = createContactService({
      sendMailFn: async (mail) => {
        callCount += 1;
        if (mail.to === 'grace@navy.mil') {
          throw new Error(`Auto-reply rejected ${canary}`);
        }
        return { id: 'owner-1' };
      }
    });
    const partialRes = await failingAutoReplySvc.handleSubmission({
      body: { name: 'Grace Hopper', email: 'grace@navy.mil', message: 'Testing auto-reply failure' },
      clientIp: '127.0.0.1'
    });
    assert.equal(callCount, 2);
    assert.equal(partialRes.status, 502);
    assert.equal(partialRes.body.ok, false);
    assert.equal(partialRes.body.code, 'CONTACT_AUTOREPLY_FAILED');
    assert.equal(partialRes.body.ownerDeliveryStatus, 'accepted_by_provider');
    assert.equal(partialRes.body.autoReplyDeliveryStatus, 'failed');
    assert.doesNotMatch(JSON.stringify(partialRes), new RegExp(canary));

    // Case C: Missing provider configuration fails closed with 503 EMAIL_PROVIDER_UNCONFIGURED
    const unconfiguredSvc = createContactService({ env: {} });
    const unconfRes = await unconfiguredSvc.handleSubmission({
      body: { name: 'Grace Hopper', email: 'grace@navy.mil', message: 'Testing unconfigured fail-closed' },
      clientIp: '127.0.0.1'
    });
    assert.equal(unconfRes.status, 503);
    assert.equal(unconfRes.body.ok, false);
    assert.equal(unconfRes.body.code, 'EMAIL_PROVIDER_UNCONFIGURED');
    assert.doesNotMatch(JSON.stringify(unconfRes.body), /hello@joshboyer\.ca/);
    assert.equal(unconfRes.body.autoReplyFrom, 'noreply@joshboyer.ca');
  });

  await t.test('6. Real HTTP integration test against serve.cjs (/api/contact) with real local webhook receiver and canary checks', async () => {
    const receivedWebhookPayloads = [];
    const webhookServer = http.createServer((req, res) => {
      const chunks = [];
      req.on('data', c => chunks.push(c));
      req.on('end', () => {
        receivedWebhookPayloads.push(JSON.parse(Buffer.concat(chunks).toString('utf8')));
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ id: `webhook-msg-${receivedWebhookPayloads.length}` }));
      });
    });

    await new Promise(r => webhookServer.listen(0, '127.0.0.1', r));
    const webhookPort = webhookServer.address().port;

    const { server, contactService } = require(path.join(root, 'serve.cjs'));
    contactService.setEnv({
      CONTACT_EMAIL_PROVIDER: 'webhook',
      CONTACT_WEBHOOK_URL: `http://127.0.0.1:${webhookPort}/send`
    });
    contactService.resetRateLimits();

    await new Promise(r => server.listen(0, '127.0.0.1', r));
    const port = server.address().port;

    const requestJson = (reqPath, method, bodyStr, headers = {}) =>
      new Promise((resolve, reject) => {
        const req = http.request(
          {
            hostname: '127.0.0.1',
            port,
            path: reqPath,
            method,
            headers: {
              Connection: 'close',
              'Content-Type': 'application/json',
              ...(bodyStr !== null ? { 'Content-Length': Buffer.byteLength(bodyStr) } : {}),
              ...headers
            }
          },
          res => {
            const chunks = [];
            res.on('data', c => chunks.push(c));
            res.on('end', () => {
              const raw = Buffer.concat(chunks).toString('utf8');
              let json = null;
              try {
                json = JSON.parse(raw);
              } catch {
                // ignore
              }
              resolve({ status: res.statusCode, headers: res.headers, raw, json });
            });
          }
        );
        req.on('error', reject);
        if (bodyStr !== null) req.write(bodyStr);
        req.end();
      });

    try {
      // 6a. GET /api/contact -> 405 Method Not Allowed
      const getRes = await requestJson('/api/contact', 'GET', null);
      assert.equal(getRes.status, 405);

      // 6b. Invalid email with canary -> 400 EMAIL_INVALID and canary is never reflected in HTTP response
      const canary = 'CANARY-HTTP-CONTACT-884422';
      const badEmailRes = await requestJson(
        '/api/contact',
        'POST',
        JSON.stringify({
          name: `Test ${canary}`,
          email: `invalid-email-${canary}`,
          message: `Body ${canary}`
        })
      );
      assert.equal(badEmailRes.status, 400);
      assert.equal(badEmailRes.json.code, 'EMAIL_INVALID');
      assert.doesNotMatch(badEmailRes.raw, new RegExp(canary));
      assert.doesNotMatch(JSON.stringify(badEmailRes.headers), new RegExp(canary));
      assert.equal(receivedWebhookPayloads.length, 0);

      // 6c. Valid submission -> 200 OK, dispatches both owner email (hello@joshboyer.ca) and auto-reply (noreply@joshboyer.ca)
      const validRes = await requestJson(
        '/api/contact',
        'POST',
        JSON.stringify({
          name: 'Margaret Hamilton',
          email: 'margaret@apollo.org',
          message: 'Hello Josh, I would like to connect regarding enterprise architecture.'
        })
      );
      assert.equal(validRes.status, 200);
      assert.equal(validRes.json.ok, true);
      assert.equal(validRes.json.code, 'CONTACT_ACCEPTED');
      assert.doesNotMatch(JSON.stringify(validRes.json), /hello@joshboyer\.ca/);
      assert.equal(validRes.json.autoReplyFrom, 'noreply@joshboyer.ca');

      assert.equal(receivedWebhookPayloads.length, 2, 'Must dispatch both owner notification and sender auto-reply');
      const [ownerMail, replyMail] = receivedWebhookPayloads;

      assert.equal(ownerMail.to, 'hello@joshboyer.ca');
      assert.equal(ownerMail.fromAddress, 'noreply@joshboyer.ca');
      assert.equal(ownerMail.replyTo, 'margaret@apollo.org');
      assert.match(ownerMail.text, /Margaret Hamilton/);
      assert.match(ownerMail.text, /margaret@apollo\.org/);
      assert.match(ownerMail.text, /enterprise architecture/);

      assert.equal(replyMail.fromAddress, 'noreply@joshboyer.ca');
      assert.equal(replyMail.to, 'margaret@apollo.org');
      assert.equal(replyMail.replyTo, 'noreply@joshboyer.ca');
      assert.match(replyMail.text, /Thank you for your message/i);
      assert.match(replyMail.text, /respond as soon as I can/i);
      assert.match(replyMail.text, /noreply@joshboyer\.ca/);

      // 6d. Malformed JSON with canary -> 400 INVALID_JSON, canary never echoed
      const malformedRes = await requestJson('/api/contact', 'POST', `{bad json ${canary}`);
      assert.equal(malformedRes.status, 400);
      assert.equal(malformedRes.json.code, 'INVALID_JSON');
      assert.doesNotMatch(malformedRes.raw, new RegExp(canary));

      // 6e. Oversize payload (> 24 KB) -> 413 PAYLOAD_TOO_LARGE, canary never echoed
      const oversizeBody = JSON.stringify({
        name: 'Oversize',
        email: 'oversize@example.com',
        message: `${canary}-${'X'.repeat(28 * 1024)}`
      });
      const oversizeRes = await requestJson('/api/contact', 'POST', oversizeBody);
      assert.equal(oversizeRes.status, 413);
      assert.equal(oversizeRes.json.code, 'PAYLOAD_TOO_LARGE');
      assert.doesNotMatch(oversizeRes.raw, new RegExp(canary));
    } finally {
      contactService.setEnv(process.env);
      contactService.resetRateLimits();
      await new Promise(r => server.close(r));
      await new Promise(r => webhookServer.close(r));
    }
  });

  await t.test('7. Frontend markup and client handler in dist/architect-workbench.js enforce basic form, valid email check, hello@joshboyer.ca & noreply@joshboyer.ca', () => {
    const wbJs = fs.readFileSync(path.join(root, 'dist/architect-workbench.js'), 'utf8');
    assert.doesNotMatch(wbJs, /hello@joshboyer\.ca/);
    assert.match(wbJs, /href="#home-connect" aria-label="Contact Josh using the form"/);
    assert.doesNotMatch(wbJs, /href="mailto:josh@joshboyer\.ca"/);
    assert.match(wbJs, /id="home-connect-form"\s+data-home-contact-form/);
    assert.match(wbJs, /name="name"[^>]*required[^>]*data-contact-name/);
    assert.match(wbJs, /type="email"\s+name="email"[^>]*required[^>]*data-contact-reply/);
    assert.match(wbJs, /name="message"[^>]*required[^>]*data-contact-message/);
    assert.match(wbJs, /fetch\("\/api\/contact"/);
    assert.match(wbJs, /noreply@joshboyer\.ca/);
    assert.match(wbJs, /This automated address is not monitored/);
  });

  await t.test('8. Property/fuzz test with recorded seed=0x20261029: never throws, deterministic output, and never emits canary in errors', () => {
    const SEED = 0x20261029;
    let state = SEED >>> 0;
    const nextRand = () => {
      state = (Math.imul(1664525, state) + 1013904223) >>> 0;
      return state / 0x100000000;
    };

    const canary = 'CANARY-FUZZ-20261029';
    const alphabet = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789.@_-+ \r\n\0\u2028<>&"\'';
    const randomStr = maxLen => {
      const len = Math.floor(nextRand() * maxLen);
      let out = '';
      for (let i = 0; i < len; i++) {
        out += alphabet[Math.floor(nextRand() * alphabet.length)];
      }
      return nextRand() < 0.35 ? `${out}${canary}` : out;
    };

    for (let iter = 0; iter < 250; iter++) {
      const candidate = {
        name: randomStr(150),
        email: randomStr(120),
        message: randomStr(300),
        website: nextRand() < 0.1 ? randomStr(20) : ''
      };
      const out1 = validateContactPayload(candidate);
      const out2 = validateContactPayload(candidate);
      assert.deepEqual(out1, out2, `Seed ${SEED} iteration ${iter} must be deterministic`);
      assert.equal(typeof out1.ok, 'boolean');
      if (!out1.ok) {
        assert.doesNotMatch(String(out1.error), new RegExp(canary), `Seed ${SEED} iteration ${iter} leaked canary in error`);
        assert.doesNotMatch(String(out1.code), new RegExp(canary), `Seed ${SEED} iteration ${iter} leaked canary in code`);
      }
    }
  });
});
