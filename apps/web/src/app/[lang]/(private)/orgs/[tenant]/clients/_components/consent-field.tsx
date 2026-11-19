"use client";

import { ClientConsentCreateSchema } from "@planici/schemas";
import { useTranslations } from "next-intl";
import { useCallback, useMemo, useRef, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import { getConsentText } from "@/lib/api/clients";
import type { ExtraFields } from "../../_components/records/use-record-form";

export type Consent = { text: string; version: string };

// The consent checkbox of a new client (SPEC-0004 R12, §4.3), above [Salvar].
// `onConsentOutdated` is for `useClientAdapter`: it reloads the current text,
// unchecks the box, takes the new version and shows the banner.
export function useConsentField(initial: Consent) {
	const t = useTranslations("clients");
	const [consent, setConsent] = useState(initial);
	const [outdated, setOutdated] = useState(false);
	// the `onChange` of the last render: how the page sets the box and the version
	const change = useRef<((name: string, value: unknown) => void) | null>(null);
	const latest = useRef(consent);
	latest.current = consent;

	const onConsentOutdated = useCallback(() => {
		void (async () => {
			const result = await getConsentText();
			// the text stays as it is if it cannot be read: the box is still unchecked
			const next = result.ok
				? { text: result.text, version: result.version }
				: latest.current;
			setConsent(next);
			setOutdated(true);
			change.current?.("consentAttested", false);
			change.current?.("consentTextVersion", next.version);
		})();
	}, []);

	// `initial` is read when the form loads; the text then follows the state
	const first = useRef(initial.version);
	const extraFields = useMemo<ExtraFields>(
		() => ({
			initial: { consentAttested: false, consentTextVersion: first.current },
			schema: ClientConsentCreateSchema,
			render: ({ values, onChange, error, idFor, disabled }) => {
				change.current = onChange;
				return (
					<div className="flex flex-col gap-3">
						{outdated && <Alert tone="info">{t("form.consentOutdated")}</Alert>}
						<Checkbox
							id={idFor("consentAttested")}
							label={consent.text}
							checked={values.consentAttested === true}
							status={error("consentAttested") ? "error" : "default"}
							help={error("consentAttested")}
							disabled={disabled}
							onChange={(event) =>
								onChange("consentAttested", event.target.checked)
							}
						/>
					</div>
				);
			},
		}),
		[consent.text, outdated, t],
	);

	return { extraFields, onConsentOutdated };
}
