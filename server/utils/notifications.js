const db = require('../dbs.js');
const firebaseAdmin = require('./firebase.js');
const logger = require('./logger.js');

/**
 * Saves/updates FCM token for a user on a specific device
 */
function saveFcmToken(userId, role, token, deviceId) {
  return new Promise((resolve, reject) => {
    if (!userId || !role || !token || !deviceId) {
      logger.error('Missing parameters in saveFcmToken');
      return reject(new Error('Missing parameters'));
    }
    const query = `
      INSERT INTO user_fcm_tokens (user_id, role, fcm_token, device_id)
      VALUES (?, ?, ?, ?)
      ON DUPLICATE KEY UPDATE fcm_token = VALUES(fcm_token), updated_at = CURRENT_TIMESTAMP
    `;
    db.query(query, [userId, role, token, deviceId], (err, result) => {
      if (err) {
        logger.error(`Failed to save FCM token for ${role} ${userId}:`, err);
        return reject(err);
      }
      logger.info(`FCM token registered successfully for ${role} ${userId} on device ${deviceId}`);
      resolve(result);
    });
  });
}

/**
 * Deletes FCM token for a user on a specific device (logout cleanup)
 */
function deleteFcmToken(userId, role, deviceId) {
  return new Promise((resolve, reject) => {
    if (!userId || !role || !deviceId) {
      logger.error('Missing parameters in deleteFcmToken');
      return reject(new Error('Missing parameters'));
    }
    const query = `
      DELETE FROM user_fcm_tokens 
      WHERE user_id = ? AND role = ? AND device_id = ?
    `;
    db.query(query, [userId, role, deviceId], (err, result) => {
      if (err) {
        logger.error(`Failed to delete FCM token for ${role} ${userId}:`, err);
        return reject(err);
      }
      logger.info(`FCM token removed for ${role} ${userId} on device ${deviceId}`);
      resolve(result);
    });
  });
}

/**
 * Sends a push notification to all registered devices of a user
 */
function sendPushNotification(userId, role, title, body, type, screen) {
  return new Promise((resolve, reject) => {
    if (!userId || !role) {
      logger.error('Missing userId or role in sendPushNotification');
      return resolve();
    }
    // 1. Fetch tokens for this user
    const query = `
      SELECT fcm_token 
      FROM user_fcm_tokens 
      WHERE user_id = ? AND role = ?
    `;
    db.query(query, [userId, role], async (err, results) => {
      if (err) {
        logger.error(`Database error fetching FCM tokens for ${role} ${userId}:`, err);
        return reject(err);
      }

      const dataPayload = {
        type: String(type || ''),
        screen: String(screen || ''),
        user_id: String(userId),
        role: String(role)
      };

      if (!results || results.length === 0) {
        logger.info(`No registered FCM tokens found for ${role} ${userId}. Notification logged only.`);
        logger.info(`[Offline Notification] Recipient: ${role} ID ${userId} | Title: "${title}" | Body: "${body}" | Data:`, dataPayload);
        return resolve();
      }

      const tokens = results.map(row => row.fcm_token);
      logger.info(`Sending notification to ${role} ID ${userId} on ${tokens.length} devices...`);

      if (!firebaseAdmin) {
        logger.warn(`Firebase Admin not initialized. Logging notification instead:`);
        logger.info(`[FCM Mock Send] Recipient: ${role} ID ${userId} | Title: "${title}" | Body: "${body}" | Data:`, dataPayload);
        return resolve();
      }

      // Send to multiple tokens using multicast
      const message = {
        notification: {
          title: title,
          body: body
        },
        data: dataPayload,
        tokens: tokens
      };

      try {
        const response = await firebaseAdmin.messaging().sendEachForMulticast(message);
        logger.info(`FCM multicast sent successfully. Success: ${response.successCount}, Failure: ${response.failureCount}`);
        
        // Clean up invalid/expired tokens returned from FCM response
        if (response.failureCount > 0) {
          response.responses.forEach((resp, idx) => {
            if (!resp.success) {
              const errCode = resp.error?.code;
              // If token is invalid or unregistered, clean it up from our database
              if (errCode === 'messaging/invalid-registration-token' || errCode === 'messaging/registration-token-not-registered') {
                const badToken = tokens[idx];
                db.query(`DELETE FROM user_fcm_tokens WHERE fcm_token = ?`, [badToken], (cleanupErr) => {
                  if (cleanupErr) logger.error('Failed to cleanup invalid token:', cleanupErr);
                  else logger.info('Cleaned up stale FCM token successfully.');
                });
              }
            }
          });
        }
        
        resolve(response);
      } catch (fcmError) {
        logger.error(`Error sending multicast push notifications:`, fcmError);
        reject(fcmError);
      }
    });
  });
}

module.exports = {
  saveFcmToken,
  deleteFcmToken,
  sendPushNotification
};
