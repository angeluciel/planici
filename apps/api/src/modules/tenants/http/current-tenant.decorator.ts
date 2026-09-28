import { createParamDecorator, type ExecutionContext } from '@nestjs/common';
import type { Request } from 'express';
import type { Membership } from '../domain/tenant.entity.js';

export type TenantRequest = Request & { membership?: Membership };

/** The membership ActiveTenantGuard resolved for this request. */
export const CurrentMembership = createParamDecorator(
  (_data: unknown, context: ExecutionContext): Membership => {
    const request = context.switchToHttp().getRequest<TenantRequest>();

    if (!request.membership)
      throw new Error(
        'CurrentMembership used on a route without ActiveTenantGuard',
      );

    return request.membership;
  },
);
