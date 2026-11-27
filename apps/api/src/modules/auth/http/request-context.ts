import type { Request } from 'express';

const IPV4_MAPPED = /^::ffff:(\d{1,3}(?:\.\d{1,3}){3})$/i;

// Express resolves `request.ip` with the `trust proxy` setting that
// applyTrustedCallers sets (SPEC-0009 R5): the address the web app states in
// X-Forwarded-For, or the connecting address for any other caller.
// IPv4-mapped IPv6 addresses are kept in IPv4 form (R8).
export function ipOf(request: Request): string | null {
  const ip = request.ip;
  if (!ip) return null;

  return IPV4_MAPPED.exec(ip)?.[1] ?? ip;
}

export function contextOf(request: Request): {
  ip: string | null;
  userAgent: string | null;
} {
  return {
    ip: ipOf(request),
    userAgent: request.header('user-agent') ?? null,
  };
}
