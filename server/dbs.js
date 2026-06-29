const mysql = require('mysql2');

const pool = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: 'root',
  database: 'App',
  waitForConnections: true,
  connectionLimit: 15,
  queueLimit: 0
});

console.log('Connected to MySQL connection pool.');

module.exports = pool;

