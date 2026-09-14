export type { PasswordResetEmailProps } from "../emails/PasswordResetEmail.js";
export type { VerificationCodeEmailProps } from "../emails/VerificationCodeEmail.js";
export { renderPasswordReset } from "./password-reset.js";
export { renderCodeVerification } from "./verification-code.js";

//TODO: add tests to render the e-mails, assert that rendering succeeds and proper content is shown
