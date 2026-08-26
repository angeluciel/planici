"use client";

import {
	PASSWORD_HAS_NUMBER,
	PASSWORD_HAS_SYMBOL,
	PASSWORD_MIN_LENGTH,
} from "@planici/schemas";
import { Check, X } from "lucide-react";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";

/**
 *  Live checklist for RN-26 password policy
 * */
const RULES = [
	{ key: "min", test: (v: string) => v.length >= PASSWORD_MIN_LENGTH },
	{ key: "number", test: (v: string) => PASSWORD_HAS_NUMBER.test(v) },
	{ key: "symbol", test: (v: string) => PASSWORD_HAS_SYMBOL.test(v) },
] as const;

export function PasswordCriteria({
	value,
	className,
}: Readonly<{ value: string; className?: string }>) {
	const t = useTranslations("auth.register.password-criteria");

	return (
		<ul
			aria-live="polite"
			className={cn("flex w-full flex-col gap-1", className)}
		>
			{RULES.map(({ key, test }) => {
				const met = test(value);
				const Icon = met ? Check : X;

				return (
					<li
						key={key}
						className={cn(
							"flex items-center gap-1.5 font-body.sm font-medium",
							met ? "text-text-status-success" : "text-text-secondary",
						)}
					>
						<Icon
							aria-hidden
							className={cn(
								"size-4 shirnk-0",
								met ? "text-icon-success" : "text-icon-subtle",
							)}
						/>
						<span>{t(key)}</span>
						<span className="sr-only">{met ? t("met") : t("not-met")}</span>
					</li>
				);
			})}
		</ul>
	);
}
