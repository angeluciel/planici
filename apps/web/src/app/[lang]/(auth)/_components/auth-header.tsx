"use client";

import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";

export default function Header() {
	const router = useRouter();
	const t = useTranslations("common");

	return (
		<div className="min-w-full py-3 flex justify-start items-center">
			<button
				type="button"
				onClick={() => router.back()}
				aria-label={t("back")}
				className="p-3 rounded-md bg-surface-raised hover:bg-surface-raised-hovered shadow-raised transition-all duration-100 active:bg-surface-raised-pressed lg:hidden"
			>
				<ArrowLeft aria-hidden />
			</button>
		</div>
	);
}
