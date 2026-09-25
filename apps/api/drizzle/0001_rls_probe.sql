CREATE TABLE "_rls_probe" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" uuid NOT NULL,
	"label" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "_rls_probe" ENABLE ROW LEVEL SECURITY;--> statement-breakpoint
ALTER TABLE "_rls_probe" ADD CONSTRAINT "_rls_probe_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_rls_probe_tenant_id" ON "_rls_probe" USING btree ("tenant_id");--> statement-breakpoint
CREATE POLICY "_rls_probe_tenant_isolation" ON "_rls_probe" AS PERMISSIVE FOR ALL TO public USING (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid) WITH CHECK (tenant_id = nullif(current_setting('app.current_tenant', true), '')::uuid);--> statement-breakpoint
-- Not emitted by drizzle-kit (no schema-level API for it as of drizzle-kit 0.31).
-- Required so RLS also applies to the table owner/migration role (AC6): without
-- FORCE, a connection using the owner role bypasses RLS even though the policy
-- exists. Every future tenant-scoped-table migration must hand-append this line.
ALTER TABLE "_rls_probe" FORCE ROW LEVEL SECURITY;