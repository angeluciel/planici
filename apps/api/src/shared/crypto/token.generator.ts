import { randomBytes, randomInt } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import { EMAIL_CODE_LENGTH } from '@planici/schemas';

@Injectable()
export class TokenGenerator {
  emailCode(): string {
    const max = 10 ** EMAIL_CODE_LENGTH;
    return randomInt(0, max).toString().padStart(EMAIL_CODE_LENGTH, '0');
  }

  opaqueToken(bytes = 32): string {
    return randomBytes(bytes).toString('base64url');
  }
}
