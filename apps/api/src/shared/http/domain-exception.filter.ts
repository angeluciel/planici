import {
  type ArgumentsHost,
  Catch,
  type ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import type { Response } from 'express';
import { DomainError } from '@/shared/errors/domain.error.js';

/**
 * Transforma tudo no body que o web app parseia
 * { error: "<i18n key>", field?: "<input name>" }
 * */

@Catch()
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost): void {
    const response = host.switchToHttp().getResponse<Response>();

    if (exception instanceof DomainError) {
      response
        .status(exception.status)
        .json({ error: exception.code, field: exception.field });
      return;
    }

    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      const payload = exception.getResponse();
      const error =
        typeof payload === 'object' && payload !== null && 'error' in payload
          ? (payload as { error: string }).error
          : status === HttpStatus.TOO_MANY_REQUESTS
            ? 'code.rate-limited'
            : status === HttpStatus.UNAUTHORIZED
              ? 'session.expired'
              : 'unexpected';
      response.status(status).json({ error });
      return;
    }

    this.logger.error(
      'unhandled exception',
      exception instanceof Error ? exception.stack : String(exception),
    );
    response
      .status(HttpStatus.INTERNAL_SERVER_ERROR)
      .json({ error: 'unexpected' });
  }
}
