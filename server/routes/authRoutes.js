const express = require('express');
const authController = require('../controllers/authController');
const { verifyToken } = require('../middleware/authMiddleware');
const {
  validateRegistration,
  validateLogin,
  validateOtpSend,
  validateOtpVerify
} = require('../validations/authValidation');

const router = express.Router();

router.post('/set-data', validateRegistration, authController.register);
router.post('/login', validateLogin, authController.login);
router.post('/otp/send', validateOtpSend, authController.sendOtp);
router.post('/otp/verify', validateOtpVerify, authController.verifyOtp);
router.post('/otp/register', authController.registerOtp);
router.post('/refresh', authController.refresh);
router.post('/logout', verifyToken, authController.logout);
router.post('/update-fcm-token', verifyToken, authController.updateFcmToken);

module.exports = router;
