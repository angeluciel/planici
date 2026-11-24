import { pgEnum } from 'drizzle-orm/pg-core';

/** Mirrors `docs/schema.dbml`. */
export const recordStatus = pgEnum('record_status', [
  'active',
  'suspended',
  'deleted',
]);

export const tenantPlan = pgEnum('tenant_plan', ['free', 'pro', 'enterprise']);

/** Identity providers a user can sign in with (RF-01/RF-02). */
export const authProvider = pgEnum('auth_provider', ['email', 'google']);

/** Documents a user can accept, versioned for RNF-12. */
export const consentDocument = pgEnum('consent_document', [
  'terms_of_service',
  'privacy_policy',
  'marketing',
]);

/** Template types (SPEC-0001 R2). */
export const formType = pgEnum('form_type', ['client', 'service']);

/** Template status (SPEC-0001 R7). */
export const formStatus = pgEnum('form_status', ['active', 'archived']);

/** Field-type catalog (SPEC-0002 §3.1) plus the system-only duration and money. */
export const fieldType = pgEnum('field_type', [
  'text',
  'long_text',
  'number',
  'date',
  'yes_no',
  'select',
  'email',
  'phone',
  'cpf',
  'full_name',
  'address',
  'duration',
  'money',
]);
