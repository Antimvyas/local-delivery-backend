const http = require('http');
require('dotenv').config({ path: __dirname + '/../.env' });

function request(method, path, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...headers
      }
    };

    const req = http.request(options, (res) => {
      let responseBody = '';
      res.on('data', chunk => responseBody += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: JSON.parse(responseBody)
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            body: responseBody
          });
        }
      });
    });

    req.on('error', err => reject(err));
    if (body) req.write(data);
    req.end();
  });
}

async function runTests() {
  console.log("=========================================");
  console.log("=== FOOD CRUD INTEGRATION TEST SUITE ====");
  console.log("=========================================");

  const rand = Math.floor(Math.random() * 100000);
  const vendorPayload = {
    username: `vend_food_${rand}`,
    Name: 'Test Food Vendor',
    Phone: `9000${String(rand).padStart(6, '0')}`,
    password: 'password123',
    selectedOption: 'vendor'
  };

  let token = '';
  let vendorId = null;
  let foodId = null;

  // 1. Signup Vendor
  console.log("\n[TEST 1] Registering Vendor for Food Testing...");
  try {
    const res = await request('POST', '/api/v1/set-data', vendorPayload);
    console.log("Status:", res.statusCode);
    if (res.statusCode === 201 && res.body.success) {
      token = res.body.data.accessToken;
      vendorId = res.body.data.vendor_id;
      console.log("✅ Passed, vendorId:", vendorId);
    } else {
      console.log("❌ Failed:", res.body);
      process.exit(1);
    }
  } catch (e) {
    console.error("Error:", e);
    process.exit(1);
  }

  // 2. Add Food Item
  console.log("\n[TEST 2] Add Food Item (POST /food-set)...");
  try {
    const res = await request('POST', '/api/v1/food-set', {
      food_name: 'Super Deluxe Pizza',
      cost: '299.50',
      food_type: 'veg',
      food_description: 'Loaded with double cheese and green peppers'
    }, {
      'Authorization': `Bearer ${token}`
    });
    console.log("Status:", res.statusCode);
    console.log("Body:", JSON.stringify(res.body, null, 2));
    if (res.statusCode === 201 && res.body.success) {
      foodId = res.body.data.food_id;
      console.log("✅ Passed, foodId:", foodId);
    } else {
      console.log("❌ Failed");
      process.exit(1);
    }
  } catch (e) {
    console.error("Error:", e);
    process.exit(1);
  }

  // 3. Get Food Items
  console.log("\n[TEST 3] Get Food Items (GET /food)...");
  try {
    const res = await request('GET', `/api/v1/food?vendor_id=${vendorId}`);
    console.log("Status:", res.statusCode);
    console.log("Body:", JSON.stringify(res.body, null, 2));
    if (res.statusCode === 200 && Array.isArray(res.body) && res.body.length > 0) {
      console.log("✅ Passed");
    } else {
      console.log("❌ Failed");
      process.exit(1);
    }
  } catch (e) {
    console.error("Error:", e);
    process.exit(1);
  }

  // 4. Update Food Item
  console.log("\n[TEST 4] Update Food Item (POST /food-update)...");
  try {
    const res = await request('POST', '/api/v1/food-update', {
      food_id: foodId,
      food_name: 'Mega Deluxe Cheese Pizza',
      cost: '349.00',
      food_type: 'veg',
      food_description: 'Updated descriptions'
    }, {
      'Authorization': `Bearer ${token}`
    });
    console.log("Status:", res.statusCode);
    console.log("Body:", JSON.stringify(res.body, null, 2));
    if (res.statusCode === 200 && res.body.success) {
      console.log("✅ Passed");
    } else {
      console.log("❌ Failed");
      process.exit(1);
    }
  } catch (e) {
    console.error("Error:", e);
    process.exit(1);
  }

  // 5. Delete Food Item
  console.log("\n[TEST 5] Delete Food Item (DELETE /food-delete)...");
  try {
    const res = await request('DELETE', '/api/v1/food-delete', {
      food_id: foodId
    }, {
      'Authorization': `Bearer ${token}`
    });
    console.log("Status:", res.statusCode);
    console.log("Body:", JSON.stringify(res.body, null, 2));
    if (res.statusCode === 200 && res.body.success) {
      console.log("✅ Passed");
    } else {
      console.log("❌ Failed");
      process.exit(1);
    }
  } catch (e) {
    console.error("Error:", e);
    process.exit(1);
  }

  console.log("\n=========================================");
  console.log("=== FOOD CRUD INTEGRATION TESTS COMPLETE ===");
  console.log("=========================================");
  process.exit(0);
}

runTests();
