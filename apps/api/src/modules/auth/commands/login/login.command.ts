import { LoginRequestInput } from '@planici/schemas';

export class LoginCommand {
  constructor(
    readonly payload: LoginRequestInput,
    readonly context: { ip: string | null; userAgent: string | null },
  ) {}
}
