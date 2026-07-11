const https = require('https');

function request(method, url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const data = body ? JSON.stringify(body) : '';
    const parsedUrl = new URL(url);
    const options = {
      hostname: parsedUrl.hostname,
      port: 443,
      path: parsedUrl.pathname + parsedUrl.search,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data),
        ...headers
      }
    };

    const req = https.request(options, (res) => {
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
  console.log("=== LIVE RAILWAY REFACTOR VERIFICATION ===");
  console.log("=========================================");

  const targetUrl = 'https://local-delivery-backend.up.railway.app';
  const rand = Math.floor(Math.random() * 100000);
  
  const testCustomer = {
    username: `cust_rail_${rand}`,
    Name: 'Jane Customer',
    Phone: `8200${String(rand).padStart(6, '0')}`,
    password: 'password123',
    selectedOption: 'customer',
    customer_address: '123 Customer Lane'
  };

  const testVendor = {
    username: `vend_rail_${rand}`,
    Name: 'John Vendor',
    Phone: `9200${String(rand).padStart(6, '0')}`,
    password: 'password123',
    selectedOption: 'vendor'
  };

  let customerTokens = {};
  let vendorTokens = {};

  // 1. Signup Customer
  console.log("\n[TEST 1] Signup Customer on Railway...");
  try {
    const res = await request('POST', `${targetUrl}/api/v1/set-data`, testCustomer);
    console.log("Status:", res.statusCode);
    console.log("Body:", JSON.stringify(res.body, null, 2));
    if ((res.statusCode === 201 || res.statusCode === 200) && res.body.success) {
      console.log("✅ Passed");
    } else {
      console.log("❌ Failed");
    }
  } catch (e) {
    console.error("Error:", e.message);
  }

  // 2. Login Customer
  console.log("\n[TEST 2] Login Customer on Railway...");
  try {
    const res = await request('POST', `${targetUrl}/api/v1/login`, {
      username: testCustomer.username,
      password: testCustomer.password,
      role: 'customer'
    });
    console.log("Status:", res.statusCode);
    console.log("Body:", JSON.stringify(res.body, null, 2));
    if (res.statusCode === 200 && res.body.success) {
      customerTokens = res.body.data;
      console.log("✅ Passed");
    } else {
      console.log("❌ Failed");
    }
  } catch (e) {
    console.error("Error:", e.message);
  }

  // 3. Signup Vendor
  console.log("\n[TEST 3] Signup Vendor on Railway...");
  try {
    const res = await request('POST', `${targetUrl}/api/v1/set-data`, testVendor);
    console.log("Status:", res.statusCode);
    console.log("Body:", JSON.stringify(res.body, null, 2));
    if ((res.statusCode === 201 || res.statusCode === 200) && res.body.success) {
      console.log("✅ Passed");
    } else {
      console.log("❌ Failed");
    }
  } catch (e) {
    console.error("Error:", e.message);
  }

  // 4. Login Vendor
  console.log("\n[TEST 4] Login Vendor on Railway...");
  try {
    const res = await request('POST', `${targetUrl}/api/v1/login`, {
      username: testVendor.username,
      password: testVendor.password,
      role: 'vendor'
    });
    console.log("Status:", res.statusCode);
    console.log("Body:", JSON.stringify(res.body, null, 2));
    if (res.statusCode === 200 && res.body.success) {
      vendorTokens = res.body.data;
      console.log("✅ Passed");
    } else {
      console.log("❌ Failed");
    }
  } catch (e) {
    console.error("Error:", e.message);
  }

  // 5. Send OTP
  console.log("\n[TEST 5] Send OTP on Railway...");
  try {
    const res = await request('POST', `${targetUrl}/api/v1/otp/send`, { phone: testCustomer.Phone });
    console.log("Status:", res.statusCode);
    console.log("Body:", JSON.stringify(res.body, null, 2));
    if (res.statusCode === 200 && res.body.success) {
      console.log("✅ Passed");
    } else {
      console.log("❌ Failed");
    }
  } catch (e) {
    console.error("Error:", e.message);
  }

  // 6. Verify OTP (Invalid code check)
  console.log("\n[TEST 6] Verify OTP (with invalid code rejection) on Railway...");
  try {
    const res = await request('POST', `${targetUrl}/api/v1/otp/verify`, { phone: testCustomer.Phone, otp: '999999' });
    console.log("Status:", res.statusCode);
    console.log("Body:", JSON.stringify(res.body, null, 2));
    if (res.statusCode === 400 && !res.body.success) {
      console.log("✅ Passed (Expected 400 rejection)");
    } else {
      console.log("❌ Failed");
    }
  } catch (e) {
    console.error("Error:", e.message);
  }

  // 7. Token Refresh (Auto Login)
  console.log("\n[TEST 7] Token Refresh (Auto Login) on Railway...");
  try {
    if (customerTokens.refreshToken) {
      const res = await request('POST', `${targetUrl}/api/v1/refresh`, {
        refreshToken: customerTokens.refreshToken,
        role: 'customer',
        user_id: customerTokens.user_id
      });
      console.log("Status:", res.statusCode);
      console.log("Body:", JSON.stringify(res.body, null, 2));
      if (res.statusCode === 200 && res.body.success) {
        console.log("✅ Passed");
      } else {
        console.log("❌ Failed");
      }
    } else {
      console.log("⚠️ Skipped: no refresh token available");
    }
  } catch (e) {
    console.error("Error:", e.message);
  }

  // 8. Logout
  console.log("\n[TEST 8] Logout on Railway...");
  try {
    if (customerTokens.accessToken) {
      const res = await request('POST', `${targetUrl}/api/v1/logout`, { device_id: 'test_device' }, {
        'Authorization': `Bearer ${customerTokens.accessToken}`
      });
      console.log("Status:", res.statusCode);
      console.log("Body:", JSON.stringify(res.body, null, 2));
      if (res.statusCode === 200 && res.body.success) {
        console.log("✅ Passed");
      } else {
        console.log("❌ Failed");
      }
    } else {
      console.log("⚠️ Skipped: no access token available");
    }
  } catch (e) {
    console.error("Error:", e.message);
  }

  console.log("\n=========================================");
  console.log("=== LIVE RAILWAY REFACTOR VERIFICATION COMPLETE ===");
  console.log("=========================================");
}

runTests();

