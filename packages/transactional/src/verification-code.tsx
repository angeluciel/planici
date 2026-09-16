import { render, toPlainText } from "react-email";
import VerificationCodeEmail, { type VerificationCodeEmailProps } from "../emails/VerificationCodeEmail.js";

export async function renderCodeVerification(props: VerificationCodeEmailProps) {
	const html = await render(<VerificationCodeEmail {...props} />);
	const text = toPlainText(html);

	return {
		subject: "Planici | Verify e-mail",
		html,
		text,
	};
}
