const brand = 'WarrantyPass';

function layout(title: string, content: string, actionLabel?: string, actionUrl?: string): string {
  const action =
    actionLabel && actionUrl
      ? `<p style="margin:28px 0"><a href="${escapeHtml(actionUrl)}" style="background:#167565;color:#fff;padding:12px 18px;border-radius:8px;text-decoration:none;font-weight:700">${escapeHtml(actionLabel)}</a></p>`
      : '';
  return `<!doctype html><html><body style="margin:0;background:#f7f8f6;color:#17201c;font-family:Arial,sans-serif"><div style="max-width:600px;margin:auto;padding:32px 20px"><p style="font-size:20px;font-weight:800;color:#167565">${brand}</p><div style="background:#fff;border:1px solid #e0e5e2;border-radius:12px;padding:28px"><h1 style="font-size:24px">${escapeHtml(title)}</h1>${content}${action}</div><p style="font-size:12px;color:#56635d;line-height:1.6">This message was sent by WarrantyPass. Never share passwords or verification codes by reply.</p></div></body></html>`;
}

export function verificationEmail(input: { verificationUrl: string; expiresInHours: number }): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = 'Verify your WarrantyPass email';
  return {
    subject,
    html: layout(
      subject,
      `<p>Confirm your email to protect your WarrantyPass account. This link expires in ${input.expiresInHours} hours and can be used once.</p>`,
      'Verify email',
      input.verificationUrl,
    ),
    text: `${subject}\n\nOpen this single-use link within ${input.expiresInHours} hours:\n${input.verificationUrl}`,
  };
}

export function passwordResetEmail(input: { resetUrl: string; expiresInMinutes: number }): {
  subject: string;
  html: string;
  text: string;
} {
  const subject = 'Reset your WarrantyPass password';
  return {
    subject,
    html: layout(
      subject,
      `<p>A password reset was requested. The link expires in ${input.expiresInMinutes} minutes. Ignore this message if you did not request it.</p>`,
      'Reset password',
      input.resetUrl,
    ),
    text: `${subject}\n\nOpen this link within ${input.expiresInMinutes} minutes:\n${input.resetUrl}\n\nIgnore this message if you did not request it.`,
  };
}

export function invitationEmail(input: {
  businessName: string;
  invitationUrl: string;
  expiresInDays: number;
  personalMessage?: string | undefined;
}): { subject: string; html: string; text: string } {
  const subject = `Invitation to join ${input.businessName} on WarrantyPass`;
  const message = input.personalMessage
    ? `<p><strong>Message from the inviter:</strong> ${escapeHtml(input.personalMessage)}</p>`
    : '';
  return {
    subject,
    html: layout(
      subject,
      `<p>You have been invited to join a business workspace. The invitation expires in ${input.expiresInDays} days and must be accepted by the invited email account.</p>${message}`,
      'Review invitation',
      input.invitationUrl,
    ),
    text: `${subject}\n\nOpen this invitation within ${input.expiresInDays} days:\n${input.invitationUrl}${input.personalMessage ? `\n\nMessage: ${input.personalMessage}` : ''}`,
  };
}

export function businessDecisionEmail(input: {
  businessName: string;
  decision: 'approved' | 'more-information' | 'rejected' | 'suspended';
  reason?: string | undefined;
  actionUrl: string;
}): { subject: string; html: string; text: string } {
  const labels = {
    approved: 'Business verification approved',
    'more-information': 'More information is required',
    rejected: 'Business verification decision',
    suspended: 'Business access suspended',
  } as const;
  const subject = `${labels[input.decision]} — ${input.businessName}`;
  const reason = input.reason ? `<p>${escapeHtml(input.reason)}</p>` : '';
  return {
    subject,
    html: layout(subject, reason, 'Open WarrantyPass', input.actionUrl),
    text: `${subject}${input.reason ? `\n\n${input.reason}` : ''}\n\n${input.actionUrl}`,
  };
}

export function securityNotificationEmail(input: {
  title: string;
  description: string;
  securityUrl: string;
}): { subject: string; html: string; text: string } {
  return {
    subject: input.title,
    html: layout(
      input.title,
      `<p>${escapeHtml(input.description)}</p>`,
      'Review account security',
      input.securityUrl,
    ),
    text: `${input.title}\n\n${input.description}\n\n${input.securityUrl}`,
  };
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ??
      character,
  );
}
