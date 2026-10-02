import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
} from '@nestjs/common';
import { TenantIdSchema } from '@planici/schemas';
import type { AuthenticatedUser } from '@modules/auth/http/current-user.decorator.js';
import {
  TenantNotFoundError,
  TenantRequiredError,
} from '../domain/errors/tenant.errors.js';
import {
  TENANT_REPOSITORY,
  type TenantRepository,
} from '../ports/repositories/tenant.repository.js';
import type { TenantRequest } from './current-tenant.decorator.js';

export const TENANT_HEADER = 'x-tenant-id';

/**
 * Resolves the workspace a request acts on and checks the caller belongs to
 * it (RN-02). Must run after JwtAccessGuard:
 *
 *   @UseGuards(JwtAccessGuard, ActiveTenantGuard)
 *
 * The id comes from the `:tenantId` route param when there is one, otherwise
 * from the `X-Tenant-Id` header the web app sends for the selected tenant.
 */
@Injectable()
export class ActiveTenantGuard implements CanActivate {
  constructor(
    @Inject(TENANT_REPOSITORY) private readonly tenants: TenantRepository,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context
      .switchToHttp()
      .getRequest<TenantRequest & { user?: AuthenticatedUser }>();

    if (!request.user)
      throw new Error('ActiveTenantGuard must run after JwtAccessGuard');

    const raw = request.params?.tenantId ?? request.header(TENANT_HEADER);
    if (!raw) throw new TenantRequiredError();

    const parsed = TenantIdSchema.safeParse(raw);
    if (!parsed.success) throw new TenantNotFoundError();

    const membership = await this.tenants.findMembership(
      parsed.data,
      request.user.id,
    );
    if (!membership) throw new TenantNotFoundError();

    membership.tenant.assertActive();

    request.membership = membership;
    return true;
  }
}
