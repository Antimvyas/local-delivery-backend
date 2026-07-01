const mysql = require('mysql2');

let pool;

if (process.env.DATABASE_URL) {
  // Support Railway connection string URL
  pool = mysql.createPool(process.env.DATABASE_URL);
} else {
  // Support separate credentials
  pool = mysql.createPool({
    host: process.env.MYSQLHOST || process.env.DB_HOST || 'localhost',
    user: process.env.MYSQLUSER || process.env.DB_USER || 'root',
    password: process.env.MYSQLPASSWORD || process.env.DB_PASSWORD || 'root',
    database: process.env.MYSQLDATABASE || process.env.DB_NAME || 'App',
    port: parseInt(process.env.MYSQLPORT || process.env.DB_PORT || '3306', 10),
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '15', 10),
    queueLimit: 0
  });
}

console.log('Connected to MySQL connection pool.');

pool.query('SELECT 1', (err) => {
  if (err) {
    console.error('Database connection test failed:', err.message);
  } else {
    console.log('Database connection test passed successfully.');
  }
});

module.exports = pool;
