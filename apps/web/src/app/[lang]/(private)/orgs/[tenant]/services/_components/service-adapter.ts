"use client";

import {
	SERVICE_CURRENCY,
	type ServiceCreateRequestInput,
	ServiceDurationSchema,
	ServiceNameSchema,
	ServicePriceCentsSchema,
	type ServiceUpdateRequestInput,
} from "@planici/schemas";
import { useParams } from "next/navigation";
import { useMemo } from "react";
import { z } from "zod";
import {
	createService,
	getService,
	type ServiceResult,
	updateService,
} from "@/lib/api/services";
import { formatDuration, parseDuration } from "@/lib/services/duration";
import { formatPrice, parsePriceMask } from "@/lib/services/price";
import type {
	RecordAdapter,
	RecordResult,
} from "../../_components/records/record-adapter";
import {
	ServiceDurationInput,
	ServiceNameInput,
	ServicePriceInput,
} from "./service-system-inputs";

const asRecord = (result: ServiceResult): RecordResult =>
	result.ok ? { ok: true, record: result.service } : result;

// The typed duration is text ("1h 30"); a stored one arrives as minutes (the
// edit page's draft, R13). Unreadable text is out of range for the schema.
const DurationTyped = z.unknown().transform((raw, ctx) => {
	const minutes = typeof raw === "string" ? parseDuration(raw) : raw;
	const parsed = ServiceDurationSchema.safeParse(
		raw === null || raw === undefined ? undefined : (minutes ?? Number.NaN),
	);
	if (parsed.success) return parsed.data;
	ctx.issues.push({
		code: "custom",
		message: parsed.error.issues[0]?.message ?? "serviceDuration.invalid",
		input: raw,
	});
	return z.NEVER;
});

// The typed price is the mask "150,00"; a stored one arrives as centavos.
const PriceTyped = z.unknown().transform((raw, ctx) => {
	const cents = typeof raw === "string" ? parsePriceMask(raw) : raw;
	const parsed = ServicePriceCentsSchema.safeParse(
		raw === null || raw === undefined ? undefined : (cents ?? Number.NaN),
	);
	if (parsed.success) return parsed.data;
	ctx.issues.push({
		code: "custom",
		message:
			typeof raw === "string" && cents === null
				? "servicePrice.invalid"
				: (parsed.error.issues[0]?.message ?? "servicePrice.invalid"),
		input: raw,
	});
	return z.NEVER;
});

// What the shared record components need to run the service entity (SPEC-0005
// §11, Web). `currency` is added to every request (R5).
export function useServiceAdapter(): RecordAdapter {
	const { tenant } = useParams<{ tenant: string }>();

	return useMemo<RecordAdapter>(() => {
		const base = `/orgs/${tenant}/services`;
		const withCurrency = <T extends Record<string, unknown>>(body: T) => ({
			...body,
			currency: SERVICE_CURRENCY,
		});
		return {
			entity: "services",
			type: "service",
			create: async (body) =>
				asRecord(
					await createService(
						withCurrency(body) as unknown as ServiceCreateRequestInput,
					),
				),
			update: async (id, body) =>
				asRecord(
					await updateService(
						id,
						withCurrency(body) as unknown as ServiceUpdateRequestInput,
					),
				),
			read: async (id) => asRecord(await getService(id)),
			viewHref: (id) => `${base}/${id}`,
			editHref: (id) => `${base}/${id}/edit`,
			listHref: base,
			titleField: "service.name",
			systemFields: {
				"service.name": {
					attribute: "name",
					input: ServiceNameInput,
					schema: ServiceNameSchema,
					format: (value) => String(value),
				},
				"service.duration": {
					attribute: "durationMinutes",
					input: ServiceDurationInput,
					schema: DurationTyped,
					format: (value) => formatDuration(Number(value)),
				},
				"service.price": {
					attribute: "priceCents",
					input: ServicePriceInput,
					schema: PriceTyped,
					format: (value) => formatPrice(Number(value)),
				},
			},
		};
	}, [tenant]);
}
