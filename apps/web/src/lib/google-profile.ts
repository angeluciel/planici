import { z } from "zod";
import type { GoogleProfile } from "@/types/register";

const ClaimsSchema = z.object({
	email: z.email(),
	email_verified: z.literal(true),
	given_name: z.string().optional(),
	family_name: z.string().optional(),
	exp: z.number().int().positive(),
	aud: z.string(),
});

export function googleProfile(
	idToken: string,
	clientId: string,
): GoogleProfile | null {
	try {
		const parts = idToken.split(".");
		if (parts.length !== 3) return null;
		const base64 = parts[1].replaceAll(/-/, "+").replaceAll(/_/, "/");
		const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
		const claims = ClaimsSchema.parse(
			JSON.parse(new TextDecoder().decode(bytes)),
		);

		if (claims.aud !== clientId || claims.exp * 1000 <= Date.now()) return null;
		return {
			email: claims.email.toLowerCase(),
			name: claims.given_name ?? "",
			surname: claims.family_name ?? "",
			idToken,
			expiresAt: new Date(claims.exp * 1000).toISOString(),
		};
	} catch {
		return null;
	}
}
