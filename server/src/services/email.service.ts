import nodemailer from 'nodemailer';
import { env } from '../config/env';

const smtpValues = [
  env.SMTP_HOST,
  env.SMTP_PORT,
  env.SMTP_USER,
  env.SMTP_PASS,
  env.SMTP_FROM,
];

const sendEmail = async (to: string, subject: string, text: string, url: string): Promise<void> => {
  const configuredValues = smtpValues.filter((value) => value !== undefined && value !== '').length;

  if (configuredValues === 0 && env.NODE_ENV !== 'production') {
    console.info(`[ExpenseAI Email - development only] ${subject} for ${to}: ${url}`);
    return;
  }

  if (configuredValues !== smtpValues.length) {
    throw new Error('SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, and SMTP_FROM must all be configured.');
  }

  const transporter = nodemailer.createTransport({
    host: env.SMTP_HOST,
    port: env.SMTP_PORT,
    secure: env.SMTP_SECURE ?? env.SMTP_PORT === 465,
    auth: {
      user: env.SMTP_USER,
      pass: env.SMTP_PASS,
    },
  });

  await transporter.sendMail({
    from: env.SMTP_FROM,
    to,
    subject,
    text: `${text}\n\n${url}`,
    html: `<p>${text}</p><p><a href="${url}">${url}</a></p>`,
  });
};

export const sendVerificationEmail = (to: string, url: string): Promise<void> =>
  sendEmail(to, 'Verify your ExpenseAI email', 'Verify your email address to activate your ExpenseAI account.', url);

export const sendPasswordResetEmail = (to: string, url: string): Promise<void> =>
  sendEmail(to, 'Reset your ExpenseAI password', 'Use this link to reset your ExpenseAI password. It expires in 30 minutes.', url);
