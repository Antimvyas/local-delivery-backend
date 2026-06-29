const db = require('./dbs.js');

function query(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });
}

async function main() {
  console.log("--- Starting Database Migration for Location Phase ---");
  try {
    // 1. Create customer_addresses table
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS customer_addresses (
        address_id INT AUTO_INCREMENT PRIMARY KEY,
        customer_id INT NOT NULL,
        address_type ENUM('home', 'work', 'other', 'current') NOT NULL,
        latitude DECIMAL(10, 8) NOT NULL,
        longitude DECIMAL(11, 8) NOT NULL,
        formatted_address VARCHAR(255) NOT NULL,
        is_default TINYINT(1) DEFAULT 0,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (customer_id) REFERENCES customer(customer_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await query(createTableSQL);
    console.log("✅ Table 'customer_addresses' verified/created successfully.");

    // 2. Add location columns to vendor table if they don't exist
    const addColumnsSQL = [
      "ALTER TABLE vendor ADD COLUMN latitude DECIMAL(10, 8) NULL",
      "ALTER TABLE vendor ADD COLUMN longitude DECIMAL(11, 8) NULL",
      "ALTER TABLE vendor ADD COLUMN formatted_address VARCHAR(255) NULL",
      "ALTER TABLE vendor ADD COLUMN service_radius DECIMAL(5, 2) DEFAULT 5.00"
    ];

    for (const sql of addColumnsSQL) {
      try {
        await query(sql);
      } catch (err) {
        // Some older MySQL versions might fail on IF NOT EXISTS inside ALTER TABLE
        // In that case, we catch the error if columns already exist
        if (!err.message.includes("Duplicate column name")) {
          console.warn(`Warning during column addition: ${err.message}`);
        }
      }
    }
    console.log("✅ Vendor table location columns verified/added successfully.");
    console.log("🎉 Database migration complete!");
  } catch (err) {
    console.error("❌ Database migration failed:", err);
  } finally {
    db.end();
  }
}

main();
