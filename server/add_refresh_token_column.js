const pool = require('./dbs');

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    pool.query(sql, params, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });
}

async function addColumns() {
  console.log('--- Checking for refresh_token column in customer & vendor tables ---');
  
  // Alter customer
  try {
    await query('ALTER TABLE customer ADD COLUMN refresh_token VARCHAR(255) NULL');
    console.log('✅ Added refresh_token column to customer table.');
  } catch (err) {
    if (err.message.includes('Duplicate column name')) {
      console.log('ℹ️ refresh_token column already exists in customer table.');
    } else {
      console.error('❌ Error altering customer table:', err.message);
    }
  }

  // Alter vendor
  try {
    await query('ALTER TABLE vendor ADD COLUMN refresh_token VARCHAR(255) NULL');
    console.log('✅ Added refresh_token column to vendor table.');
  } catch (err) {
    if (err.message.includes('Duplicate column name')) {
      console.log('ℹ️ refresh_token column already exists in vendor table.');
    } else {
      console.error('❌ Error altering vendor table:', err.message);
    }
  }

  console.log('🎉 Column check complete!');
  process.exit(0);
}

addColumns();
