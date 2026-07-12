const logger = require('../utils/logger');

// Format phone number to E.164
const formatPhone = (phone) => {
  let formatted = phone.trim();
  if (!formatted.startsWith('+')) {
    if (formatted.length === 10) {
      formatted = `+91${formatted}`;
    } else {
      formatted = `+${formatted}`;
    }
  }
  return formatted;
};

/**
 * Sends a verification code using Twilio Verify API.
 */
exports.sendVerificationOtp = async (to) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!accountSid || !authToken || !serviceSid) {
    logger.warn(`[SMS MOCK] Twilio Verify credentials missing. Mocking verification request to ${to}`);
    return { success: true, mock: true };
  }

  const formattedTo = formatPhone(to);
  const url = `https://verify.twilio.com/v2/Services/${serviceSid}/Verifications`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  const params = new URLSearchParams();
  params.append('To', formattedTo);
  params.append('Channel', 'sms');

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
      logger.error('Twilio Verify request failed:', data);
      throw new Error(data.message || 'Failed to request verification via Twilio');
    }

    logger.info(`Twilio Verify request successfully sent to ${formattedTo}: status=${data.status}`);
    return { success: true, sid: data.sid };
  } catch (error) {
    logger.error('Error in Twilio Verify send service:', error.message);
    throw error;
  }
};

/**
 * Validates a verification code using Twilio Verify API.
 */
exports.checkVerificationOtp = async (to, code) => {
  const accountSid = process.env.TWILIO_ACCOUNT_SID;
  const authToken = process.env.TWILIO_AUTH_TOKEN;
  const serviceSid = process.env.TWILIO_VERIFY_SERVICE_SID;

  if (!accountSid || !authToken || !serviceSid) {
    logger.warn(`[SMS MOCK] Twilio Verify credentials missing. Mocking verification check for ${to}`);
    if (code === '123456') {
      return { success: true, mock: true };
    }
    throw new Error('Invalid verification code');
  }

  const formattedTo = formatPhone(to);
  const url = `https://verify.twilio.com/v2/Services/${serviceSid}/VerificationChecks`;
  const auth = Buffer.from(`${accountSid}:${authToken}`).toString('base64');

  const params = new URLSearchParams();
  params.append('To', formattedTo);
  params.append('Code', code);

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
      logger.error('Twilio Verify check failed:', data);
      throw new Error(data.message || 'Failed to check verification via Twilio');
    }

    if (data.status !== 'approved') {
      throw new Error('Invalid verification code');
    }

    logger.info(`Twilio Verify check approved for ${formattedTo}`);
    return { success: true };
  } catch (error) {
    logger.error('Error in Twilio Verify check service:', error.message);
    throw error;
  }
};
