import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Controller, Get, type INestApplication, Req } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Request } from 'express';
import request from 'supertest';
import { applyTrustedCallers } from '@shared/http/trusted-callers.js';
import { contextOf, ipOf } from './request-context.js';

// The client address recorded with login attempts, e-mail codes, password
// resets and the consent trail (SPEC-0009). Express resolves `request.ip`
// from X-Forwarded-For with the `trust proxy` setting that TRUSTED_CALLERS
// gives it (P-5): a stated address counts only from a trusted caller.

@Controller()
class ProbeController {
  @Get('ip')
  ip(@Req() req: Request) {
    return { ip: ipOf(req) };
  }

  @Get('context')
  context(@Req() req: Request) {
    return contextOf(req);
  }
}

async function startProbe(trustedCallers: string): Promise<{
  app: INestApplication;
  url: string;
}> {
  const moduleRef = await Test.createTestingModule({
    controllers: [ProbeController],
  }).compile();
  const app = moduleRef.createNestApplication({ logger: false });
  applyTrustedCallers(app, trustedCallers);
  // the connecting address is then exactly 127.0.0.1
  await app.listen(0, '127.0.0.1');
  return { app, url: await app.getUrl() };
}

describe('ipOf for a trusted caller (loopback)', () => {
  let app: INestApplication;
  let url: string;

  beforeAll(async () => {
    ({ app, url } = await startProbe('loopback'));
  });

  afterAll(async () => {
    await app?.close();
  });

  const probe = (path: string, headers: Record<string, string> = {}) =>
    request(url).get(path).set(headers);

  it('takes the address the caller states', async () => {
    const response = await probe('/ip', { 'x-forwarded-for': '203.0.113.7' });

    expect(response.body).toEqual({ ip: '203.0.113.7' });
  });

  it('takes an IPv6 address as stated', async () => {
    const response = await probe('/ip', { 'x-forwarded-for': '2001:db8::7' });

    expect(response.body).toEqual({ ip: '2001:db8::7' });
  });

  it('stores a stated IPv4-mapped address in IPv4 form', async () => {
    const response = await probe('/ip', {
      'x-forwarded-for': '::ffff:203.0.113.7',
    });

    expect(response.body).toEqual({ ip: '203.0.113.7' });
  });

  it('ignores addresses the client put in X-Forwarded-For itself', async () => {
    const response = await probe('/ip', {
      'x-forwarded-for': '198.51.100.66, 203.0.113.7',
    });

    expect(response.body).toEqual({ ip: '203.0.113.7' });
  });

  it('falls back to the connecting address without X-Forwarded-For', async () => {
    const response = await probe('/ip');

    expect(response.body).toEqual({ ip: '127.0.0.1' });
  });

  it('pairs the client address with the user agent', async () => {
    const response = await probe('/context', {
      'x-forwarded-for': '203.0.113.7',
      'user-agent': 'Planici/1.0',
    });

    expect(response.body).toEqual({
      ip: '203.0.113.7',
      userAgent: 'Planici/1.0',
    });
  });

  it('answers a null user agent when none is sent', async () => {
    const response = await probe('/context').unset('User-Agent');

    expect(response.body.userAgent).toBeNull();
  });
});

describe('ipOf for a caller that is not trusted', () => {
  let app: INestApplication;
  let url: string;

  beforeAll(async () => {
    // the probe connects from 127.0.0.1, which this list leaves out
    ({ app, url } = await startProbe('198.51.100.0/24'));
  });

  afterAll(async () => {
    await app?.close();
  });

  it('AC-0009-15 ignores X-Forwarded-For from an untrusted caller', async () => {
    const response = await request(url)
      .get('/ip')
      .set('x-forwarded-for', '203.0.113.50');

    expect(response.body).toEqual({ ip: '127.0.0.1' });
  });

  it('AC-0009-15 keeps the connecting address in the context', async () => {
    const response = await request(url)
      .get('/context')
      .set('x-forwarded-for', '203.0.113.50');

    expect(response.body.ip).toBe('127.0.0.1');
  });
});

describe('ipOf normalization (R8)', () => {
  const requestWith = (ip: string | undefined) => ({ ip }) as Request;

  it('turns ::ffff:127.0.0.1 into 127.0.0.1', () => {
    expect(ipOf(requestWith('::ffff:127.0.0.1'))).toBe('127.0.0.1');
  });

  it('turns an IPv4-mapped client address into IPv4 form', () => {
    expect(ipOf(requestWith('::ffff:203.0.113.7'))).toBe('203.0.113.7');
  });

  it('keeps ::1 and any other IPv6 address as it arrives', () => {
    expect(ipOf(requestWith('::1'))).toBe('::1');
    expect(ipOf(requestWith('2001:db8::7'))).toBe('2001:db8::7');
  });

  it('answers null when there is no address', () => {
    expect(ipOf(requestWith(undefined))).toBeNull();
  });
});
