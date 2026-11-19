"use client";

import { useParams, useSearchParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { useRouter } from "@/i18n/navigation";
import { getConsentText } from "@/lib/api/clients";
import { RecordForm } from "../../_components/records/record-form";
import { useClientAdapter } from "./client-adapter";
import { type Consent, useConsentField } from "./consent-field";

const PAGE = "mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-6";

type Load =
	| { status: "loading" }
	| { status: "error" }
	| { status: "ready"; consent: Consent };

// /clients/new?form=<id>: the fill-in page of a new client (SPEC-0004 §4.3).
// Without `form` there is nothing to fill in: back to the list.
export function NewClientPage() {
	const formId = useSearchParams().get("form");
	const { tenant } = useParams<{ tenant: string }>();
	const router = useRouter();
	const t = useTranslations("clients");
	const [load, setLoad] = useState<Load>({ status: "loading" });
	const [attempt, setAttempt] = useState(0);

	useEffect(() => {
		if (!formId) router.replace(`/orgs/${tenant}/clients`);
	}, [formId, router, tenant]);

	// biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` re-runs the load on retry
	useEffect(() => {
		let live = true;
		setLoad({ status: "loading" });
		void getConsentText().then((result) => {
			if (!live) return;
			setLoad(
				result.ok
					? {
							status: "ready",
							consent: { text: result.text, version: result.version },
						}
					: { status: "error" },
			);
		});
		return () => {
			live = false;
		};
	}, [attempt]);

	const retry = useCallback(() => setAttempt((n) => n + 1), []);

	if (!formId) return null;

	if (load.status === "loading") {
		return (
			<div className={PAGE}>
				<output
					aria-label={t("form.loading")}
					aria-busy="true"
					className="flex flex-col gap-3"
				>
					{[0, 1, 2].map((row) => (
						<Skeleton key={row} className="h-12 w-full" />
					))}
				</output>
			</div>
		);
	}

	if (load.status === "error") {
		return (
			<div className={PAGE}>
				<div className="flex flex-col items-start gap-3">
					<Alert>{t("form.loadError")}</Alert>
					<Button
						variant="subtle"
						text={t("form.retry")}
						className="w-auto"
						onPress={retry}
					/>
				</div>
			</div>
		);
	}

	return <NewClientForm formId={formId} consent={load.consent} />;
}

function NewClientForm({
	formId,
	consent,
}: Readonly<{ formId: string; consent: Consent }>) {
	const { extraFields, onConsentOutdated } = useConsentField(consent);
	const adapter = useClientAdapter({ onConsentOutdated });

	return (
		<RecordForm
			adapter={adapter}
			mode="create"
			formId={formId}
			extraFields={extraFields}
		/>
	);
}
