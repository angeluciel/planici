import { MailMessage } from '../mail.service.js';
import {
  renderPasswordReset,
  type PasswordResetEmailProps,
} from '@planici/emails';

export async function passwordResetEmail(
  to: string,
  props: PasswordResetEmailProps,
): Promise<MailMessage> {
  return {
    to,
    ...(await renderPasswordReset(props)),
  };
}
