import Bull from 'bull';
import nodemailer from 'nodemailer';
import { config } from '../config';
import { logger } from '../utils/logger';

export const emailQueue = new Bull('email', config.redis.url);

const transporter = nodemailer.createTransport({
  host: config.email.host,
  port: config.email.port,
  secure: config.email.port === 465,
  auth: {
    user: config.email.user,
    pass: config.email.pass,
  },
});

emailQueue.process('verify-email', async (job) => {
  const { to, name, token } = job.data as { to: string; name: string; token: string };
  const url = `${config.frontend.url}/verify-email/${token}`;
  await transporter.sendMail({
    from: config.email.from,
    to,
    subject: 'Verify your FlowBoard email',
    html: `
      <h2>Hi ${name},</h2>
      <p>Please verify your email address to activate your FlowBoard account.</p>
      <a href="${url}" style="background:#6b5efa;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin:16px 0;">
        Verify Email
      </a>
      <p>This link expires in 24 hours.</p>
      <p>If you didn't create an account, ignore this email.</p>
    `,
  });
  logger.info('Verification email sent', { to });
});

emailQueue.process('reset-password', async (job) => {
  const { to, name, token } = job.data as { to: string; name: string; token: string };
  const url = `${config.frontend.url}/reset-password/${token}`;
  await transporter.sendMail({
    from: config.email.from,
    to,
    subject: 'Reset your FlowBoard password',
    html: `
      <h2>Hi ${name},</h2>
      <p>We received a request to reset your password.</p>
      <a href="${url}" style="background:#6b5efa;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;display:inline-block;margin:16px 0;">
        Reset Password
      </a>
      <p>This link expires in 1 hour.</p>
      <p>If you didn't request this, ignore this email — your password won't change.</p>
    `,
  });
  logger.info('Password reset email sent', { to });
});

emailQueue.on('failed', (job, err) => {
  logger.error('Email job failed', { job: job.name, error: err.message });
});
