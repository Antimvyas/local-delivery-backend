const authRepository = require('../repositories/authRepository');
const authService = require('../services/authService');
const logger = require('../utils/logger');
const { deleteFcmToken, saveFcmToken } = require('../utils/notifications');
const smsService = require('../services/smsService');

if (!global.otpCache) {
  global.otpCache = new Map();
}
const otpCache = global.otpCache;

// Simple response formatting helper
const sendSuccess = (res, message, data, status = 200) => {
  return res.status(status).json({
    success: true,
    message,
    data
  });
};

exports.register = async (req, res, next) => {
  try {
    const { username, Name, Phone, password, selectedOption, role: payloadRole, customer_address } = req.body;
    const role = (selectedOption || payloadRole || '').toLowerCase();
    const table = role === 'customer' ? 'customer' : 'vendor';

    const existingUsers = await authRepository.findUserByUsernameOrPhone(table, username, Phone);
    if (existingUsers && existingUsers.length > 0) {
      if (existingUsers.some(u => u.username === username)) {
        return res.status(400).json({ success: false, message: 'Username already exists!' });
      }
      if (existingUsers.some(u => u.Phone === Phone)) {
        return res.status(400).json({ success: false, message: 'Phone number already exists!' });
      }
    }

    const hashedPassword = await authService.hashPassword(password);
    const userId = await authRepository.createUser(table, {
      username,
      Name,
      Phone,
      password: hashedPassword,
      selectedOption: role,
      customer_address
    });

    const accessToken = authService.generateAccessToken(userId, role);
    const refreshToken = authService.generateRefreshToken(userId, role);
    const hashedRefreshToken = await authService.hashPassword(refreshToken);
    const idField = role === 'vendor' ? 'vendor_id' : 'customer_id';

    await authRepository.updateRefreshToken(table, idField, userId, hashedRefreshToken);

    logger.info(`User registered successfully: userId=${userId}, username=${username}, role=${role}`);

    return sendSuccess(res, 'User added successfully', {
      user_id: userId,
      customer_id: role === 'customer' ? userId : null,
      vendor_id: role === 'vendor' ? userId : null,
      role: role,
      username,
      accessToken,
      refreshToken
    }, 201);
  } catch (err) {
    next(err);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { username, password, role } = req.body;
    const cleanRole = role.toLowerCase();
    const table = cleanRole === 'customer' ? 'customer' : 'vendor';
    const idField = cleanRole === 'vendor' ? 'vendor_id' : 'customer_id';

    const users = await authRepository.findUserByUsernameOrPhone(table, username, username);
    if (!users || users.length === 0) {
      return res.status(401).json({ success: false, message: 'Username or phone not found' });
    }

    const dbUser = users[0];
    const isMatch = await authService.comparePasswords(password, dbUser.password);
    if (!isMatch) {
      return res.status(401).json({ success: false, message: 'Incorrect password' });
    }

    const userId = dbUser[idField];
    const accessToken = authService.generateAccessToken(userId, cleanRole);
    const refreshToken = authService.generateRefreshToken(userId, cleanRole);
    const hashedRefreshToken = await authService.hashPassword(refreshToken);

    await authRepository.updateRefreshToken(table, idField, userId, hashedRefreshToken);

    logger.info(`User logged in: userId=${userId}, role=${cleanRole}`);

    return sendSuccess(res, 'Login successful', {
      user_id: userId,
      role: cleanRole,
      customer_id: cleanRole === 'customer' ? userId : null,
      vendor_id: cleanRole === 'vendor' ? userId : null,
      accessToken,
      refreshToken
    });
  } catch (err) {
    next(err);
  }
};

exports.sendOtp = async (req, res, next) => {
  try {
    const { phone } = req.body;
    await smsService.sendVerificationOtp(phone);
    return sendSuccess(res, 'OTP sent successfully', { phone });
  } catch (err) {
    next(err);
  }
};

