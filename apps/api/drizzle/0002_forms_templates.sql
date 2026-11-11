CREATE TYPE "public"."field_type" AS ENUM('text', 'long_text', 'number', 'date', 'yes_no', 'select', 'email', 'phone', 'cpf', 'full_name', 'address', 'duration', 'money');--> statement-breakpoint
CREATE TYPE "public"."form_status" AS ENUM('active', 'archived');--> statement-breakpoint
CREATE TYPE "public"."form_type" AS ENUM('client', 'service');--> statement-breakpoint
CREATE TABLE "form_record_values" (
	"form_record_id" uuid NOT NULL,
	"field_id" uuid NOT NULL,
	"tenant_id" text NOT NULL,
	"key_version" smallint NOT NULL,
	"value_ciphertext" "bytea" NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "form_record_values_pkey" PRIMARY KEY("form_record_id","field_id"),
	CONSTRAINT "form_record_values_key_version_check" CHECK ("form_record_values"."key_version" >= 1)
);
--> statement-breakpoint
CREATE TABLE "form_records" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"form_id" uuid NOT NULL,
	"form_version_id" uuid NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_field_options" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"field_id" uuid NOT NULL,
	"label" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_fields" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"form_id" uuid NOT NULL,
	"type" "field_type" NOT NULL,
	"system_key" text,
	"label" text NOT NULL,
	"help_text" text,
	"sensitive" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "form_version_field_options" (
	"version_id" uuid NOT NULL,
	"option_id" uuid NOT NULL,
	"field_id" uuid NOT NULL,
	"tenant_id" text NOT NULL,
	"position" integer NOT NULL,
	CONSTRAINT "form_version_field_options_pkey" PRIMARY KEY("version_id","option_id"),
	CONSTRAINT "idx_form_version_field_options_position" UNIQUE("version_id","field_id","position")
);
--> statement-breakpoint
CREATE TABLE "form_version_fields" (
	"version_id" uuid NOT NULL,
	"field_id" uuid NOT NULL,
	"tenant_id" text NOT NULL,
	"position" integer NOT NULL,
	"required" boolean DEFAULT false NOT NULL,
	CONSTRAINT "form_version_fields_pkey" PRIMARY KEY("version_id","field_id"),
	CONSTRAINT "idx_form_version_fields_position" UNIQUE("version_id","position")
);
--> statement-breakpoint
CREATE TABLE "form_versions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"form_id" uuid NOT NULL,
	"number" integer NOT NULL,
	"published_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "forms" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tenant_id" text NOT NULL,
	"type" "form_type" NOT NULL,
	"name" text NOT NULL,
	"name_key" text NOT NULL,
	"description" text,
	"status" "form_status" DEFAULT 'active' NOT NULL,
	"latest_version" integer NOT NULL,
	"revision" integer DEFAULT 1 NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "forms_latest_version_check" CHECK ("forms"."latest_version" >= 1),
	CONSTRAINT "forms_revision_check" CHECK ("forms"."revision" >= 1)
);
--> statement-breakpoint
ALTER TABLE "form_record_values" ADD CONSTRAINT "form_record_values_form_record_id_form_records_id_fk" FOREIGN KEY ("form_record_id") REFERENCES "public"."form_records"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_record_values" ADD CONSTRAINT "form_record_values_field_id_form_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."form_fields"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_record_values" ADD CONSTRAINT "form_record_values_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_records" ADD CONSTRAINT "form_records_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_records" ADD CONSTRAINT "form_records_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_records" ADD CONSTRAINT "form_records_form_version_id_form_versions_id_fk" FOREIGN KEY ("form_version_id") REFERENCES "public"."form_versions"("id") ON DELETE restrict ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_field_options" ADD CONSTRAINT "form_field_options_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_field_options" ADD CONSTRAINT "form_field_options_field_id_form_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."form_fields"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_fields" ADD CONSTRAINT "form_fields_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_version_field_options" ADD CONSTRAINT "form_version_field_options_version_id_form_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."form_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_version_field_options" ADD CONSTRAINT "form_version_field_options_option_id_form_field_options_id_fk" FOREIGN KEY ("option_id") REFERENCES "public"."form_field_options"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_version_field_options" ADD CONSTRAINT "form_version_field_options_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_version_fields" ADD CONSTRAINT "form_version_fields_version_id_form_versions_id_fk" FOREIGN KEY ("version_id") REFERENCES "public"."form_versions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_version_fields" ADD CONSTRAINT "form_version_fields_field_id_form_fields_id_fk" FOREIGN KEY ("field_id") REFERENCES "public"."form_fields"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_version_fields" ADD CONSTRAINT "form_version_fields_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_versions" ADD CONSTRAINT "form_versions_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "form_versions" ADD CONSTRAINT "form_versions_form_id_forms_id_fk" FOREIGN KEY ("form_id") REFERENCES "public"."forms"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "forms" ADD CONSTRAINT "forms_tenant_id_tenants_id_fk" FOREIGN KEY ("tenant_id") REFERENCES "public"."tenants"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "idx_form_record_values_field_id" ON "form_record_values" USING btree ("field_id");--> statement-breakpoint
CREATE INDEX "idx_form_record_values_tenant_id" ON "form_record_values" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_form_records_tenant_form" ON "form_records" USING btree ("tenant_id","form_id");--> statement-breakpoint
CREATE INDEX "idx_form_records_version" ON "form_records" USING btree ("form_version_id");--> statement-breakpoint
CREATE INDEX "idx_form_field_options_field_id" ON "form_field_options" USING btree ("field_id");--> statement-breakpoint
CREATE INDEX "idx_form_field_options_tenant_id" ON "form_field_options" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_form_fields_form_system_key" ON "form_fields" USING btree ("form_id","system_key") WHERE "form_fields"."system_key" is not null;--> statement-breakpoint
CREATE INDEX "idx_form_fields_form_id" ON "form_fields" USING btree ("form_id");--> statement-breakpoint
CREATE INDEX "idx_form_fields_tenant_id" ON "form_fields" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_form_version_field_options_tenant_id" ON "form_version_field_options" USING btree ("tenant_id");--> statement-breakpoint
CREATE INDEX "idx_form_version_fields_tenant_id" ON "form_version_fields" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_form_versions_form_number" ON "form_versions" USING btree ("form_id","number");--> statement-breakpoint
CREATE INDEX "idx_form_versions_tenant_id" ON "form_versions" USING btree ("tenant_id");--> statement-breakpoint
CREATE UNIQUE INDEX "idx_forms_tenant_name_key" ON "forms" USING btree ("tenant_id","name_key");--> statement-breakpoint
CREATE INDEX "idx_forms_tenant_type_status" ON "forms" USING btree ("tenant_id","type","status");