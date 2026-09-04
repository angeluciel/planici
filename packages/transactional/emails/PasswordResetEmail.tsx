import { createTranslator } from "next-intl";
import {
	Body,
	Button,
	Column,
	Head,
	Heading,
	Html,
	Img,
	Link,
	Preview,
	Row,
	Section,
	Tailwind,
	Text,
} from "react-email";
import { NotoSansFont } from "./components/theme-fonts";
import { tailwindConfig } from "./tailwind";

// TODO: APAGAR APAGAR APAGAR

const loaders = {
	"en-US": () => import("@planici/i18n/messages/en-US.json"),
	"pt-BR": () => import("@planici/i18n/messages/pt-BR.json"),
} as const;

export type Locale = keyof typeof loaders;

export interface PasswordResetEmailProps {
	name: string;
	link: string;
	locale: Locale;
}

export default async function PasswordResetEmail({ name, link, locale }: PasswordResetEmailProps) {
	const t = createTranslator({
		messages: await import(`../../i18n/messages/${locale}.json`),
		namespace: "emails.password-reset",
		locale,
	});

	return (
		<Html lang={locale}>
			<Tailwind config={tailwindConfig}>
				<Head>
					<NotoSansFont />
				</Head>
				<Body className="bg-surface-container m-0 text-center font-sans">
					<Preview>{t("preview")}</Preview>
					<Section className="w-full max-w-[620px] p-3 sm:p-4 bg-surface">
						{/* Header */}
						<Section className="w-full text-center pb-2">
							<Row>
								<Column className="w-1/2 align-middle" align="left">
									<Img src={`${baseUrl}/planici-logo-mono.png`} alt="ops" width={24} className="block" />
								</Column>
								<Column align="right" className="w-1/2 align-middle">
									<Text className="text-right">
										<span className="text-text-secondary text-body-s-bold">Planici</span>
									</Text>
								</Column>
							</Row>
						</Section>
						{/*Body*/}
						<Section className="bg-surface-overlay px-2 py-8 w-full rounded-lg">
							<Row>
								<Column className="w-full align-middle" align="center">
									{/*heading*/}
									<Row>
										<Column className="w-full" align="center">
											{/* logo */}
											<Img src={`${baseUrl}/planici-logo.png`} alt="ops" width={64} className="block" />
											{/* title */}
											<Heading as="h1" className="font-sans text-center text-heading-m text-bold">
												{t("body.title")}
											</Heading>
											{/* subtitle*/}
											<Text className="text-center">
												<span className="text-body-s-regular text-text-primary">{t("body.subtitle", { name })} </span>
											</Text>
										</Column>
									</Row>
									{/* button */}
									<Row className="w-full">
										<Button
											href={link}
											className="bg-surface-brand text-body-m-medium text-text-primary rounded-sm p-3 my-6"
										>
											{t("body.button")}
										</Button>
									</Row>
									{/* below text */}
									<Row>
										<Text>
											<span className="text-text-secondary text-body-s-regular">{t("body.footer")} </span>
										</Text>
									</Row>
								</Column>
							</Row>
						</Section>
						{/*Footer*/}
						<Section className="w-full text-center">
							<Row>
								<Column className="w-full" align="center">
									<Row className="w-full" align="center">
										<Text className="max-w-[240px] text-center">
											<span className="text-text-secondary text-body-s-medium">{t("slogan")}</span>
										</Text>
									</Row>
									<Row className="align-middle" align="center">
										<Link href="https://github.com/angeluciel/planici" className="px-2 w-min h-min">
											<Img src={`${baseUrl}/github1.png`} alt="gh" width={24} />
										</Link>

										<Link href="https://example.com" className="px-2 w-min">
											<Img src={`${baseUrl}/Vector.png`} width={24} alt="ig" />
										</Link>
										<Link href="https://example.com" className="px-2 w-min">
											<Img src={`${baseUrl}/x.png`} width={24} alt="x" />
										</Link>
									</Row>
								</Column>
							</Row>
						</Section>
					</Section>
				</Body>
			</Tailwind>
		</Html>
	);
}

PasswordResetEmail.PreviewProps = {
	name: "John Doe",
	link: "https://example.com/reset",
	locale: "en-US",
} satisfies PasswordResetEmailProps;
