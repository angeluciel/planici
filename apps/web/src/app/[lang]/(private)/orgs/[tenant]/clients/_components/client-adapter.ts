"use client";

import type {
	ClientCreateRequestInput,
	ClientUpdateRequestInput,
} from "@planici/schemas";
import {
	ClientEmailSchema,
	ClientNameSchema,
	ClientPhoneSchema,
} from "@planici/schemas";
import { useParams } from "next/navigation";
import { useMemo, useRef } from "react";
import {
	type ClientResult,
	createClient,
	getClient,
	updateClient,
} from "@/lib/api/clients";
import { maskPhone } from "../../_components/records/masks";
import type {
	RecordAdapter,
	RecordResult,
} from "../../_components/records/record-adapter";
import {
	ClientEmailInput,
	ClientNameInput,
	ClientPhoneInput,
} from "./client-system-inputs";

const asRecord = (result: ClientResult): RecordResult =>
	result.ok ? { ok: true, record: result.client } : result;

// What the shared record components need to run the client entity (SPEC-0004
// §7, Adapter). `onConsentOutdated` is the new-client page's reaction to a 409
// `consentText.outdated`; the edit and view pages pass none.
export function useClientAdapter(
	options: { onConsentOutdated?: () => void } = {},
): RecordAdapter {
	const { tenant } = useParams<{ tenant: string }>();
	const outdated = useRef(options.onConsentOutdated);
	outdated.current = options.onConsentOutdated;

	return useMemo<RecordAdapter>(() => {
		const base = `/orgs/${tenant}/clients`;
		return {
			entity: "clients",
			type: "client",
			create: async (body) =>
				asRecord(await createClient(body as ClientCreateRequestInput)),
			update: async (id, body) =>
				asRecord(await updateClient(id, body as ClientUpdateRequestInput)),
			read: async (id) => asRecord(await getClient(id)),
			viewHref: (id) => `${base}/${id}`,
			editHref: (id) => `${base}/${id}/edit`,
			listHref: base,
			systemFields: {
				"client.name": {
					attribute: "name",
					input: ClientNameInput,
					schema: ClientNameSchema,
					format: (value) => String(value),
				},
				"client.email": {
					attribute: "email",
					input: ClientEmailInput,
					schema: ClientEmailSchema,
					format: (value) => String(value),
				},
				"client.phone": {
					attribute: "phone",
					input: ClientPhoneInput,
					schema: ClientPhoneSchema,
					format: (value) => maskPhone(String(value)),
				},
			},
			onSaveError: (error) => {
				if (error.error !== "consentText.outdated" || !outdated.current) {
					return false;
				}
				outdated.current();
				return true;
			},
		};
	}, [tenant]);
}
