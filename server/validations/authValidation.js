const validateRegistration = (req, res, next) => {
  const { username, Name, Phone, password, selectedOption } = req.body;

  if (!username || !Name || !Phone || !password || !selectedOption) {
    return res.status(400).json({ success: false, message: 'All fields are required.' });
  }

  if (password.length < 8 || password.length > 128) {
    return res.status(400).json({ success: false, message: 'Password must be between 8 and 128 characters long.' });
  }

  const hasLetter = /[a-zA-Z]/.test(password);
  const hasNumber = /[0-9]/.test(password);
  if (!hasLetter || !hasNumber) {
    return res.status(400).json({ success: false, message: 'Password must contain at least one letter and one number.' });
  }

  if (Phone.length !== 10 || !/^\d+$/.test(Phone)) {
    return res.status(400).json({ success: false, message: 'Phone number must be a valid 10-digit number.' });
  }

  next();
};

const validateLogin = (req, res, next) => {
  const { username, password, role } = req.body;
  if (!username || !password || !role) {
    return res.status(400).json({ success: false, message: 'Username, password, and role are required.' });
  }
  next();
};

const validateOtpSend = (req, res, next) => {
  const { phone } = req.body;
  if (!phone || phone.length !== 10 || !/^\d+$/.test(phone)) {
    return res.status(400).json({ success: false, message: 'Valid 10-digit phone number is required.' });
  }
  next();
};

const validateOtpVerify = (req, res, next) => {
  const { phone, otp } = req.body;
  if (!phone || !otp || otp.length !== 6) {
    return res.status(400).json({ success: false, message: 'Phone and 6-digit OTP are required.' });
  }
  next();
};

module.exports = {
  validateRegistration,
  validateLogin,
  validateOtpSend,
  validateOtpVerify
};
