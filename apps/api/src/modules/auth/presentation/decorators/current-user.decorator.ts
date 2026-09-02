import { createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { Request } from "express";

export type AuthenticatedUser = { id: string; email: string };

export const CUrrentUser = createParamDecorator(
  (_data: unknown, context: ExecutionContext): AuthenticatedUser => {
    const request = context
      .switchToHttp()
      .getRequest<Request & { user?: AuthenticatedUser }>();

    if (!request.user) throw new Error("CurrentUser used on a route without JwtAccessGuard");

    return request.user;
  }
)