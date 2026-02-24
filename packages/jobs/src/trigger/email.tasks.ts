import { task } from '@trigger.dev/sdk';
import { Resend } from 'resend';
import { logger } from '@trigger.dev/sdk';

// Email payload types
export interface SendEmailPayload {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export interface SendOTPEmailPayload {
  email: string;
  otp: string;
  type: 'sign-in' | 'email-verification' | 'forget-password';
}

export interface SendWelcomeEmailPayload {
  email: string;
  name: string;
}

// Initialize Resend client within task context
function getResendClient(): Resend {
  const apiKey = process.env.RESEND_API_KEY;
  if (!apiKey) {
    throw new Error('RESEND_API_KEY environment variable is required');
  }
  return new Resend(apiKey);
}

function getEmailFrom(): string {
  return process.env.EMAIL_FROM || 'noreply@example.com';
}

/**
 * Generic email sending task
 * Use this for custom one-off emails
 */
export const sendEmailTask = task({
  id: 'send-email',
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
    factor: 2,
  },
  run: async (payload: SendEmailPayload) => {
    const resend = getResendClient();

    logger.info('Sending email', { to: payload.to, subject: payload.subject });

    const { data, error } = await resend.emails.send({
      from: getEmailFrom(),
      to: payload.to,
      subject: payload.subject,
      html: payload.html || payload.text || '',
    });

    if (error) {
      logger.error('Failed to send email', { error: error.message });
      throw new Error(`Failed to send email: ${error.message}`);
    }

    logger.info('Email sent successfully', { emailId: data?.id });

    return {
      success: true,
      emailId: data?.id,
    };
  },
});

/**
 * OTP email task for authentication flows
 * Handles sign-in, email verification, and password reset OTPs
 */
export const sendOTPEmailTask = task({
  id: 'send-otp-email',
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 500,
    maxTimeoutInMs: 5000,
    factor: 2,
  },
  run: async (payload: SendOTPEmailPayload) => {
    const resend = getResendClient();
    const { email, otp, type } = payload;

    const subjects: Record<typeof type, string> = {
      'sign-in': 'Your login code',
      'email-verification': 'Verify your email',
      'forget-password': 'Reset your password',
    };

    const messages: Record<typeof type, string> = {
      'sign-in': `Your login code is: ${otp}. This code expires in 10 minutes.`,
      'email-verification': `Your verification code is: ${otp}. This code expires in 10 minutes.`,
      'forget-password': `Your password reset code is: ${otp}. This code expires in 10 minutes.`,
    };

    const subject = subjects[type];
    const message = messages[type];

    logger.info('Sending OTP email', { email, type });

    const { data, error } = await resend.emails.send({
      from: getEmailFrom(),
      to: email,
      subject,
      html: `
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; margin-bottom: 20px;">${subject}</h2>
          <p style="color: #666; margin-bottom: 20px;">${message.replace(otp, '')}</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px; margin-bottom: 20px;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">${otp}</span>
          </div>
          <p style="color: #999; font-size: 12px;">If you didn't request this code, you can safely ignore this email.</p>
        </div>
      `,
    });

    if (error) {
      logger.error('Failed to send OTP email', { error: error.message });
      throw new Error(`Failed to send OTP email: ${error.message}`);
    }

    logger.info('OTP email sent successfully', { emailId: data?.id });

    return {
      success: true,
      emailId: data?.id,
    };
  },
});

/**
 * Welcome email task for new user onboarding
 */
export const sendWelcomeEmailTask = task({
  id: 'send-welcome-email',
  retry: {
    maxAttempts: 3,
    minTimeoutInMs: 1000,
    maxTimeoutInMs: 10000,
    factor: 2,
  },
  run: async (payload: SendWelcomeEmailPayload) => {
    const resend = getResendClient();
    const { email, name } = payload;

    logger.info('Sending welcome email', { email, name });

    const { data, error } = await resend.emails.send({
      from: getEmailFrom(),
      to: email,
      subject: 'Welcome!',
      html: `
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; margin-bottom: 20px;">Welcome, ${name}!</h2>
          <p style="color: #666;">Thank you for joining our platform. We're excited to have you!</p>
          <p style="color: #666; margin-top: 20px;">If you have any questions, feel free to reach out to our support team.</p>
        </div>
      `,
    });

    if (error) {
      logger.error('Failed to send welcome email', { error: error.message });
      throw new Error(`Failed to send welcome email: ${error.message}`);
    }

    logger.info('Welcome email sent successfully', { emailId: data?.id });

    return {
      success: true,
      emailId: data?.id,
    };
  },
});
