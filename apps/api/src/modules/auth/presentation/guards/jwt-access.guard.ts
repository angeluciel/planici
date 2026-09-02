import { type CanActivate, type ExecutionContext, Inject, Injectable } from "@nestjs/common";
import type { ConfigType } from "@nestjs/config";
import { JwtService } from '@nestjs/jwt';
import type { Request } from "express";
import { jwtConfig } from "@/config/namespaces/jwt.config.js";
import { ExpiredTokenError, InvalidTokenError } from "../../domain/errors/auth.errors.js";
import type { AuthenticatedUser } from "../decorators/current-user.decorator.js";

/**
 * Bearer-token guard. The web app keeps the token in an httpOnly cookie
 * and the BFF forwards it as Authorization: Bearer <token>
 */

@Injectable()
export class JwtAccessGuard implements CanActivate {
  constructor(
    private readonly jwt: JwtService,
    @Inject(jwtConfig.KEY)
    private readonly config: ConfigType<typeof jwtConfig>,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();
      const header = request.header("authorization");

      if (!header?.startsWith("Bearer ")) throw new InvalidTokenError();

      try {
        const claims = await this.jwt.verifyAsync<{ sub: string; email: string }>(
          header.slice(7),
          {
            secret: this.config.secret,
            algorithms: ["HS256"],
          },
        );

        request.user = { id: claims.sub, email: claims.email };
        return true;
      } catch (error) {
        throw error instanceof Error && error.name === "TokenExpiredError"
          ? new ExpiredTokenError()
          : new InvalidTokenError();
      }
  }
}