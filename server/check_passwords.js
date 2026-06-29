const pool = require('./dbs');

async function checkPasswords() {
  pool.query('SELECT customer_id, username, password FROM customer', (err, customers) => {
    if (err) {
      console.error('Error fetching customers:', err);
      process.exit(1);
    }
    console.log('--- CUSTOMERS ---');
    customers.forEach(c => {
      const isBcrypt = c.password.startsWith('$2b$') || c.password.startsWith('$2a$');
      console.log(`ID: ${c.customer_id} | Username: ${c.username} | Password Length: ${c.password.length} | Is Bcrypt: ${isBcrypt} | Sample: ${c.password.substring(0, 10)}...`);
    });

    pool.query('SELECT vendor_id, username, password FROM vendor', (err, vendors) => {
      if (err) {
        console.error('Error fetching vendors:', err);
        process.exit(1);
      }
      console.log('\n--- VENDORS ---');
      vendors.forEach(v => {
        const isBcrypt = v.password.startsWith('$2b$') || v.password.startsWith('$2a$');
        console.log(`ID: ${v.vendor_id} | Username: ${v.username} | Password Length: ${v.password.length} | Is Bcrypt: ${isBcrypt} | Sample: ${v.password.substring(0, 10)}...`);
      });
      process.exit(0);
    });
  });
}

checkPasswords();
