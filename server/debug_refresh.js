const pool = require('./dbs');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

// Set env variables if not loaded
process.env.JWT_SECRET = "super_secret_access_key_123!";
process.env.JWT_REFRESH_SECRET = "super_secret_refresh_key_456!";

async function debugRefresh() {
  const username = 'cust_1781842888866';
  pool.query('SELECT * FROM customer WHERE username = ?', [username], async (err, rows) => {
    if (err) {
      console.error(err);
      process.exit(1);
    }
    if (rows.length === 0) {
      console.log('Customer not found, please run verify_full_auth first.');
      process.exit(1);
    }
    const user = rows[0];
    console.log('User ID:', user.customer_id);
    console.log('Stored hashed refresh token:', user.refresh_token);

    // Let's perform a fresh login and save
    const userId = user.customer_id;
    const refreshToken = jwt.sign({ user_id: userId, role: 'customer' }, process.env.JWT_REFRESH_SECRET, { expiresIn: '7d' });
    const hashedRefreshToken = await bcrypt.hash(refreshToken, 10);

    pool.query('UPDATE customer SET refresh_token = ? WHERE customer_id = ?', [hashedRefreshToken, userId], (err) => {
      if (err) {
        console.error(err);
        process.exit(1);
      }
      console.log('Updated refresh token in DB.');

      pool.query('SELECT refresh_token FROM customer WHERE customer_id = ?', [userId], async (err, result) => {
        if (err || result.length === 0) {
          console.error('Error fetching back:', err);
          process.exit(1);
        }
        const storedHash = result[0].refresh_token;
        console.log('Fetched stored hash:', storedHash);
        
        const isValid = await bcrypt.compare(refreshToken, storedHash);
        console.log('Is valid with bcrypt.compare:', isValid);
        process.exit(0);
      });
    });
  });
}

debugRefresh();
