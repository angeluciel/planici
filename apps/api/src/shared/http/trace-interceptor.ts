/**
 * Keeps the trace id apps/web already generates (x-trace-id)
 * attached to the API response, so the browser req and the log can be
 * matched in Sentry
 * */

import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { randomBytes } from 'crypto';
import type { Request, Response } from 'express';
import { tap } from 'rxjs';

@Injectable()
export class TraceInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler) {
    const http = context.switchToHttp();
    const request = http.getRequest<Request>();
    const response = http.getResponse<Response>();

    const traceId =
      request.header('x-trace-id') ?? randomBytes(16).toString('hex');
    response.setHeader('x-trace-id', traceId);

    return next.handle().pipe(tap());
  }
}
