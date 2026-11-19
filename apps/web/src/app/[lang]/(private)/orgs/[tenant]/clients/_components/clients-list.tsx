"use client";

import {
	CLIENT_SEARCH_MIN_LENGTH,
	type ClientStatusFilter,
	type ClientSummary,
} from "@planici/schemas";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useRef, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useRouter } from "@/i18n/navigation";
import { listClients } from "@/lib/api/clients";
import { maskPhone } from "../../_components/records/masks";
import { SpinnerIcon } from "../../forms/_components/spinner-icon";
import { NewClientMenu } from "./new-client-menu";

const DEBOUNCE_MS = 300;

type Empty = "none" | "filter";
type Page =
	| { status: "loading" }
	| { status: "error" }
	| {
			status: "ready";
			rows: ClientSummary[];
			nextCursor: string | null;
			// why the list is empty, when it is
			empty: Empty | null;
	  };
type More = "idle" | "loading" | "error";

const length = (text: string) => [...text].length;

// /clients (SPEC-0004 §4.1, §8): search, status filter, table, load more.
export function ClientsList() {
	const t = useTranslations("clients");
	const router = useRouter();
	const { tenant } = useParams<{ tenant: string }>();
	const [input, setInput] = useState("");
	const [debounced, setDebounced] = useState("");
	const [status, setStatus] = useState<ClientStatusFilter>("active");
	const [page, setPage] = useState<Page>({ status: "loading" });
	const [more, setMore] = useState<More>("idle");
	const [attempt, setAttempt] = useState(0);
	// the newest request wins; a change of query or filter drops older answers
	const latest = useRef(0);

	useEffect(() => {
		const timer = setTimeout(() => setDebounced(input), DEBOUNCE_MS);
		return () => clearTimeout(timer);
	}, [input]);

	// under 2 characters nothing is searched: the list is the unfiltered one
	const trimmed = debounced.trim();
	const q = length(trimmed) >= CLIENT_SEARCH_MIN_LENGTH ? trimmed : undefined;
	const shortInput =
		length(input.trim()) > 0 && length(input.trim()) < CLIENT_SEARCH_MIN_LENGTH;

	// a new page one: first load, a new `q` or status, and retry
	// biome-ignore lint/correctness/useExhaustiveDependencies: `attempt` re-runs the load on retry
	useEffect(() => {
		latest.current += 1;
		const request = latest.current;
		setPage({ status: "loading" });
		setMore("idle");

		void (async () => {
			const result = await listClients({ q, status });
			if (request !== latest.current) return;
			if (!result.ok) {
				setPage({ status: "error" });
				return;
			}

			const { clients, nextCursor } = result.list;
			let empty: Empty | null = null;
			if (clients.length === 0 && !q) {
				empty = "none";
				if (status !== "all") {
					// is there any client at all? (Decision 6)
					const any = await listClients({ status: "all", limit: 1 });
					if (request !== latest.current) return;
					if (!any.ok || any.list.clients.length > 0) empty = "filter";
				}
			}
			setPage({ status: "ready", rows: clients, nextCursor, empty });
		})();
	}, [q, status, attempt]);

	const retry = useCallback(() => setAttempt((n) => n + 1), []);

	async function loadMore() {
		if (page.status !== "ready" || page.nextCursor === null) return;
		const request = latest.current;
		setMore("loading");

		const result = await listClients({ q, status, after: page.nextCursor });
		if (request !== latest.current) return;
		if (!result.ok) {
			setMore("error");
			return;
		}
		setMore("idle");
		setPage({
			...page,
			rows: [...page.rows, ...result.list.clients],
			nextCursor: result.list.nextCursor,
		});
	}

	const base = `/orgs/${tenant}/clients`;

	return (
		<div className="mx-auto flex w-full max-w-5xl flex-col gap-6 p-4 md:p-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h1 className="font-heading-md text-text-bold">{t("list.title")}</h1>
				<NewClientMenu />
			</div>

			<div className="flex flex-wrap items-start gap-3">
				<div className="min-w-0 flex-1">
					<Input
						label={t("list.search")}
						value={input}
						autoComplete="off"
						help={shortInput ? t("list.searchHint") : undefined}
						onChange={(event) => setInput(event.target.value)}
					/>
				</div>
				<div className="pt-7">
					<Select
						value={status}
						onValueChange={(value) => setStatus(value as ClientStatusFilter)}
						label={t(`list.status.${status}`)}
						options={(["active", "inactive", "all"] as const).map((value) => ({
							value,
							label: t(`list.status.${value}`),
						}))}
					/>
				</div>
			</div>

			{page.status === "loading" && (
				<output
					aria-label={t("list.loading")}
					aria-busy="true"
					className="flex flex-col gap-3"
				>
					{[0, 1, 2, 3].map((row) => (
						<Skeleton key={row} className="h-12 w-full" />
					))}
				</output>
			)}

			{page.status === "error" && (
				<div className="flex flex-col items-start gap-3">
					<Alert>{t("list.error")}</Alert>
					<Button
						variant="subtle"
						text={t("form.retry")}
						className="w-auto"
						onPress={retry}
					/>
				</div>
			)}

			{page.status === "ready" && page.rows.length === 0 && (
				<p className="font-body-md text-text-secondary">
					{q
						? t("list.noResults", { q })
						: page.empty === "filter"
							? t("list.emptyFilter")
							: t("list.empty")}
				</p>
			)}

			{page.status === "ready" && page.rows.length > 0 && (
				<>
					<table className="w-full border-collapse text-left">
						<thead>
							<tr className="border-b border-border">
								{(["name", "email", "phone", "form"] as const).map((column) => (
									<th
										key={column}
										scope="col"
										className="px-3 py-2 font-body-sm font-semibold text-text-secondary"
									>
										{t(`list.columns.${column}`)}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{page.rows.map((client) => (
								<tr
									key={client.id}
									className="cursor-pointer border-b border-border hover:bg-surface-hovered"
									onClick={() => router.push(`${base}/${client.id}`)}
								>
									<td className="px-3 py-3 font-body-sm">
										<div className="flex flex-wrap items-center gap-2">
											<Link
												href={`${base}/${client.id}`}
												className="font-medium text-text-link hover:underline focus-visible:outline-2 focus-visible:outline-border-focused"
												onClick={(event) => event.stopPropagation()}
											>
												{client.name}
											</Link>
											{client.status === "inactive" && (
												<span className="rounded-sm bg-background-accent-gray-subtler px-2 font-body-xs text-text-accent-gray-bolder">
													{t("list.inactiveBadge")}
												</span>
											)}
										</div>
									</td>
									<td className="px-3 py-3 font-body-sm text-text-primary">
										{client.email}
									</td>
									<td className="px-3 py-3 font-body-sm text-text-primary">
										{client.phone ? maskPhone(client.phone) : ""}
									</td>
									<td className="px-3 py-3 font-body-sm text-text-primary">
										{client.formName}
									</td>
								</tr>
							))}
						</tbody>
					</table>

					{more === "error" && (
						<div className="flex flex-col items-start gap-3">
							<Alert>{t("list.loadMoreError")}</Alert>
							<Button
								variant="subtle"
								text={t("form.retry")}
								className="w-auto"
								onPress={() => void loadMore()}
							/>
						</div>
					)}

					{page.nextCursor !== null && more !== "error" && (
						<div>
							<Button
								variant="subtle"
								text={t("list.loadingMore")}
								className="w-auto"
								leadingIcon={more === "loading" ? SpinnerIcon : undefined}
								disabled={more === "loading"}
								aria-busy={more === "loading"}
								onPress={() => void loadMore()}
							/>
						</div>
					)}
				</>
			)}
		</div>
	);
}