exports.verifyOtp = async (req, res, next) => {
  try {
    const { phone, otp } = req.body;
    await smsService.checkVerificationOtp(phone, otp);

    const customer = await authRepository.findCustomerByPhone(phone);
    if (customer) {
      const userId = customer.customer_id;
      const role = 'customer';
      const accessToken = authService.generateAccessToken(userId, role);
      const refreshToken = authService.generateRefreshToken(userId, role);
      const hashedRefreshToken = await authService.hashPassword(refreshToken);

      await authRepository.updateRefreshToken('customer', 'customer_id', userId, hashedRefreshToken);

      logger.info(`Customer logged in via OTP verification: customerId=${userId}`);

      return sendSuccess(res, 'OTP verified and login successful', {
        isNewUser: false,
        accessToken,
        refreshToken,
        role,
        user_id: userId,
        customer_id: userId
      });
    } else {
      logger.info(`OTP verified for new user with phone=${phone}`);
      return sendSuccess(res, 'OTP verified. Please proceed to registration.', {
        isNewUser: true,
        phone
      });
    }
  } catch (err) {
    next(err);
  }
};

exports.registerOtp = async (req, res, next) => {
  try {
    const { phone, name } = req.body;
    const username = `cust_${phone}`;

    const existingUsers = await authRepository.findUserByUsernameOrPhone('customer', username, phone);
    if (existingUsers && existingUsers.length > 0) {
      return res.status(400).json({ success: false, message: 'Phone number or username already registered' });
    }

    const dummyPassword = Math.random().toString(36).slice(-8) + '1a';
    const hashedPassword = await authService.hashPassword(dummyPassword);

    const userId = await authRepository.createUser('customer', {
      username,
      Name: name,
      Phone: phone,
      password: hashedPassword,
      selectedOption: 'customer'
    });

    const role = 'customer';
    const accessToken = authService.generateAccessToken(userId, role);
    const refreshToken = authService.generateRefreshToken(userId, role);
    const hashedRefreshToken = await authService.hashPassword(refreshToken);

    await authRepository.updateRefreshToken('customer', 'customer_id', userId, hashedRefreshToken);

    logger.info(`Customer registered via OTP: customerId=${userId}`);

    return sendSuccess(res, 'Account created successfully', {
      accessToken,
      refreshToken,
      role,
      user_id: userId,
      customer_id: userId
    }, 201);
  } catch (err) {
    next(err);
  }
};

exports.refresh = async (req, res, next) => {
  try {
    const { refreshToken, role, user_id } = req.body;
    if (!refreshToken || !role || !user_id) {
      return res.status(400).json({ success: false, message: 'Missing refresh token' });
    }

    const cleanRole = role.toLowerCase();
    const table = cleanRole === 'customer' ? 'customer' : 'vendor';
    const idField = cleanRole === 'vendor' ? 'vendor_id' : 'customer_id';

    const storedHashedToken = await authRepository.getRefreshToken(table, idField, user_id);
    if (!storedHashedToken) {
      return res.status(403).json({ success: false, message: 'Invalid refresh token' });
    }

    const isMatch = await authService.comparePasswords(refreshToken, storedHashedToken);
    if (!isMatch) {
      return res.status(403).json({ success: false, message: 'Invalid refresh token' });
    }

    try {
      authService.verifyRefreshToken(refreshToken);
    } catch (err) {
      return res.status(403).json({ success: false, message: 'Refresh token expired' });
    }

    const newAccessToken = authService.generateAccessToken(user_id, cleanRole);

    return sendSuccess(res, 'Token refreshed successfully', {
      accessToken: newAccessToken
    });
  } catch (err) {
    next(err);
  }
};

exports.logout = async (req, res, next) => {
  try {
    const { device_id } = req.body;
    const { user_id, role } = req.user;
    const table = role === 'customer' ? 'customer' : 'vendor';
    const idField = role === 'vendor' ? 'vendor_id' : 'customer_id';

    await authRepository.updateRefreshToken(table, idField, user_id, null);

    if (device_id) {
      try {
        await deleteFcmToken(user_id, role, device_id);
      } catch (e) {
        logger.error('Error removing FCM token during logout:', e);
      }
    }

    logger.info(`User logged out: userId=${user_id}`);

    return sendSuccess(res, 'Logged out successfully', {});
  } catch (err) {
    next(err);
  }
};

exports.updateFcmToken = async (req, res, next) => {
  try {
    const { fcm_token, device_id } = req.body;
    const { user_id, role } = req.user;

    if (!fcm_token || !device_id) {
      return res.status(400).json({ success: false, message: 'fcm_token and device_id are required' });
    }

    await saveFcmToken(user_id, role, fcm_token, device_id);

    return sendSuccess(res, 'FCM token updated successfully', {});
  } catch (err) {
    next(err);
  }
};
