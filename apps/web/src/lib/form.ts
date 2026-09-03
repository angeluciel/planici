"use client";

import { useTranslations } from "next-intl";
import { useCallback } from "react";

/**
 * Forma que """eu""" achei de traduzir as chaves emitidas pelo schema para
 * as mensagens do i18n
 *
 * */

export function useFieldError() {
	const t = useTranslations("validation");

	return useCallback(
		(message?: string) => {
			if (!message) return undefined;

			return t.has(message) ? t(message) : message;
		},
		[t],
	);
}
