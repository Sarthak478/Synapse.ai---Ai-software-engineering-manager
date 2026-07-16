/**
 * Premium HTML email templates for Synapse.ai
 * Used by the Resend email service for welcome onboarding and password reset flows.
 */

const BRAND_COLOR = "#0D9488"; // teal-600
const DARK_BG = "#18110D";
const CARD_BG = "#1A120C";
const BORDER = "#3D2E24";

function baseLayout(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Synapse.ai</title>
</head>
<body style="margin:0; padding:0; background-color:${DARK_BG}; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background-color:${DARK_BG}; padding: 40px 20px;">
    <tr>
      <td align="center">
        <table role="presentation" width="520" cellpadding="0" cellspacing="0" style="background-color:${CARD_BG}; border: 1px solid ${BORDER}; border-radius: 16px; overflow: hidden;">
          <!-- Header -->
          <tr>
            <td style="padding: 32px 32px 24px; text-align: center; border-bottom: 1px solid ${BORDER};">
              <div style="font-size: 24px; font-weight: 800; color: ${BRAND_COLOR}; letter-spacing: -0.5px;">
                ✦ Synapse.ai
              </div>
              <div style="font-size: 11px; color: #94a3b8; font-weight: 600; letter-spacing: 2px; text-transform: uppercase; margin-top: 6px;">
                AI Engineering Manager
              </div>
            </td>
          </tr>
          <!-- Content -->
          <tr>
            <td style="padding: 32px;">
              ${content}
            </td>
          </tr>
          <!-- Footer -->
          <tr>
            <td style="padding: 20px 32px; border-top: 1px solid ${BORDER}; text-align: center;">
              <div style="font-size: 11px; color: #64748b; line-height: 1.6;">
                This is an automated message from Synapse.ai.<br>
                Please do not reply to this email.
              </div>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`;
}

export function getWelcomeEmailHtml(devName: string, userId: string, setupLink: string): string {
  const content = \`
    <div style="text-align: center; margin-bottom: 28px;">
      <div style="font-size: 28px; margin-bottom: 8px;">🎉</div>
      <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ECE4DE;">
        Welcome to the Team!
      </h1>
      <p style="margin: 8px 0 0; font-size: 14px; color: #94a3b8;">
        You've been added to a Synapse.ai workspace.
      </p>
    </div>

    <div style="background-color: ${DARK_BG}; border: 1px solid ${BORDER}; border-radius: 12px; padding: 20px; margin-bottom: 24px;">
      <div style="font-size: 10px; font-weight: 700; color: #94a3b8; text-transform: uppercase; letter-spacing: 1.5px; margin-bottom: 12px;">
        Your Account Details
      </div>
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
        <tr>
          <td style="padding: 8px 0; font-size: 12px; color: #94a3b8; font-weight: 600;">Name</td>
          <td style="padding: 8px 0; font-size: 13px; color: #ECE4DE; font-weight: 700; text-align: right;">\${devName}</td>
        </tr>
        <tr>
          <td style="padding: 8px 0; font-size: 12px; color: #94a3b8; font-weight: 600; border-top: 1px solid ${BORDER};">User ID</td>
          <td style="padding: 8px 0; font-size: 13px; color: ${BRAND_COLOR}; font-weight: 700; text-align: right; font-family: monospace; border-top: 1px solid ${BORDER};">\${userId}</td>
        </tr>
      </table>
    </div>

    <div style="text-align: center; margin-bottom: 24px;">
      <p style="font-size: 13px; color: #94a3b8; margin: 0 0 16px; line-height: 1.6;">
        To get started, click the button below to set your personal password. This link expires in <strong style="color: #ECE4DE;">72 hours</strong>.
      </p>
      <a href="\${setupLink}" style="display: inline-block; background-color: ${BRAND_COLOR}; color: #ffffff; font-weight: 700; font-size: 13px; padding: 14px 36px; border-radius: 10px; text-decoration: none; letter-spacing: 0.3px;">
        Set Your Password →
      </a>
    </div>

    <div style="background-color: #1c1917; border: 1px solid #422006; border-radius: 8px; padding: 12px 16px;">
      <div style="font-size: 11px; color: #f59e0b; font-weight: 700;">⚠️ Security Notice</div>
      <div style="font-size: 11px; color: #94a3b8; margin-top: 4px; line-height: 1.5;">
        If you did not expect this invitation, please ignore this email. Do not share this link with anyone.
      </div>
    </div>
  \`;
  return baseLayout(content);
}

export function getResetEmailHtml(devName: string, resetLink: string): string {
  const content = \`
    <div style="text-align: center; margin-bottom: 28px;">
      <div style="font-size: 28px; margin-bottom: 8px;">🔐</div>
      <h1 style="margin: 0; font-size: 22px; font-weight: 800; color: #ECE4DE;">
        Password Reset Request
      </h1>
      <p style="margin: 8px 0 0; font-size: 14px; color: #94a3b8;">
        Hi <strong style="color: #ECE4DE;">\${devName}</strong>, we received a request to reset your password.
      </p>
    </div>

    <div style="text-align: center; margin-bottom: 24px;">
      <p style="font-size: 13px; color: #94a3b8; margin: 0 0 16px; line-height: 1.6;">
        Click the button below to choose a new password. This link expires in <strong style="color: #ECE4DE;">15 minutes</strong>.
      </p>
      <a href="\${resetLink}" style="display: inline-block; background-color: ${BRAND_COLOR}; color: #ffffff; font-weight: 700; font-size: 13px; padding: 14px 36px; border-radius: 10px; text-decoration: none; letter-spacing: 0.3px;">
        Reset Password →
      </a>
    </div>

    <div style="background-color: #1c1917; border: 1px solid #422006; border-radius: 8px; padding: 12px 16px;">
      <div style="font-size: 11px; color: #f59e0b; font-weight: 700;">⚠️ Security Notice</div>
      <div style="font-size: 11px; color: #94a3b8; margin-top: 4px; line-height: 1.5;">
        If you did not request this password reset, please ignore this email. Your account remains secure.
      </div>
    </div>
  \`;
  return baseLayout(content);
}
