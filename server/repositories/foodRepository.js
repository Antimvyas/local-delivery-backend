const db = require('../config/db');

exports.findFoodById = (foodId) => {
  return new Promise((resolve, reject) => {
    db.query('SELECT * FROM food WHERE food_id = ?', [foodId], (err, results) => {
      if (err) return reject(err);
      resolve(results[0] || null);
    });
  });
};

exports.findFoods = (vendorId) => {
  return new Promise((resolve, reject) => {
    db.query(
      'SELECT food_id, food_name, cost, food_img, food_img_public_id, food_type, food_description, is_available, vendor_id FROM food WHERE vendor_id = ?',
      [vendorId],
      (err, results) => {
        if (err) return reject(err);
        resolve(results);
      }
    );
  });
};

exports.createFood = (foodData) => {
  return new Promise((resolve, reject) => {
    const { food_name, cost, food_img, food_img_public_id, food_type, food_description, vendor_id } = foodData;
    const sql = `
      INSERT INTO food (food_name, cost, food_img, food_img_public_id, food_type, food_description, vendor_id)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;
    db.query(
      sql,
      [food_name, cost, food_img, food_img_public_id, food_type, food_description, vendor_id],
      (err, result) => {
        if (err) return reject(err);
        resolve(result.insertId);
      }
    );
  });
};

exports.updateFood = (foodId, foodData) => {
  return new Promise((resolve, reject) => {
    const fields = [];
    const values = [];

    Object.keys(foodData).forEach((key) => {
      fields.push(`${key} = ?`);
      values.push(foodData[key]);
    });

    values.push(foodId);
    const sql = `UPDATE food SET ${fields.join(', ')} WHERE food_id = ?`;

    db.query(sql, values, (err, result) => {
      if (err) return reject(err);
      resolve(result.affectedRows > 0);
    });
  });
};

exports.deleteFood = (foodId) => {
  return new Promise((resolve, reject) => {
    db.query('DELETE FROM food WHERE food_id = ?', [foodId], (err, result) => {
      if (err) return reject(err);
      resolve(result.affectedRows > 0);
    });
  });
};

exports.verifyFoodOwnership = (foodId, vendorId) => {
  return new Promise((resolve, reject) => {
    db.query('SELECT vendor_id FROM food WHERE food_id = ?', [foodId], (err, results) => {
      if (err) return reject(err);
      if (results.length === 0) return resolve(false);
      const belongs = parseInt(results[0].vendor_id) === parseInt(vendorId);
      resolve(belongs);
    });
  });
};
