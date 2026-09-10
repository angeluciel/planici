import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { AvailabilityResponse } from '@planici/schemas';
import { Email } from '@/modules/auth/domain/value-objects/email.vo.js';
import { Slug } from '@/modules/auth/domain/value-objects/slug.vo.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../repositories/user.repository.js';
import { CheckAvailabilityQuery } from './check-availability.query.js';

/**
 * hint "already in use" from the register form
 * */
@QueryHandler(CheckAvailabilityQuery)
export class CheckAvailabilityHandler implements IQueryHandler<CheckAvailabilityQuery> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(query: CheckAvailabilityQuery): Promise<AvailabilityResponse> {
    const taken =
      query.field === 'email'
        ? await this.users.emailExists(Email.create(query.value).value)
        : await this.users.slugExists(Slug.create(query.value).value);

    return { available: !taken };
  }
}
