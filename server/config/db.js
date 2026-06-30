const mysql = require('mysql2');

let pool;

if (process.env.DATABASE_URL) {
  // Support Railway connection string URL
  pool = mysql.createPool(process.env.DATABASE_URL);
} else {
  // Support separate credentials
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'root',
    database: process.env.DB_NAME || 'App',
    port: parseInt(process.env.DB_PORT || '3306', 10),
    waitForConnections: true,
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '15', 10),
    queueLimit: 0
  });
}

console.log('Connected to MySQL connection pool.');

module.exports = pool;
