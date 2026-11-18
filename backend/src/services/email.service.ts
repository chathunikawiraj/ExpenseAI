import nodemailer from 'nodemailer';
import { env } from '../config/env';

const sendEmail = async (to: string, subject: string, message: string, url: string): Promise<void> => {
  if (!env.SMTP_HOST) {
    if (env.NODE_ENV === 'production') {
      throw new Error('Email delivery is not configured.');
    }
    console.info(`[ExpenseAI Email - development only] ${subject} for ${to}: ${url}`);
    return;
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE ?? env.SMTP_PORT === 465,
    auth: { user: env.SMTP_USER, pass: env.SMTP_PASS },
  });

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject,
    text: `${message}\n\n${url}`,
    html: `<p>${message}</p><p><a href="${url}">${url}</a></p>`,
  });
};

export const sendVerificationEmail = (to: string, url: string): Promise<void> =>
  sendEmail(to, 'Verify your ExpenseAI email', 'Verify your email address to activate your account.', url);

export const sendPasswordResetEmail = (to: string, url: string): Promise<void> =>
  sendEmail(to, 'Reset your ExpenseAI password', 'This one-time password reset link expires in 30 minutes.', url);
