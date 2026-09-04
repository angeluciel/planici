import { createTranslator } from "next-intl";
import {
	Body,
	Button,
	Column,
	Container,
	Head,
	Heading,
	Html,
	Img,
	Link,
	Preview,
	pixelBasedPreset,
	Row,
	Section,
	Tailwind,
	Text,
} from "react-email";

const baseUrl = process.env.IMAGE_URL ? `https://${process.env.IMAGE_URL}` : "";

type Locale = "en-US" | "pt-BR";

interface PasswordResetEmailProps {
	name: string;
	link: string;
	locale: Locale;
}

export default async function PasswordResetEmail({ name, link, locale }: PasswordResetEmailProps) {
	const t = createTranslator({
		messages: (await import(`@planici/i18n/messages/${locale}.json`)).default,
		namespace: "password-reset-email",
		locale,
	});

	return (
		<Tailwind config={{ presets: [pixelBasedPreset] }}>
			<Html>
				<Body className="bg-[#F3F4F6] m-0 text-center font-sans">
					<Preview>{t("header")}</Preview>
				</Body>
			</Html>
		</Tailwind>
	);
}
