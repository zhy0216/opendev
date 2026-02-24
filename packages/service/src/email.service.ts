import 'reflect-metadata';
import { injectable } from 'inversify';
import { Resend } from 'resend';
import { env } from '@repo/env';
import { createServiceLogger } from '@repo/logger';

const log = createServiceLogger('EmailService');

export interface SendEmailOptions {
  to: string;
  subject: string;
  text?: string;
  html?: string;
}

export type OTPType = 'sign-in' | 'email-verification' | 'forget-password';

export abstract class IEmailService {
  abstract sendEmail(options: SendEmailOptions): Promise<boolean>;
  abstract sendOTPEmail(email: string, otp: string, type: OTPType): Promise<boolean>;
  abstract sendWelcomeEmail(email: string, name: string): Promise<boolean>;
}

@injectable()
export class EmailService {
  private resend: Resend;

  constructor() {
    this.resend = new Resend(env.RESEND_API_KEY);
  }

  async sendEmail(options: SendEmailOptions): Promise<boolean> {
    const emailContext = { to: options.to, subject: options.subject };

    try {
      const { data, error } = await this.resend.emails.send({
        from: env.EMAIL_FROM,
        to: options.to,
        subject: options.subject,
        html: options.html || options.text || '',
      });

      if (error) {
        log.error('Failed to send email', new Error(error.message), emailContext);
        return false;
      }

      log.info('Email sent successfully', { ...emailContext, emailId: data?.id });
      return true;
    } catch (error) {
      log.error('Error sending email', error instanceof Error ? error : new Error(String(error)), emailContext);
      return false;
    }
  }

  async sendOTPEmail(email: string, otp: string, type: OTPType): Promise<boolean> {
    log.debug('Sending OTP email', { to: email, type });

    const subjects = {
      'sign-in': 'Your login code',
      'email-verification': 'Verify your email',
      'forget-password': 'Reset your password',
    };

    const messages = {
      'sign-in': `Your login code is: ${otp}. This code expires in 10 minutes.`,
      'email-verification': `Your verification code is: ${otp}. This code expires in 10 minutes.`,
      'forget-password': `Your password reset code is: ${otp}. This code expires in 10 minutes.`,
    };

    return this.sendEmail({
      to: email,
      subject: subjects[type],
      text: messages[type],
      html: `
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; margin-bottom: 20px;">${subjects[type]}</h2>
          <p style="color: #666; margin-bottom: 20px;">${messages[type].replace(otp, '')}</p>
          <div style="background: #f5f5f5; padding: 20px; text-align: center; border-radius: 8px; margin-bottom: 20px;">
            <span style="font-size: 32px; font-weight: bold; letter-spacing: 8px; color: #333;">${otp}</span>
          </div>
          <p style="color: #999; font-size: 12px;">If you didn't request this code, you can safely ignore this email.</p>
        </div>
      `,
    });
  }

  async sendWelcomeEmail(email: string, name: string): Promise<boolean> {
    log.debug('Sending welcome email', { to: email, userName: name });

    return this.sendEmail({
      to: email,
      subject: 'Welcome!',
      text: `Hello ${name}, welcome to our platform!`,
      html: `
        <div style="font-family: sans-serif; max-width: 400px; margin: 0 auto; padding: 20px;">
          <h2 style="color: #333; margin-bottom: 20px;">Welcome, ${name}!</h2>
          <p style="color: #666;">Thank you for joining our platform. We're excited to have you!</p>
        </div>
      `,
    });
  }
}
