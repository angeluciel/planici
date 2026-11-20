"use client";

import type { Field } from "@planici/schemas";
import { ChevronLeftIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import {
	Fragment,
	type ReactNode,
	useCallback,
	useEffect,
	useRef,
	useState,
} from "react";
import { Alert } from "@/components/ui/alert";
import {
	Breadcrumb,
	BreadcrumbItem,
	BreadcrumbLink,
	BreadcrumbList,
	BreadcrumbPage,
	BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Button, buttonVariants } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link } from "@/i18n/navigation";
import { getFormVersion } from "@/lib/api/forms";
import { useFormatFieldValue } from "./format-value";
import { ProtectedValue } from "./protected-value";
import type { RecordAdapter, RecordData } from "./record-adapter";

type State =
	| { status: "loading" }
	| { status: "error" }
	| { status: "notFound" }
	| { status: "ready"; record: RecordData; fields: Field[] };

const PAGE = "mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-6";
// a sentinel for the template name inside the translated `view.version`
const NAME = "\u0000";

export type Crumb = { label: string; href: string };

// View page of a record (SPEC-0003 §4.2): the fields of its linked version,
// not the latest, with protected values masked (R9).
export function RecordView({
	adapter,
	recordId,
	// the way back once loaded (§4.2 item 5): from 768 px a breadcrumb of
	// `trail` then the record's name; below it a "Voltar" link to `backHref`
	trail,
	backHref,
	// the entity's own actions next to [Editar] (SPEC-0003 §11, G-1); `reload`
	// reads the record again without the loading state
	actions,
}: Readonly<{
	adapter: RecordAdapter;
	recordId: string;
	trail: Crumb[];
	backHref: string;
	actions?: (record: RecordData, reload: () => void) => ReactNode;
}>) {
	const t = useTranslations(adapter.entity);
	const { tenant } = useParams<{ tenant: string }>();
	const formatValue = useFormatFieldValue(adapter.entity);
	const [state, setState] = useState<State>({ status: "loading" });
	const [attempt, setAttempt] = useState(0);
	const latest = useRef(adapter);
	latest.current = adapter;
	const quiet = useRef(false);

	// biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` re-runs the load on retry
	useEffect(() => {
		let live = true;
		if (!quiet.current) setState({ status: "loading" });
		quiet.current = false;

		void (async () => {
			const read = await latest.current.read(recordId);
			if (!live) return;
			if (!read.ok) {
				setState({
					status: /\.not-found$/.test(read.error) ? "notFound" : "error",
				});
				return;
			}
			const version = await getFormVersion(
				read.record.form.id,
				read.record.form.version,
			);
			if (!live) return;
			setState(
				version.ok
					? {
							status: "ready",
							record: read.record,
							fields: version.version.fields,
						}
					: { status: "error" },
			);
		})();

		return () => {
			live = false;
		};
	}, [recordId, attempt]);

	const retry = useCallback(() => setAttempt((n) => n + 1), []);
	const reload = useCallback(() => {
		quiet.current = true;
		setAttempt((n) => n + 1);
	}, []);

	if (state.status === "loading") {
		return (
			<div className={PAGE}>
				<output
					aria-label={t("view.loading")}
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

	if (state.status === "error") {
		return (
			<div className={PAGE}>
				<div className="flex flex-col items-start gap-3">
					<Alert>{t("view.loadError")}</Alert>
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

	if (state.status === "notFound") {
		return (
			<div className={PAGE}>
				<div className="flex flex-col items-start gap-3">
					<p className="font-body-md text-text-primary">{t("view.notFound")}</p>
					<Link
						href={adapter.listHref}
						className="font-body-sm text-text-link hover:underline focus-visible:outline-2 focus-visible:outline-border-focused"
					>
						{t("form.back")}
					</Link>
				</div>
			</div>
		);
	}

	const { record, fields } = state;
	const [before = "", after = ""] = t("view.version", {
		name: NAME,
		version: record.form.version,
	}).split(NAME);
	const missing = new Set(record.missingRequired);
	const empty = t("view.empty");
	const name = typeof record.name === "string" ? record.name : "";

	// the text of a field's value, "" when there is none (a yes_no always has one)
	const textOf = (field: Field): string => {
		if (field.systemKey !== null) {
			const config = adapter.systemFields[field.systemKey];
			const raw = config ? record[config.attribute] : undefined;
			if (raw === null || raw === undefined || raw === "") return "";
			return config ? config.format(raw) : String(raw);
		}
		const value = record.values[field.id];
		if (field.type === "yes_no") return formatValue(field, value === true);
		return formatValue(field, value);
	};

	return (
		<div className={PAGE}>
			<div className="flex flex-col gap-3">
				<Breadcrumb className="hidden md:block">
					<BreadcrumbList>
						{trail.map((crumb) => (
							<Fragment key={crumb.href}>
								<BreadcrumbItem>
									<BreadcrumbLink render={<Link href={crumb.href} />}>
										{crumb.label}
									</BreadcrumbLink>
								</BreadcrumbItem>
								<BreadcrumbSeparator />
							</Fragment>
						))}
						<BreadcrumbItem>
							<BreadcrumbPage>{name}</BreadcrumbPage>
						</BreadcrumbItem>
					</BreadcrumbList>
				</Breadcrumb>
				<Link
					href={backHref}
					className="inline-flex min-h-10 items-center gap-1 self-start rounded-sm font-body-sm text-text-secondary transition-colors duration-100 ease-out hover:text-text-primary hover:underline focus-visible:outline-2 focus-visible:outline-border-focused active:text-text-bold md:hidden"
				>
					<ChevronLeftIcon
						aria-hidden="true"
						className="size-4 rtl:rotate-180"
					/>
					{t("form.back")}
				</Link>
				<header className="flex flex-wrap items-center justify-between gap-3">
					<p className="font-body-sm text-text-secondary">
						{before}
						<Link
							href={`/orgs/${tenant}/forms/${record.form.id}`}
							className="text-text-link hover:underline focus-visible:outline-2 focus-visible:outline-border-focused"
						>
							{record.form.name}
						</Link>
						{after}
					</p>
					<div className="flex flex-wrap items-center gap-2">
						{actions?.(record, reload)}
						<Link
							href={adapter.editHref(record.id)}
							className={buttonVariants({ variant: "primary" }).root({
								class: "w-auto py-2",
							})}
						>
							{t("form.edit")}
						</Link>
					</div>
				</header>
			</div>

			{record.form.version < record.form.latestVersion && (
				<Alert tone="info">{t("view.olderVersion")}</Alert>
			)}

			<dl className="flex flex-col gap-4">
				{fields.map((field) => {
					const text = textOf(field);
					return (
						<div key={field.id} className="flex flex-col gap-1">
							<dt className="font-body-sm text-text-secondary">
								{field.label}
							</dt>
							<dd className="flex flex-wrap items-center gap-2 font-body-md text-text-primary">
								{field.sensitive && text !== "" ? (
									<ProtectedValue
										entity={adapter.entity}
										label={field.label}
										value={text}
									/>
								) : (
									<span className="whitespace-pre-line break-words">
										{text === "" ? empty : text}
									</span>
								)}
								{missing.has(field.id) && (
									<span className="rounded-sm bg-background-status-warning-subtler px-2 font-body-sm text-text-status-warning-bolder">
										{t("view.missingRequired")}
									</span>
								)}
							</dd>
						</div>
					);
				})}
			</dl>
		</div>
	);
}
