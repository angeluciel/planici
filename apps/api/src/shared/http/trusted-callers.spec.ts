import { afterEach, describe, expect, it } from 'vitest';
import { Controller, Get, type INestApplication, Req } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import type { Request } from 'express';
import request from 'supertest';
import { applyTrustedCallers, parseTrustedCallers } from './trusted-callers.js';

// SPEC-0009 P-5 (R5): TRUSTED_CALLERS says which callers may state the client
// address. It is applied as Express `trust proxy`.

describe('parseTrustedCallers', () => {
  it('AC-0009-15 parses the loopback keyword', () => {
    expect(parseTrustedCallers('loopback')).toEqual(['loopback']);
  });

  it('AC-0009-15 parses IPv4 and IPv6 addresses and CIDRs, trimming each entry', () => {
    expect(
      parseTrustedCallers(
        ' loopback , 198.51.100.7,10.0.0.0/24 ,2001:db8::/32, ::1 ',
      ),
    ).toEqual([
      'loopback',
      '198.51.100.7',
      '10.0.0.0/24',
      '2001:db8::/32',
      '::1',
    ]);
  });

  it.each([
    ['an empty value', ''],
    ['a blank value', '   '],
    ['a trailing comma', 'loopback,'],
    ['an empty entry', 'loopback,,10.0.0.1'],
    ['a host name', 'web.internal'],
    ['a hop count', '1'],
    ['the wildcard', '*'],
    ['another Express keyword', 'uniquelocal'],
    ['an IPv4 prefix out of range', '10.0.0.0/33'],
    ['an IPv6 prefix out of range', '2001:db8::/129'],
    ['a non-numeric prefix', '10.0.0.0/abc'],
    ['an invalid IPv4 address', '999.0.0.1'],
  ])('AC-0009-15 rejects %s', (_label, value) => {
    expect(() => parseTrustedCallers(value)).toThrow();
  });
});

@Controller()
class ProbeController {
  @Get('ip')
  ip(@Req() req: Request) {
    return { ip: req.ip };
  }
}

describe('applyTrustedCallers', () => {
  let app: INestApplication | undefined;

  afterEach(async () => {
    await app?.close();
    app = undefined;
  });

  async function appTrusting(value: string): Promise<string> {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProbeController],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });
    applyTrustedCallers(app, value);
    await app.listen(0, '127.0.0.1');
    return await app.getUrl();
  }

  it('AC-0009-15 believes a stated address from a trusted caller', async () => {
    const url = await appTrusting('127.0.0.1');

    const response = await request(url)
      .get('/ip')
      .set('X-Forwarded-For', '203.0.113.7');

    expect(response.body).toEqual({ ip: '203.0.113.7' });
  });

  it('AC-0009-15 ignores a stated address from a caller outside the list', async () => {
    const url = await appTrusting('198.51.100.0/24');

    const response = await request(url)
      .get('/ip')
      .set('X-Forwarded-For', '203.0.113.7');

    expect(response.body.ip).toMatch(/^(::ffff:)?127\.0\.0\.1$/);
  });

  it('AC-0009-15 refuses an invalid list instead of trusting everyone', async () => {
    const moduleRef = await Test.createTestingModule({
      controllers: [ProbeController],
    }).compile();
    app = moduleRef.createNestApplication({ logger: false });

    expect(() => applyTrustedCallers(app as INestApplication, '*')).toThrow();
  });
});
