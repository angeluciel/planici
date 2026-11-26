import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { Controller, Get, type INestApplication, Req } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Request } from 'express';
import request from 'supertest';
import { contextOf, ipOf } from './request-context.js';

// The client address recorded with login attempts, e-mail codes, password
// resets and the consent trail. The app runs behind one proxy (main.ts sets
// `trust proxy` to 1), which appends the address it saw to X-Forwarded-For.
// Anything before that last entry came from the client and can be forged.

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

let app: INestApplication;

beforeAll(async () => {
  const moduleRef = await Test.createTestingModule({
    controllers: [ProbeController],
  }).compile();
  app = moduleRef.createNestApplication({ logger: false });
  // as in main.ts
  app.getHttpAdapter().getInstance().set('trust proxy', 1);
  await app.init();
});

afterAll(async () => {
  await app?.close();
});

const probe = (path: string, headers: Record<string, string> = {}) =>
  request(app.getHttpServer()).get(path).set(headers);

describe('ipOf behind one trusted proxy', () => {
  it('takes the address the proxy appended', async () => {
    const response = await probe('/ip', { 'x-forwarded-for': '203.0.113.7' });

    expect(response.body).toEqual({ ip: '203.0.113.7' });
  });

  it('ignores addresses the client put in X-Forwarded-For itself', async () => {
    const response = await probe('/ip', {
      'x-forwarded-for': '198.51.100.66, 10.0.0.1, 203.0.113.7',
    });

    expect(response.body).toEqual({ ip: '203.0.113.7' });
  });

  it('ignores spaces around the entries', async () => {
    const response = await probe('/ip', {
      'x-forwarded-for': ' 198.51.100.66 ,  203.0.113.7 ',
    });

    expect(response.body).toEqual({ ip: '203.0.113.7' });
  });

  it('falls back to the socket address without X-Forwarded-For', async () => {
    const response = await probe('/ip');

    expect(response.body.ip).toMatch(/^(::ffff:)?127\.0\.0\.1$|^::1$/);
  });
});

describe('contextOf', () => {
  it('pairs the client address with the user agent', async () => {
    const response = await probe('/context', {
      'x-forwarded-for': '198.51.100.66, 203.0.113.7',
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
