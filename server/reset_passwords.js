const pool = require('./dbs');
const bcrypt = require('bcrypt');

async function reset() {
  const hash = await bcrypt.hash('Password123', 10);
  console.log('Hashed password:', hash);

  pool.query('UPDATE customer SET password = ? WHERE username = ?', [hash, 'john_doe'], (err, res) => {
    if (err) {
      console.error('Error customer:', err);
    } else {
      console.log('Customer password updated:', res.affectedRows);
    }

    pool.query('UPDATE vendor SET password = ? WHERE username = ?', [hash, 'test_vendor'], (err, res2) => {
      if (err) {
        console.error('Error vendor:', err);
      } else {
        console.log('Vendor password updated:', res2.affectedRows);
      }
      process.exit(0);
    });
  });
}

reset();
