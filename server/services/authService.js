const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

exports.hashPassword = async (password) => {
  return await bcrypt.hash(password, 10);
};

exports.comparePasswords = async (password, hash) => {
  try {
    return await bcrypt.compare(password, hash);
  } catch (e) {
    return false;
  }
};

exports.generateAccessToken = (userId, role) => {
  return jwt.sign({ user_id: userId, role }, process.env.JWT_SECRET, { expiresIn: '15m' });
};

exports.generateRefreshToken = (userId, role) => {
  return jwt.sign({ user_id: userId, role }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
};

exports.verifyRefreshToken = (token) => {
  return jwt.verify(token, process.env.JWT_REFRESH_SECRET);
};
