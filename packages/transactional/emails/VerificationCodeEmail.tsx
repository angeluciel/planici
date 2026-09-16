import { getMessages, type Locale } from "@planici/i18n";
import { createTranslator } from "next-intl";
import { Body, Column, Head, Heading, Html, Img, Link, Preview, Row, Section, Tailwind, Text } from "react-email";
import { NotoSansFont } from "./components/theme-fonts.js";
import { tailwindConfig } from "./tailwind.js";

export interface VerificationCodeEmailProps {
	code: string;
	expiresInMinutes: number;
	locale?: Locale;
	baseUrl: string;
}

export default async function VerificationCodeEmail({
	code,
	expiresInMinutes,
	locale = "en-US",
	baseUrl,
}: Readonly<VerificationCodeEmailProps>) {
	const messages = getMessages(locale);

	const t = createTranslator({
		messages,
		namespace: "emails.verification-code",
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
									<Img src={`${baseUrl}/planici-logo-mono.png`} alt="Planici" width={24} className="block" />
								</Column>
								<Column align="right" className="w-1/2 align-middle">
									<Text className="text-right">
										<span className="text-text-secondary text-body-s-bold">Planici</span>
									</Text>
								</Column>
							</Row>
						</Section>

						{/* Body */}
						<Section className="bg-surface-overlay px-2 py-8 w-full rounded-lg">
							<Row>
								<Column className="w-full align-middle" align="center">
									<Img src={`${baseUrl}/planici-logo.png`} alt="Planici" width={64} className="block" />

									<Heading as="h1" className="font-sans text-center text-heading-m text-bold">
										{t("body.title")}
									</Heading>

									<Text className="text-center">
										<span className="text-body-s-regular text-text-primary">{t("body.subtitle")}</span>
									</Text>

									{/* Verification code */}
									<Text className="my-6 text-center">
										<span
											dir="ltr"
											className="inline-block whitespace-nowrap bg-surface-brand text-text-primary rounded-sm px-6 py-3 font-mono text-[32px] leading-[40px] font-bold"
											style={{ letterSpacing: "6px" }}
										>
											{code}
										</span>
									</Text>

									<Text className="text-center">
										<span className="text-text-secondary text-body-s-regular">
											{t("body.expiration", { minutes: expiresInMinutes })}
										</span>
									</Text>

									<Text className="text-center">
										<span className="text-text-secondary text-body-s-regular">{t("body.footer")}</span>
									</Text>
								</Column>
							</Row>
						</Section>

						{/* Footer */}
						<Section className="w-full text-center">
							<Row>
								<Column className="w-full" align="center">
									<Text className="max-w-[240px] text-center">
										<span className="text-text-secondary text-body-s-regular font-medium">{t("slogan")}</span>
									</Text>

									<Row className="align-middle" align="center" width={124}>
										<Column align="center" width="40">
											<Link href="https://github.com/angeluciel/planici" className="px-2 w-min h-min">
												<Img src={`${baseUrl}/github1.png`} alt="GitHub" width={24} />
											</Link>
										</Column>
										<Column align="center" width="40">
											<Link href="https://example.com" className="px-2 w-min">
												<Img src={`${baseUrl}/Vector.png`} alt="Instagram" width={24} />
											</Link>
										</Column>
										<Column align="center" width="40">
											<Link href="https://example.com" className="px-2 w-min">
												<Img src={`${baseUrl}/x.png`} alt="X" width={24} />
											</Link>
										</Column>
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

VerificationCodeEmail.PreviewProps = {
	code: "012345",
	expiresInMinutes: 10,
	locale: "en-US",
	baseUrl: "https://d34yicvl9up261.cloudfront.net",
} satisfies VerificationCodeEmailProps;
