const db = require('../config/db');

exports.findUserByUsernameOrPhone = (table, username, phone) => {
  return new Promise((resolve, reject) => {
    db.query(
      `SELECT * FROM ${table} WHERE username = ? OR Phone = ?`,
      [username, phone],
      (err, results) => {
        if (err) return reject(err);
        resolve(results || []);
      }
    );
  });
};

exports.findCustomerByPhone = (phone) => {
  return new Promise((resolve, reject) => {
    db.query(
      'SELECT * FROM customer WHERE Phone = ? LIMIT 1',
      [phone],
      (err, results) => {
        if (err) return reject(err);
        resolve(results[0] || null);
      }
    );
  });
};

exports.createUser = (table, userData) => {
  return new Promise((resolve, reject) => {
    const { username, Name, Phone, password, selectedOption, customer_address } = userData;
    let query, params;
    if (selectedOption === 'customer') {
      query = `INSERT INTO ${table} (username, Name, Phone, password, selectedOption, customer_address) VALUES (?, ?, ?, ?, ?, ?)`;
      params = [username, Name, Phone, password, selectedOption, customer_address];
    } else {
      query = `INSERT INTO ${table} (username, Name, Phone, password, selectedOption) VALUES (?, ?, ?, ?, ?)`;
      params = [username, Name, Phone, password, selectedOption];
    }

    db.query(query, params, (err, result) => {
      if (err) return reject(err);
      resolve(result.insertId);
    });
  });
};

exports.updateRefreshToken = (table, idField, userId, token) => {
  return new Promise((resolve, reject) => {
    db.query(
      `UPDATE ${table} SET refresh_token = ? WHERE ${idField} = ?`,
      [token, userId],
      (err, result) => {
        if (err) return reject(err);
        resolve(result);
      }
    );
  });
};

exports.getRefreshToken = (table, idField, userId) => {
  return new Promise((resolve, reject) => {
    db.query(
      `SELECT refresh_token FROM ${table} WHERE ${idField} = ?`,
      [userId],
      (err, results) => {
        if (err) return reject(err);
        resolve(results && results.length > 0 ? results[0].refresh_token : null);
      }
    );
  });
};
