import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { MeResponse } from '@planici/schemas';
import { InvalidTokenError } from '@/modules/auth/domain/errors/auth.errors.js';
import {
  USER_REPOSITORY,
  type UserRepository,
} from '../../repositories/user.repository.js';
import { GetCurrentUserQuery } from './get-current-user.query.js';

@QueryHandler(GetCurrentUserQuery)
export class GetCurrentUserHandler implements IQueryHandler<GetCurrentUserQuery> {
  constructor(
    @Inject(USER_REPOSITORY) private readonly users: UserRepository,
  ) {}

  async execute(query: GetCurrentUserQuery): Promise<MeResponse> {
    const user = await this.users.findById(query.userId);

    // the token verified, bbut account is gone/suspended
    if (!user) throw new InvalidTokenError();

    user.assertCanAuthenticate();

    return user.toPublic();
  }
}
