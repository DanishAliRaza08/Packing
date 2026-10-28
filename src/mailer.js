// Sends emails by SMTP. If SMTP isn't configured, emails are logged instead.
const nodemailer = require("nodemailer");

function createMailer(smtp) {
  const transport = smtp.host
    ? nodemailer.createTransport({
        host: smtp.host,
        port: smtp.port,
        secure: smtp.port === 465,
        auth: smtp.user ? { user: smtp.user, pass: smtp.password } : undefined,
        connectionTimeout: 15000,
      })
    : null;

  return async function sendEmail(to, subject, text, replyTo) {
    if (!transport) {
      console.info(`SMTP not configured; email to ${to} not sent: ${subject}`);
      return false;
    }
    try {
      await transport.sendMail({ from: smtp.from, to, subject, text, replyTo });
      return true;
    } catch (err) {
      console.error(`Could not send email to ${to}:`, err.message);
      return false;
    }
  };
}

module.exports = { createMailer };
