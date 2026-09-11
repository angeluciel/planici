import enUS from "./messages/en-US.json";
import ptBR from "./messages/pt-BR.json";

export const locales = ["en-US", "pt-BR"] as const;

export type Locale = (typeof locales)[number];

export const msgs = {
	"en-US": enUS,
	"pt-BR": ptBR,
} satisfies Record<Locale, unknown>;

export const getMessages = <L extends Locale>(locale: L) => msgs[locale];
