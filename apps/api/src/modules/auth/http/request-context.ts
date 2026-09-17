import type { Request } from 'express';

export function ipOf(request: Request): string | null {
  const forwarded = request.header('x-forwarded-for');

  if (forwarded) {
    return forwarded.split(',')[0]?.trim() ?? null;
  }

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
