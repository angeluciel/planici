import { pixelBasedPreset, type TailwindConfig } from "react-email";

const colors = {
	"surface-container": "#E8E8Ea",
	surface: "#F8F8F8",
	"surface-brand": "#DF8EBB",
	"surface-overlay": "#F1F1F2",

	"text-primary": "#17181E",
	"text-secondary": "#515257",
	"text-bold": "#000000",
} as const;

const fontFamily = {
	sans: ['"Noto Sans"', "Arial", "sans-serif"],
};

const fontSize = {
	"heading-m": [
		"24px",
		{
			lineHeight: "28px",
			letterSpacing: "0px",
			fontWeight: "700",
		},
	],
	"body-m-medium": [
		"16px",
		{
			lineHeight: "24px",
			letterSpacing: "0px",
			fontWeight: "500",
		},
	],
	"body-s-regular": [
		"14px",
		{
			lineHeight: "20px",
			letterSpacing: "0px",
			fontWeight: "400",
		},
	],
	"body-s-bold": [
		"14px",
		{
			lineHeight: "20px",
			letterSpacing: "0px",
			fontWeight: "700",
		},
	],
} as const;

export const tailwindConfig: TailwindConfig = {
	presets: [pixelBasedPreset],
	theme: {
		extend: {
			colors,
			fontFamily,
			fontSize,
		},
	},
};
