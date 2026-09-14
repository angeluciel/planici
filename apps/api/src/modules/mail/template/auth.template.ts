import { MailMessage } from '../mail.service.js';
import {
  renderPasswordReset,
  renderCodeVerification,
  type PasswordResetEmailProps,
  type VerificationCodeEmailProps,
} from '@planici/emails';

export async function verificationCodeEmail(
  to: string,
  props: VerificationCodeEmailProps,
): Promise<MailMessage> {
  return {
    to,
    ...(await renderCodeVerification(props)),
  };
}

export async function passwordResetEmail(
  to: string,
  props: PasswordResetEmailProps,
): Promise<MailMessage> {
  return {
    to,
    ...(await renderPasswordReset(props)),
  };
}
