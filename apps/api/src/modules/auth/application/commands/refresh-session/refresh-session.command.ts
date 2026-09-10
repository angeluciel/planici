export class RefreshSessionCommand {
  constructor(
    readonly refreshToken: string,
    readonly context: { ip: string | null; userAgent: string | null },
  ) {}
}
