const db = require('./dbs.js');
const fs = require('fs');

const query = (sql) => {
  return new Promise((resolve, reject) => {
    db.query(sql, (err, results) => {
      if (err) reject(err);
      else resolve(results);
    });
  });
};

async function main() {
  let output = '';
  const log = (msg) => {
    output += msg + '\n';
  };
  
  try {
    const tables = await query('SHOW TABLES');
    log('Tables in database:\n' + JSON.stringify(tables, null, 2));
    
    for (const row of tables) {
      const tableName = Object.values(row)[0];
      log(`\n==================================================`);
      log(`Schema for table: ${tableName}`);
      log(`==================================================`);
      const schema = await query(`DESCRIBE \`${tableName}\``);
      for (const col of schema) {
        log(`Field: ${col.Field}`);
        log(`  Type: ${col.Type}`);
        log(`  Null: ${col.Null}`);
        log(`  Key: ${col.Key}`);
        log(`  Default: ${col.Default}`);
        log(`  Extra: ${col.Extra}`);
        log('--------------------------------------------------');
      }
    }
    fs.writeFileSync('db_schema.txt', output);
    console.log('Schema written to db_schema.txt');
  } catch (err) {
    console.error('Error querying DB:', err);
  } finally {
    db.end();
  }
}

main();
