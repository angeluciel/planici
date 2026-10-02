import { Module } from '@nestjs/common';
import { CqrsModule } from '@nestjs/cqrs';
import { JwtModule } from '@nestjs/jwt';
import { AuthModule } from '@modules/auth/auth.module.js';
import { CreateTenantHandler } from './commands/create-tenant/create-tenant.handler.js';
import { CreateTenantHttpController } from './commands/create-tenant/create-tenant.http.controller.js';
import { UpdateTenantHandler } from './commands/update-tenant/update-tenant.handler.js';
import { UpdateTenantHttpController } from './commands/update-tenant/update-tenant.http.controller.js';
import { ActiveTenantGuard } from './http/active-tenant.guard.js';
import { DrizzleTenantRepository } from './infrastructure/persistence/tenant.drizzle.repository.js';
import { TenantScope } from './infrastructure/persistence/tenant-scope.js';
import { TENANT_REPOSITORY } from './ports/repositories/tenant.repository.js';
import { CheckTenantSlugHandler } from './queries/check-tenant-slug/check-tenant-slug.handler.js';
import { CheckTenantSlugHttpController } from './queries/check-tenant-slug/check-tenant-slug.http.controller.js';
import { GetTenantHandler } from './queries/get-tenant/get-tenant.handler.js';
import { GetTenantHttpController } from './queries/get-tenant/get-tenant.http.controller.js';
import { ListMyTenantsHandler } from './queries/list-my-tenants/list-my-tenants.handler.js';
import { ListMyTenantsHttpController } from './queries/list-my-tenants/list-my-tenants.http.controller.js';

const commandHandlers = [CreateTenantHandler, UpdateTenantHandler];

const queryHandlers = [
  ListMyTenantsHandler,
  GetTenantHandler,
  CheckTenantSlugHandler,
];

const adapters = [
  { provide: TENANT_REPOSITORY, useClass: DrizzleTenantRepository },
];

const httpControllers = [
  CheckTenantSlugHttpController,
  ListMyTenantsHttpController,
  CreateTenantHttpController,
  GetTenantHttpController,
  UpdateTenantHttpController,
];

@Module({
  imports: [CqrsModule, JwtModule.register({}), AuthModule],
  controllers: [...httpControllers],
  providers: [
    ...commandHandlers,
    ...queryHandlers,
    ...adapters,
    ActiveTenantGuard,
    TenantScope,
  ],
  exports: [TENANT_REPOSITORY, ActiveTenantGuard, TenantScope],
})
export class TenantsModule {}
