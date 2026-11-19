CREATE TABLE "clients" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"form_record_id" uuid NOT NULL,
	"name" text NOT NULL,
	"name_key" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"consent_attested_by" uuid NOT NULL,
	"consent_attested_at" timestamp with time zone NOT NULL,
	"consent_text_version" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "clients_form_record_id_unique" UNIQUE("form_record_id"),
	CONSTRAINT "clients_status_check" CHECK ("clients"."status" in ('active','suspended'))
);
--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_form_record_id_form_records_id_fk" FOREIGN KEY ("form_record_id") REFERENCES "public"."form_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "clients" ADD CONSTRAINT "clients_consent_attested_by_users_id_fk" FOREIGN KEY ("consent_attested_by") REFERENCES "public"."users"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_clients_tenant_email" ON "clients" USING btree ("tenant_id","email");--> statement-breakpoint
CREATE INDEX "idx_clients_tenant_status_name" ON "clients" USING btree ("tenant_id","status","name_key","id");