/**
 * Resend-powered email service for Synapse.ai
 * Handles welcome onboarding and password reset emails.
 * 
 * SECURITY: API keys are never stored in memory beyond the call.
 * They are decrypted on-demand from the Settings document.
 */

import { Resend } from "resend";
import { getWelcomeEmailHtml, getResetEmailHtml } from "./emailTemplates.js";

/**
 * Send a welcome onboarding email to a newly registered team member.
 */
export async function sendWelcomeEmail(
  toEmail: string,
  devName: string,
  userId: string,
  setupLink: string,
  fromEmail: string,
  apiKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: `🎉 Welcome to Synapse.ai — Your account is ready!`,
      html: getWelcomeEmailHtml(devName, userId, setupLink)
    });

    if (error) {
      console.error("[EmailService] Welcome email failed:", error.message);
      return { success: false, error: error.message };
    }

    console.log(`[EmailService] Welcome email sent to ${toEmail}`);
    return { success: true };
  } catch (err: any) {
    console.error("[EmailService] Welcome email exception:", err.message);
    return { success: false, error: err.message };
  }
}

/**
 * Send a password reset email with a time-bound secure link.
 */
export async function sendPasswordResetEmail(
  toEmail: string,
  devName: string,
  resetLink: string,
  fromEmail: string,
  apiKey: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const resend = new Resend(apiKey);
    const { error } = await resend.emails.send({
      from: fromEmail,
      to: toEmail,
      subject: `🔐 Synapse.ai — Password Reset Request`,
      html: getResetEmailHtml(devName, resetLink)
    });

    if (error) {
      console.error("[EmailService] Reset email failed:", error.message);
      return { success: false, error: error.message };
    }

    console.log(`[EmailService] Reset email sent to ${toEmail}`);
    return { success: true };
  } catch (err: any) {
    console.error("[EmailService] Reset email exception:", err.message);
    return { success: false, error: err.message };
  }
}
