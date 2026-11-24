import { z } from "zod";
import { RecordBaseSchema } from "../records/index.js";
import { CLIENT_STATUSES } from "./requests.js";

// Responses of SPEC-0004 §7. No summary field can carry a custom value
// (SPEC-0003 R9).

export const ClientStatusSchema = z.enum(CLIENT_STATUSES);

export const ClientConsentAttestationSchema = z.object({
	// the user id of the professional who attested
	attestedBy: z.string(),
	attestedAt: z.iso.datetime(),
	textVersion: z.string(),
});

export const ClientSchema = RecordBaseSchema.extend({
	id: z.string(),
	name: z.string(),
	email: z.string(),
	phone: z.string().nullable(),
	status: ClientStatusSchema,
	hasHistory: z.boolean(),
	consentAttestation: ClientConsentAttestationSchema,
});

export const ClientSummarySchema = z.object({
	id: z.string(),
	name: z.string(),
	email: z.string(),
	phone: z.string().nullable(),
	formId: z.string(),
	formName: z.string(),
	status: ClientStatusSchema,
	// SPEC-0006 R9: the client's last update time
	updatedAt: z.iso.datetime(),
});

export const ClientListResponseSchema = z.object({
	clients: z.array(ClientSummarySchema),
	nextCursor: z.string().nullable(),
	// SPEC-0006 R3: matching clients, regardless of limit and after
	total: z.number().int().nonnegative(),
});

// GET /api/clients/consent (web BFF): the deployed attestation text and its
// version (R12; plan Decision 5)
export const ClientConsentTextSchema = z.object({
	version: z.string().min(1),
	text: z.string().min(1),
});

export type ClientConsentText = z.infer<typeof ClientConsentTextSchema>;
export type ClientConsentAttestation = z.infer<typeof ClientConsentAttestationSchema>;
export type ClientResponse = z.infer<typeof ClientSchema>;
export type ClientSummary = z.infer<typeof ClientSummarySchema>;
export type ClientListResponse = z.infer<typeof ClientListResponseSchema>;
