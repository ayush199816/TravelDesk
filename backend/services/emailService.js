const axios = require('axios');

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';

const sendEmail = async ({ to, subject, text, html }) => {
  const apiKey = process.env.BREVO_API_KEY;
  const senderEmail = process.env.EMAIL_FROM || 'noreply@dmcstation.com';

  if (!apiKey) {
    console.warn('Email service not configured. Set BREVO_API_KEY in .env');
    return { success: false, reason: 'not_configured' };
  }

  try {
    const response = await axios.post(
      BREVO_API_URL,
      {
        sender: { email: senderEmail, name: 'DMC Station' },
        to: [{ email: to }],
        subject,
        textContent: text,
        htmlContent: html
      },
      {
        headers: {
          'api-key': apiKey,
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        }
      }
    );

    console.log('Email sent via Brevo API:', response.data.messageId);
    return { success: true, messageId: response.data.messageId };
  } catch (error) {
    const errorMessage = error.response?.data?.message || error.message;
    console.error('Brevo email send error:', errorMessage);
    return { success: false, reason: errorMessage };
  }
};

module.exports = { sendEmail };
