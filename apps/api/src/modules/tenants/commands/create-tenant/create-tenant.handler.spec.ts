import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { EventBus } from '@nestjs/cqrs';
import { TenantSlugTakenError } from '../../domain/errors/tenant.errors.js';
import { TenantCreatedEvent } from '../../domain/events/tenant.events.js';
import { Tenant } from '../../domain/tenant.entity.js';
import type { TenantRepository } from '../../ports/repositories/tenant.repository.js';
import { CreateTenantCommand } from './create-tenant.command.js';
import { CreateTenantHandler } from './create-tenant.handler.js';

const createdAt = new Date('2026-09-01T12:00:00.000Z');

const tenant = Tenant.fromProps({
  id: '0f8c4b1e-6a47-4c4f-9a39-3f1f2b2f5a10',
  name: 'Studio Ana',
  slug: 'studio-ana',
  status: 'active',
  plan: 'free',
  trialStartedAt: null,
  createdAt,
  updatedAt: createdAt,
});

describe('CreateTenantHandler', () => {
  let tenants: TenantRepository;
  let events: EventBus;
  let handler: CreateTenantHandler;

  beforeEach(() => {
    tenants = {
      slugExists: vi.fn().mockResolvedValue(false),
      createWithOwner: vi.fn().mockResolvedValue(tenant),
    } as unknown as TenantRepository;

    events = { publish: vi.fn() } as unknown as EventBus;

    handler = new CreateTenantHandler(tenants, events);
  });

  it('creates the tenant with the caller as owner', async () => {
    const result = await handler.execute(
      new CreateTenantCommand('user-1', {
        name: '  Studio   Ana ',
        slug: 'Studio-Ana',
      }),
    );

    expect(tenants.createWithOwner).toHaveBeenCalledWith(
      { name: 'Studio Ana', slug: 'studio-ana' },
      'user-1',
    );
    expect(result).toEqual({
      id: tenant.id,
      name: 'Studio Ana',
      slug: 'studio-ana',
      status: 'active',
      plan: 'free',
      role: 'owner',
      trialStartedAt: null,
      createdAt: createdAt.toISOString(),
    });
    expect(events.publish).toHaveBeenCalledWith(expect.any(TenantCreatedEvent));
  });

  it('rejects a slug that is already taken', async () => {
    vi.mocked(tenants.slugExists).mockResolvedValue(true);

    await expect(
      handler.execute(
        new CreateTenantCommand('user-1', { name: 'Studio', slug: 'taken' }),
      ),
    ).rejects.toBeInstanceOf(TenantSlugTakenError);

    expect(tenants.createWithOwner).not.toHaveBeenCalled();
    expect(events.publish).not.toHaveBeenCalled();
  });
});
