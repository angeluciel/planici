CREATE TABLE "services" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"form_record_id" uuid NOT NULL,
	"name" text NOT NULL,
	"name_key" text NOT NULL,
	"duration_minutes" integer NOT NULL,
	"price_cents" integer NOT NULL,
	"currency" text DEFAULT 'BRL' NOT NULL,
	"status" "record_status" DEFAULT 'active' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "services_form_record_id_unique" UNIQUE("form_record_id"),
	CONSTRAINT "ck_services_status" CHECK ("services"."status" in ('active','suspended')),
	CONSTRAINT "ck_services_duration" CHECK ("services"."duration_minutes" between 5 and 1440),
	CONSTRAINT "ck_services_price" CHECK ("services"."price_cents" between 0 and 99999999),
	CONSTRAINT "ck_services_currency" CHECK ("services"."currency" = 'BRL')
);
--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "services" ADD CONSTRAINT "services_form_record_id_form_records_id_fk" FOREIGN KEY ("form_record_id") REFERENCES "public"."form_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE UNIQUE INDEX "idx_services_tenant_name_key" ON "services" USING btree ("tenant_id","name_key");--> statement-breakpoint
CREATE INDEX "idx_services_tenant_status_name" ON "services" USING btree ("tenant_id","status","name_key","id");