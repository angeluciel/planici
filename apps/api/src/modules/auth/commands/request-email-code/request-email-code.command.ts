export class RequestEmailCodeCommand {
  constructor(
    readonly email: string,
    readonly ip: string | null,
  ) {}
}
