import { Inject } from '@nestjs/common';
import { type IQueryHandler, QueryHandler } from '@nestjs/cqrs';
import type { ServiceTemplateSummary } from '@planici/schemas';
import {
  SERVICE_REPOSITORY,
  type ServiceRepository,
} from '../../ports/service.repository.js';
import { GetServiceTemplateSummaryQuery } from './get-service-template-summary.query.js';

@QueryHandler(GetServiceTemplateSummaryQuery)
export class GetServiceTemplateSummaryHandler implements IQueryHandler<GetServiceTemplateSummaryQuery> {
  constructor(
    @Inject(SERVICE_REPOSITORY) private readonly services: ServiceRepository,
  ) {}

  execute(
    query: GetServiceTemplateSummaryQuery,
  ): Promise<ServiceTemplateSummary> {
    query.membership.assertCanManage();

    return this.services.templateSummary(query.membership.tenant.id);
  }
}
