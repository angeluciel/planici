import type { Request } from 'express';

// Express resolves `request.ip` from X-Forwarded-For with the `trust proxy`
// setting of main.ts: only the entries our own proxies appended are trusted.
// The leftmost entry is whatever the client sent, so it is never read here.
export function ipOf(request: Request): string | null {
  return request.ip ?? null;
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
