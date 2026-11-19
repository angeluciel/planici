"use client";

import {
	CLIENT_SEARCH_MIN_LENGTH,
	type ClientStatusFilter,
	type ClientSummary,
} from "@planici/schemas";
import { SearchIcon } from "lucide-react";
import { useParams } from "next/navigation";
import { useTranslations } from "next-intl";
import { useCallback, useEffect, useId, useRef, useState } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Link, useRouter } from "@/i18n/navigation";
import { listClients } from "@/lib/api/clients";
import { maskPhone } from "../../_components/records/masks";
import { SpinnerIcon } from "../../forms/_components/spinner-icon";
import { NewClientMenu } from "./new-client-menu";

const DEBOUNCE_MS = 300;
const STATUSES = ["active", "inactive", "all"] as const;

type Empty = "none" | "filter";
type Page =
	| { status: "loading" }
	| { status: "error" }
	| {
			status: "ready";
			rows: ClientSummary[];
			nextCursor: string | null;
			empty: Empty | null;
	  };
type More = "idle" | "loading" | "error";

const length = (text: string) => [...text].length;

// first letters of the first and last words: "Ana Maria Souza" -> "AS"
function initials(name: string) {
	const words = name.trim().split(/\s+/).filter(Boolean);
	const first = [...(words[0] ?? "")][0] ?? "";
	const last = words.length > 1 ? ([...(words.at(-1) ?? "")][0] ?? "") : "";
	return (first + last).toLocaleUpperCase();
}

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
	const statusName = useId();
	const latest = useRef(0);

	useEffect(() => {
		const timer = setTimeout(() => setDebounced(input), DEBOUNCE_MS);
		return () => clearTimeout(timer);
	}, [input]);

	const trimmed = debounced.trim();
	const q = length(trimmed) >= CLIENT_SEARCH_MIN_LENGTH ? trimmed : undefined;
	const shortInput =
		length(input.trim()) > 0 && length(input.trim()) < CLIENT_SEARCH_MIN_LENGTH;

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
		<div className="mx-auto flex w-full max-w-3xl flex-col gap-6 p-4 md:p-6">
			<div className="flex flex-wrap items-center justify-between gap-3">
				<h1 className="font-heading-md text-text-bold">{t("list.title")}</h1>
				<NewClientMenu />
			</div>

			<div className="flex flex-col gap-3 md:flex-row md:items-start">
				<div className="flex flex-1 flex-col gap-1">
					<label className="group flex items-center gap-2 rounded-md bg-surface-sunken px-2 py-2">
						<SearchIcon
							aria-hidden="true"
							size={16}
							className="text-icon-disabled transition-colors duration-100 group-focus-within:text-icon"
						/>
						<input
							type="search"
							value={input}
							aria-label={t("list.search")}
							placeholder={t("list.search")}
							autoComplete="off"
							autoCorrect="off"
							autoCapitalize="off"
							data-bwignore="true"
							spellCheck={false}
							onChange={(event) => setInput(event.target.value)}
							className="flex-1 outline-none"
						/>
					</label>
					{shortInput && (
						<span className="px-2 font-body-sm text-text-secondary">
							{t("list.searchHint")}
						</span>
					)}
				</div>

				<fieldset className="flex w-fit shrink-0 gap-1 rounded-md bg-surface-sunken p-1">
					<legend className="sr-only">{t("list.filter.status")}</legend>
					{STATUSES.map((value) => (
						<label
							key={value}
							className="flex min-h-8 cursor-pointer items-center rounded-sm px-3 font-body-sm text-text-secondary transition-colors duration-100 hover:text-text-primary has-checked:bg-background-selected-bold has-checked:text-text-inverse has-focus-visible:outline-2 has-focus-visible:outline-border-focused"
						>
							<input
								type="radio"
								name={statusName}
								value={value}
								checked={status === value}
								onChange={() => setStatus(value)}
								className="sr-only"
							/>
							{t(`list.status.${value}`)}
						</label>
					))}
				</fieldset>
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
										className={`px-3 py-2 font-body-sm font-semibold text-text-secondary ${column === "name" ? "" : "hidden md:table-cell"}`}
									>
										{t(`list.columns.${column}`)}
									</th>
								))}
							</tr>
						</thead>
						<tbody>
							{page.rows.map((client) => {
								const phone = client.phone ? maskPhone(client.phone) : null;
								return (
									<tr
										key={client.id}
										className="cursor-pointer border-b border-border transition-colors duration-100 hover:bg-surface-hovered"
										onClick={() => router.push(`${base}/${client.id}`)}
									>
										<td className="px-3 py-2 font-body-sm">
											<div className="flex items-center gap-3">
												<span
													aria-hidden="true"
													className="flex size-8 shrink-0 items-center justify-center rounded-full bg-background-accent-gray-subtler font-body-xs font-semibold text-text-accent-gray-bolder"
												>
													{initials(client.name)}
												</span>
												<div className="flex min-w-0 flex-col">
													<div className="flex flex-wrap items-center gap-2">
														<Link
															href={`${base}/${client.id}`}
															className="rounded-sm font-medium text-text-bold hover:underline focus-visible:outline-2 focus-visible:outline-border-focused"
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
													{/* phones: e-mail and phone under the name instead of their columns */}
													<span className="truncate text-text-secondary md:hidden">
														{phone
															? `${client.email} · ${phone}`
															: client.email}
													</span>
												</div>
											</div>
										</td>
										<td className="hidden px-3 py-2 font-body-sm text-text-primary md:table-cell">
											{client.email}
										</td>
										<td className="hidden px-3 py-2 font-body-sm md:table-cell">
											{phone ? (
												<span className="text-text-primary">{phone}</span>
											) : (
												<span className="text-text-secondary">—</span>
											)}
										</td>
										<td className="hidden px-3 py-2 font-body-sm text-text-primary md:table-cell">
											{client.formName}
										</td>
									</tr>
								);
							})}
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
