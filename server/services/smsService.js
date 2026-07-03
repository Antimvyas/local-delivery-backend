const logger = require('../utils/logger');

/**
 * Sends an SMS message to a phone number.
 * Integrates with Twilio API using native fetch.
 * If credentials are not set, it falls back to mock logging.
 */
exports.sendSMS = async (to, body) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const fromNumber = process.env.TWILIO_PHONE_NUMBER;

  if (!accountSid || !authToken || !fromNumber) {
    logger.warn(`[SMS MOCK] Twilio credentials missing. Logging OTP message: "${body}" to ${to}`);
    return { success: true, mock: true };
  }

  // Format recipient number to E.164 if it does not start with +
  let formattedTo = to.trim();
  if (!formattedTo.startsWith('+')) {
    if (formattedTo.length === 10) {
      formattedTo = `+91${formattedTo}`;
    } else {
      formattedTo = `+${formattedTo}`;
    }
  }

  const url = `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  const params = new URLSearchParams();
  params.append('To', formattedTo);
  params.append('From', fromNumber);
  params.append('Body', body);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: params.toString(),
    });

    const data = await response.json();
    if (!response.ok) {
      logger.error('Twilio SMS sending failed:', data);
      throw new Error(data.message || 'Failed to send SMS via Twilio');
    }

    logger.info(`SMS sent successfully via Twilio: SID=${data.sid} to ${formattedTo}`);
    return { success: true, sid: data.sid };
  } catch (error) {
    logger.error('Error in SMS service:', error.message);
    throw error;
  }
};
