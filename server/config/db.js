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

let customerTable = (process.env.DATABASE_URL || process.env.MYSQLHOST) ? 'customers' : 'customer';

console.log('Connected to MySQL connection pool.');

pool.query('SHOW TABLES', (err, results) => {
  if (err) {
    console.error('Database tables query failed:', err.message);
  } else if (results && results.length > 0) {
    // Determine table names from the results object array
    const tableNames = results.map(row => Object.values(row)[0].toLowerCase());
    if (tableNames.includes('customers')) {
      customerTable = 'customers';
      console.log('Database table mapping detected: using "customers" (plural)');
    } else {
      customerTable = 'customer';
      console.log('Database table mapping detected: using "customer" (singular)');
    }
  }
});

// Wrap query and execute methods to dynamically adapt table references in sql queries
const wrapSql = (sql) => {
  if (typeof sql === 'string' && customerTable === 'customers') {
    return sql.replace(/\bcustomer\b/g, 'customers');
  }
  if (sql && typeof sql.sql === 'string' && customerTable === 'customers') {
    sql.sql = sql.sql.replace(/\bcustomer\b/g, 'customers');
  }
  return sql;
};

const originalQuery = pool.query;
pool.query = function (sql, values, cb) {
  const finalSql = wrapSql(sql);
  return originalQuery.call(this, finalSql, values, cb);
};

const originalExecute = pool.execute;
pool.execute = function (sql, values, cb) {
  const finalSql = wrapSql(sql);
  return originalExecute.call(this, finalSql, values, cb);
};

// Initial simple connection ping
pool.query('SELECT 1', (err) => {
  if (err) {
    console.error('Database connection test failed:', err.message);
  } else {
    console.log('Database connection test passed successfully.');
  }
});

module.exports = pool;

