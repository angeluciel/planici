export class VerifyEmailCodeCommand {
  constructor(
    readonly email: string,
    readonly code: string,
  ) {}
}
