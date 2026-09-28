import { Inject } from '@nestjs/common';
import { CommandHandler, EventBus, type ICommandHandler } from '@nestjs/cqrs';
import type { TenantResponse } from '@planici/schemas';
import { TenantSlugTakenError } from '../../domain/errors/tenant.errors.js';
import { TenantCreatedEvent } from '../../domain/events/tenant.events.js';
import { TenantName } from '../../domain/value-objects/tenant-name.vo.js';
import { TenantSlug } from '../../domain/value-objects/tenant-slug.vo.js';
import {
  TENANT_REPOSITORY,
  type TenantRepository,
} from '../../ports/repositories/tenant.repository.js';
import { CreateTenantCommand } from './create-tenant.command.js';

/**
 * Onboarding step after register: creates a workspace and becomes its owner
 */
@CommandHandler(CreateTenantCommand)
export class CreateTenantHandler implements ICommandHandler<CreateTenantCommand> {
  constructor(
    @Inject(TENANT_REPOSITORY) private readonly tenants: TenantRepository,
    private readonly events: EventBus,
  ) {}

  async execute(command: CreateTenantCommand): Promise<TenantResponse> {
    const name = TenantName.create(command.payload.name);
    const slug = TenantSlug.create(command.payload.slug);

    if (await this.tenants.slugExists(slug.value))
      throw new TenantSlugTakenError();

    const tenant = await this.tenants.createWithOwner(
      { name: name.value, slug: slug.value },
      command.userId,
    );

    this.events.publish(
      new TenantCreatedEvent(tenant.id, command.userId, tenant.slug),
    );

    return tenant.toPublic('owner');
  }
}
