import type {
  Tenant as TenantDto,
  TenantPlan,
  TenantRole,
} from '@planici/schemas';
import {
  TenantForbiddenError,
  TenantInactiveError,
} from './errors/tenant.errors.js';

export type TenantStatus = 'active' | 'suspended' | 'deleted';

export type TenantProps = {
  id: string;
  name: string;
  slug: string;
  status: TenantStatus;
  plan: TenantPlan;
  trialStartedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export class Tenant {
  private constructor(private readonly props: TenantProps) {}

  static fromProps(props: TenantProps): Tenant {
    return new Tenant(props);
  }

  get id(): string {
    return this.props.id;
  }

  get name(): string {
    return this.props.name;
  }

  get slug(): string {
    return this.props.slug;
  }

  get status(): TenantStatus {
    return this.props.status;
  }

  get plan(): TenantPlan {
    return this.props.plan;
  }

  get isActive(): boolean {
    return this.props.status === 'active';
  }

  /** Only an active workspace can be selected and operated on. */
  assertActive(): void {
    if (!this.isActive) throw new TenantInactiveError();
  }

  toPublic(role: TenantRole): TenantDto {
    return {
      id: this.props.id,
      name: this.props.name,
      slug: this.props.slug,
      status: this.props.status,
      plan: this.props.plan,
      role,
      trialStartedAt: this.props.trialStartedAt?.toISOString() ?? null,
      createdAt: this.props.createdAt.toISOString(),
    };
  }
}

export class Membership {
  constructor(
    readonly tenant: Tenant,
    readonly role: TenantRole,
  ) {}

  /** Settings and renaming are Owner-only; RF-06 widens this. */
  assertCanManage(): void {
    if (this.role !== 'owner') throw new TenantForbiddenError();
  }

  toPublic(): TenantDto {
    return this.tenant.toPublic(this.role);
  }
}
