import { Font } from "react-email";

export function NotoSansFont() {
	return (
		<>
			<style
				// biome-ignore lint/security/noDangerouslySetInnerHtml: dont care, didnt ask
				dangerouslySetInnerHTML={{
					__html: `@import url('https://fonts.googleapis.com/css2?family=Noto+Sans:wght@400;500;700');`,
				}}
			/>
			<Font
				fontFamily="Noto Sans"
				fallbackFontFamily={["Arial", "sans-serif"]}
				webFont={{
					url: "https://fonts.gstatic.com/s/notosans/v42/o-0bIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjc5a7duw.woff2",
					format: "woff2",
				}}
				fontWeight={400}
			/>
			<Font
				fontFamily="Noto Sans"
				fallbackFontFamily={["Arial", "sans-serif"]}
				webFont={{
					url: "https://fonts.gstatic.com/s/notosans/v42/o-0bIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjc5a7duw.woff2",
					format: "woff2",
				}}
				fontWeight={500}
			/>
			<Font
				fontFamily="Noto Sans"
				fallbackFontFamily={["Arial", "sans-serif"]}
				webFont={{
					url: "https://fonts.gstatic.com/s/notosans/v42/o-0bIpQlx3QUlC5A4PNB6Ryti20_6n1iPHjc5a7duw.woff2",
					format: "woff2",
				}}
				fontWeight={700}
			/>
		</>
	);
}
