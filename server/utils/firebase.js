const admin = require('firebase-admin');
const path = require('path');
const fs = require('fs');
const logger = require('./logger');

const serviceAccountPath = path.join(__dirname, '../firebase-admin.json');

let firebaseAdmin = null;

try {
  if (fs.existsSync(serviceAccountPath)) {
    const serviceAccount = require(serviceAccountPath);
    firebaseAdmin = admin.initializeApp({
      credential: admin.credential.cert(serviceAccount)
    });
    logger.info('Firebase Admin initialized successfully');
  } else {
    logger.warn('firebase-admin.json service account key not found. Firebase notifications will be logged to console only.');
  }
} catch (error) {
  logger.error('Error initializing Firebase Admin SDK:', error);
}

module.exports = firebaseAdmin;
