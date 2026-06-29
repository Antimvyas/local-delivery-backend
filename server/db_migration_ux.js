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
  console.log("--- Starting UX Database Migration ---");
  try {
    // 1. Alter vendor table
    const alterVendorColumns = [
      "ALTER TABLE vendor ADD COLUMN shop_number VARCHAR(50) NULL",
      "ALTER TABLE vendor ADD COLUMN landmark VARCHAR(150) NULL",
      "ALTER TABLE vendor ADD COLUMN pocket VARCHAR(50) NULL",
      "ALTER TABLE vendor ADD COLUMN sector VARCHAR(50) NULL",
      "ALTER TABLE vendor ADD COLUMN city VARCHAR(50) NULL",
      "ALTER TABLE vendor ADD COLUMN state VARCHAR(50) NULL",
      "ALTER TABLE vendor ADD COLUMN structured_address JSON NULL"
    ];

    for (const sql of alterVendorColumns) {
      try {
        await query(sql);
      } catch (err) {
        if (!err.message.includes("Duplicate column name")) {
          console.warn(`Warning during vendor alter: ${err.message}`);
        }
      }
    }
    console.log("✅ Vendor table structured address fields verified/added.");

    // 2. Alter customer_addresses table
    const alterCustomerAddressColumns = [
      "ALTER TABLE customer_addresses ADD COLUMN house_no VARCHAR(50) NULL",
      "ALTER TABLE customer_addresses ADD COLUMN building_name VARCHAR(150) NULL",
      "ALTER TABLE customer_addresses ADD COLUMN floor VARCHAR(20) NULL",
      "ALTER TABLE customer_addresses ADD COLUMN landmark VARCHAR(150) NULL",
      "ALTER TABLE customer_addresses ADD COLUMN area VARCHAR(150) NULL",
      "ALTER TABLE customer_addresses ADD COLUMN city VARCHAR(150) NULL",
      "ALTER TABLE customer_addresses ADD COLUMN state VARCHAR(150) NULL",
      "ALTER TABLE customer_addresses ADD COLUMN structured_address JSON NULL"
    ];

    for (const sql of alterCustomerAddressColumns) {
      try {
        await query(sql);
      } catch (err) {
        if (!err.message.includes("Duplicate column name")) {
          console.warn(`Warning during customer_addresses alter: ${err.message}`);
        }
      }
    }
    console.log("✅ Customer addresses structured fields verified/added.");

    // 3. Alter orders table
    const alterOrdersColumns = [
      "ALTER TABLE orders ADD COLUMN receiver_name VARCHAR(100) NULL",
      "ALTER TABLE orders ADD COLUMN receiver_phone VARCHAR(15) NULL"
    ];

    for (const sql of alterOrdersColumns) {
      try {
        await query(sql);
      } catch (err) {
        if (!err.message.includes("Duplicate column name")) {
          console.warn(`Warning during orders alter: ${err.message}`);
        }
      }
    }
    console.log("✅ Orders table receiver columns verified/added.");

    // 4. Alter udar_requests table
    const alterUdarRequestsColumns = [
      "ALTER TABLE udar_requests ADD COLUMN credit_limit DECIMAL(10, 2) DEFAULT 0.00"
    ];

    for (const sql of alterUdarRequestsColumns) {
      try {
        await query(sql);
      } catch (err) {
        if (!err.message.includes("Duplicate column name")) {
          console.warn(`Warning during udar_requests alter: ${err.message}`);
        }
      }
    }
    console.log("✅ Udar requests table credit_limit column verified/added.");

    // 5. Create order_reviews table
    const createReviewsTableSQL = `
      CREATE TABLE IF NOT EXISTS order_reviews (
        review_id INT AUTO_INCREMENT PRIMARY KEY,
        order_id INT NOT NULL,
        customer_id INT NOT NULL,
        vendor_id INT NOT NULL,
        rating INT NOT NULL,
        review_text TEXT NULL,
        delivered_successfully TINYINT(1) NOT NULL DEFAULT 1,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (order_id) REFERENCES orders(order_id) ON DELETE CASCADE,
        FOREIGN KEY (customer_id) REFERENCES customer(customer_id) ON DELETE CASCADE,
        FOREIGN KEY (vendor_id) REFERENCES vendor(vendor_id) ON DELETE CASCADE
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    `;
    await query(createReviewsTableSQL);
    console.log("✅ Table 'order_reviews' verified/created successfully.");

    console.log("🎉 UX Database migration complete!");
  } catch (err) {
    console.error("❌ Database migration failed:", err);
  } finally {
    db.end();
  }
}

main();
