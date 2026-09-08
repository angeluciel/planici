import { render, toPlainText } from "react-email";
import PasswordResetEmail, { type PasswordResetEmailProps } from "../emails/PasswordResetEmail";

export async function renderPasswordReset(props: PasswordResetEmailProps) {
	const html = await render(<PasswordResetEmail {...props} />);
	const text = toPlainText(html);

	return {
		subject: "Planici | Password Reset",
		html,
		text,
	};
}
