import type { CreateTenantRequestInput } from '@planici/schemas';

export class CreateTenantCommand {
  constructor(
    readonly userId: string,
    readonly payload: CreateTenantRequestInput,
  ) {}
}
