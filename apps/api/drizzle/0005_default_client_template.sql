-- SPEC-0004 R11: every tenant has a client template "Cliente" with only the
-- client system fields of SPEC-0001 §3.2. The rows are the ones POST /v1/forms
-- stores for a client template (forms, form_versions, form_fields and
-- form_version_fields, version 1, revision 1, no help text, nothing sensitive).
CREATE FUNCTION planici_seed_client_template(tenant text) RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
	v_form_id uuid := gen_random_uuid();
	v_version_id uuid := gen_random_uuid();
	v_name_id uuid := gen_random_uuid();
	v_email_id uuid := gen_random_uuid();
	v_phone_id uuid := gen_random_uuid();
BEGIN
	-- a tenant with any client template (active or archived), or with a template
	-- that already took the name "cliente", is left alone (R11, G-3)
	IF EXISTS (
		SELECT 1 FROM forms f
		WHERE f.tenant_id = tenant AND (f.type = 'client' OR f.name_key = 'cliente')
	) THEN
		RETURN;
	END IF;

	INSERT INTO forms (id, tenant_id, type, name, name_key, description, status, latest_version, revision)
	VALUES (v_form_id, tenant, 'client', 'Cliente', 'cliente', NULL, 'active', 1, 1);

	INSERT INTO form_fields (id, tenant_id, form_id, type, system_key, label, help_text, sensitive)
	VALUES
		(v_name_id, tenant, v_form_id, 'full_name', 'client.name', 'Nome completo', NULL, false),
		(v_email_id, tenant, v_form_id, 'email', 'client.email', 'E-mail', NULL, false),
		(v_phone_id, tenant, v_form_id, 'phone', 'client.phone', 'Telefone', NULL, false);

	INSERT INTO form_versions (id, tenant_id, form_id, number)
	VALUES (v_version_id, tenant, v_form_id, 1);

	INSERT INTO form_version_fields (version_id, field_id, tenant_id, position, required)
	VALUES
		(v_version_id, v_name_id, tenant, 0, true),
		(v_version_id, v_email_id, tenant, 1, true),
		(v_version_id, v_phone_id, tenant, 2, false);
END;
$$;
--> statement-breakpoint
CREATE FUNCTION planici_backfill_client_templates() RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
	t record;
BEGIN
	FOR t IN SELECT id FROM tenants LOOP
		PERFORM planici_seed_client_template(t.id);
	END LOOP;
END;
$$;
--> statement-breakpoint
SELECT planici_backfill_client_templates();
