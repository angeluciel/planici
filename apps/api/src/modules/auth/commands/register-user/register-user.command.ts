import { ConsentInput, RegisterRequestInput } from '@planici/schemas';

export class RegisterUserCommand {
  constructor(
    readonly payload: RegisterRequestInput,
    readonly context: { ip: string | null; userAgent: string | null },
  ) {}

  get consent(): ConsentInput {
    return this.payload.consent;
  }
}
