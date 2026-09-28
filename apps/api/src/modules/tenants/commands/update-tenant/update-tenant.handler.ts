import { Inject } from '@nestjs/common';
import { CommandHandler, EventBus, type ICommandHandler } from '@nestjs/cqrs';
import type { TenantResponse } from '@planici/schemas';
import { TenantRenamedEvent } from '../../domain/events/tenant.events.js';
import { TenantName } from '../../domain/value-objects/tenant-name.vo.js';
import {
  TENANT_REPOSITORY,
  type TenantRepository,
} from '../../ports/repositories/tenant.repository.js';
import { UpdateTenantCommand } from './update-tenant.command.js';

@CommandHandler(UpdateTenantCommand)
export class UpdateTenantHandler implements ICommandHandler<UpdateTenantCommand> {
  constructor(
    @Inject(TENANT_REPOSITORY) private readonly tenants: TenantRepository,
    private readonly events: EventBus,
  ) {}

  async execute(command: UpdateTenantCommand): Promise<TenantResponse> {
    const { membership } = command;
    membership.assertCanManage();

    const name = TenantName.create(command.payload.name);
    if (name.value === membership.tenant.name) return membership.toPublic();

    const tenant = await this.tenants.rename(membership.tenant.id, name.value);

    this.events.publish(new TenantRenamedEvent(tenant.id, tenant.name));

    return tenant.toPublic(membership.role);
  }
}
