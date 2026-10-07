const nodemailer = require('nodemailer');

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!process.env.SMTP_HOST) return null;
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT) || 587,
    secure: Number(process.env.SMTP_PORT) === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  return transporter;
}

async function sendMail({ to, subject, text }) {
  const recipient = to || process.env.DEFAULT_ALERT_EMAIL;
  if (!recipient) {
    console.log(`[mail] No recipient configured, skipping: ${subject}`);
    return;
  }
  const t = getTransporter();
  if (!t) {
    console.log(`[mail:console] To: ${recipient}\n  Subject: ${subject}\n  ${text.replace(/\n/g, '\n  ')}`);
    return;
  }
  try {
    await t.sendMail({
      from: process.env.MAIL_FROM || 'API Monitor <alerts@localhost>',
      to: recipient,
      subject,
      text,
    });
  } catch (err) {
    console.error('[mail] Failed to send:', err.message);
  }
}

function fmtDuration(ms) {
  return ms >= 1000 ? `${(ms / 1000).toFixed(1)} sec` : `${ms} ms`;
}

async function sendDownAlert(monitor, result) {
  const lines = [
    '🚨 ALERT',
    '',
    'API DOWN',
    '',
    `Name:     ${monitor.name}`,
    `URL:      ${monitor.url}`,
    `Status:   ${result.statusCode ?? 'no response'}`,
    `Response: ${result.responseMs != null ? fmtDuration(result.responseMs) : 'n/a'}`,
    `Reason:   ${result.error}`,
    `Time:     ${result.checkedAt.toISOString()}`,
  ];
  await sendMail({
    to: monitor.alertEmail,
    subject: `🚨 ${monitor.name} is DOWN`,
    text: lines.join('\n'),
  });
}

async function sendRecoveryAlert(monitor, result, downSince) {
  const downtimeMs = downSince ? result.checkedAt - downSince : 0;
  const lines = [
    '✅ RECOVERED',
    '',
    `${monitor.name} is back up.`,
    `URL:        ${monitor.url}`,
    `Status:     ${result.statusCode}`,
    `Response:   ${fmtDuration(result.responseMs)}`,
    downSince ? `Down for:   ${Math.round(downtimeMs / 60000)} min` : '',
  ].filter(Boolean);
  await sendMail({
    to: monitor.alertEmail,
    subject: `✅ ${monitor.name} has recovered`,
    text: lines.join('\n'),
  });
}

module.exports = { sendDownAlert, sendRecoveryAlert };
