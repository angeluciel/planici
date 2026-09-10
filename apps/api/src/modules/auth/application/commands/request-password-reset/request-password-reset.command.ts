export class RequestPasswordResetCommand {
  constructor(
    readonly email: string,
    readonly ip: string | null,
  ) {}
}
