-- SPEC-0005 R10: every tenant has a service template "Serviço" with only the
-- service system fields of SPEC-0001 §3.2. The rows are the ones POST /v1/forms
-- stores for a service template (forms, form_versions, form_fields and
-- form_version_fields, version 1, revision 1, no help text, nothing sensitive).
CREATE FUNCTION planici_seed_service_template(tenant text) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
	v_form_id uuid := gen_random_uuid();
	v_version_id uuid := gen_random_uuid();
	v_name_id uuid := gen_random_uuid();
	v_duration_id uuid := gen_random_uuid();
	v_price_id uuid := gen_random_uuid();
BEGIN
	-- a tenant with any service template (active or archived), with a template
	-- of any type that already took the name "servico", or with 200 templates
	-- already (SPEC-0001 R19) is left alone (R10, G-5)
	IF EXISTS (
		SELECT 1 FROM forms f
		WHERE f.tenant_id = tenant AND (f.type = 'service' OR f.name_key = 'servico')
	) OR (SELECT count(*) FROM forms f WHERE f.tenant_id = tenant) >= 200 THEN
		RETURN;
	END IF;

	INSERT INTO forms (id, tenant_id, type, name, name_key, description, status, latest_version, revision)
	VALUES (v_form_id, tenant, 'service', 'Serviço', 'servico', NULL, 'active', 1, 1);

	INSERT INTO form_fields (id, tenant_id, form_id, type, system_key, label, help_text, sensitive)
	VALUES
		(v_name_id, tenant, v_form_id, 'text', 'service.name', 'Nome', NULL, false),
		(v_duration_id, tenant, v_form_id, 'duration', 'service.duration', 'Duração', NULL, false),
		(v_price_id, tenant, v_form_id, 'money', 'service.price', 'Preço', NULL, false);

	INSERT INTO form_versions (id, tenant_id, form_id, number)
	VALUES (v_version_id, tenant, v_form_id, 1);

	INSERT INTO form_version_fields (version_id, field_id, tenant_id, position, required)
	VALUES
		(v_version_id, v_name_id, tenant, 0, true),
		(v_version_id, v_duration_id, tenant, 1, true),
		(v_version_id, v_price_id, tenant, 2, true);
END;
$$;
--> statement-breakpoint
CREATE FUNCTION planici_backfill_service_templates() RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
	t record;
BEGIN
	FOR t IN SELECT id FROM tenants LOOP
		PERFORM planici_seed_service_template(t.id);
	END LOOP;
END;
$$;
--> statement-breakpoint
SELECT planici_backfill_service_templates();
