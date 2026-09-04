import { render } from "react-email";
import PasswordResetEmail, { type PasswordResetEmailProps } from "../emails/PasswordResetEmail";

export async function renderPasswordReset(props: PasswordResetEmailProps) {
	const html = await render(<PasswordResetEmail {...props} />);

	return { html };
}
