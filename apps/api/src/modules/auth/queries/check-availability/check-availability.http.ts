import { Controller, Get, Query } from '@nestjs/common';
import { QueryBus } from '@nestjs/cqrs';
import { ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import {
  AvailabilityQuerySchema,
  AvailabilityResponse,
} from '@planici/schemas';
import { routesV1 } from '@src/config/app.routes.js';
import { ZodBody } from '@src/shared/http/zod-validation.pipe.js';
import { CheckAvailabilityQuery } from './check-availability.query.js';

@ApiTags(routesV1.auth.root)
@Controller({
  path: routesV1.auth.root,
  version: '1',
})
export class CheckAvailabilityHttpController {
  constructor(private readonly queries: QueryBus) {}

  @Get('availability')
  @Throttle({ default: { limit: 20, ttl: 60_000 } })
  availability(
    @Query({
      schema: AvailabilityQuerySchema,
      pipes: [new ZodBody(AvailabilityQuerySchema)],
    })
    query: {
      email?: string;
      slug?: string;
    },
  ): Promise<AvailabilityResponse> {
    const [field, value] = query.email
      ? (['email', query.email] as const)
      : (['slug', query.slug as string] as const);

    return this.queries.execute(new CheckAvailabilityQuery(field, value));
  }
}
