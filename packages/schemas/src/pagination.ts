import { z } from "zod";

// Cursor pagination of api-convention.md, "Pagination". Shared by every list
// that can grow without bound (SPEC-0004 clients, SPEC-0005 and later).

export const LIMIT_MIN = 1;
export const LIMIT_MAX = 100;
export const LIMIT_DEFAULT = 50;

// `limit` arrives as a query string: a canonical integer from 1 to 100
export const LimitQuerySchema = z
	.string({ error: "limit.invalid" })
	.regex(/^[1-9]\d{0,2}$/, { error: "limit.invalid" })
	.transform(Number)
	.pipe(z.number().min(LIMIT_MIN, { error: "limit.invalid" }).max(LIMIT_MAX, { error: "limit.invalid" }))
	.optional()
	.default(LIMIT_DEFAULT);

// `after` is opaque to the contract: only the API that issued it decodes it
export const CursorQuerySchema = z.string({ error: "cursor.invalid" }).min(1, { error: "cursor.invalid" }).optional();

export type LimitQueryData = z.output<typeof LimitQuerySchema>;
export type CursorQueryData = z.output<typeof CursorQuerySchema>;
