const http = require('http');
const jwt = require('jsonwebtoken');
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
  console.log("=== COMPREHENSIVE AUTH REGRESSION SUITE ===");
  console.log("=========================================");

  let customerUser = null;
  let vendorUser = null;
  let customerTokens = {};
  let vendorTokens = {};

  const rand = Math.floor(Math.random() * 100000);
  const testCustomer = {
    username: `cust_reg_${rand}`,
    Name: 'Jane Customer',
    Phone: `8000${String(rand).padStart(6, '0')}`,
    password: 'password123',
    selectedOption: 'customer',
    customer_address: '123 Customer Lane'
  };

  const testVendor = {
    username: `vend_reg_${rand}`,
    Name: 'Joe Vendor',
    Phone: `7000${String(rand).padStart(6, '0')}`,
    password: 'password123',
    selectedOption: 'vendor'
  };

  // 1. Signup Customer
  console.log("\n[TEST 1] Signup Customer...");
  try {
    const res = await request('POST', '/api/v1/set-data', testCustomer);
    console.log("Status:", res.statusCode);
    console.log("Body:", JSON.stringify(res.body, null, 2));
    if (res.statusCode === 201 && res.body.success && res.body.data.accessToken) {
      console.log("✅ Passed");
      customerTokens = res.body.data;
    } else {
      console.log("❌ Failed");
    }
  } catch (e) {
    console.error(e);
  }

  // 2. Signup Vendor
  console.log("\n[TEST 2] Signup Vendor...");
  try {
    const res = await request('POST', '/api/v1/set-data', testVendor);
    console.log("Status:", res.statusCode);
    console.log("Body:", JSON.stringify(res.body, null, 2));
    if (res.statusCode === 201 && res.body.success && res.body.data.accessToken) {
      console.log("✅ Passed");
      vendorTokens = res.body.data;
    } else {
      console.log("❌ Failed");
    }
  } catch (e) {
    console.error(e);
  }

  // 3. Login Customer
  console.log("\n[TEST 3] Login Customer...");
  try {
    const res = await request('POST', '/api/v1/login', {
      username: testCustomer.username,
      password: testCustomer.password,
      role: 'customer'
    });
    console.log("Status:", res.statusCode);
    console.log("Body:", JSON.stringify(res.body, null, 2));
    if (res.statusCode === 200 && res.body.success && res.body.data.accessToken) {
      console.log("✅ Passed");
    } else {
      console.log("❌ Failed");
    }
  } catch (e) {
    console.error(e);
  }

  // 4. Invalid Password Login
  console.log("\n[TEST 4] Login with Incorrect Password...");
  try {
    const res = await request('POST', '/api/v1/login', {
      username: testCustomer.username,
      password: 'wrongpassword',
      role: 'customer'
    });
    console.log("Status:", res.statusCode);
    console.log("Body:", JSON.stringify(res.body, null, 2));
    if (res.statusCode === 401 && !res.body.success) {
      console.log("✅ Passed (Expected 401 Unauthorized)");
    } else {
      console.log("❌ Failed");
    }
  } catch (e) {
    console.error(e);
  }

  // 5. OTP Send
  console.log("\n[TEST 5] Send OTP (Mock)...");
  try {
    const res = await request('POST', '/api/v1/otp/send', { phone: testCustomer.Phone });
    console.log("Status:", res.statusCode);
    console.log("Body:", JSON.stringify(res.body, null, 2));
    if (res.statusCode === 200 && res.body.success) {
      console.log("✅ Passed");
    } else {
      console.log("❌ Failed");
    }
  } catch (e) {
    console.error(e);
  }

  // 6. OTP Verify (Invalid code)
  console.log("\n[TEST 6] Verify OTP with Invalid Code...");
  try {
    const res = await request('POST', '/api/v1/otp/verify', { phone: testCustomer.Phone, otp: '000000' });
    console.log("Status:", res.statusCode);
    console.log("Body:", JSON.stringify(res.body, null, 2));
    if (res.statusCode === 400 && !res.body.success) {
      console.log("✅ Passed (Expected 400 Bad Request)");
    } else {
      console.log("❌ Failed");
    }
  } catch (e) {
    console.error(e);
  }

  // 7. Protected Route - Valid Access Token
  console.log("\n[TEST 7] Access Protected Vendor Endpoint with Valid Vendor Token...");
  try {
    const res = await request('POST', '/api/v1/add-vendor', {
      Shop_name: 'My Gourmet Shop',
      shop_address: '123 Market St',
      open_close_timings: '{"open":"09:00","close":"22:00"}'
    }, {
      'Authorization': `Bearer ${vendorTokens.accessToken}`
    });
    console.log("Status:", res.statusCode);
    // Add-vendor might return 200/500/etc based on DB state, but should NOT be 401/403
    if (res.statusCode !== 401 && res.statusCode !== 403) {
      console.log("✅ Passed (Access Authorized, Status:", res.statusCode, ")");
    } else {
      console.log("❌ Failed (Unauthorized / Forbidden)");
    }
  } catch (e) {
    console.error(e);
  }

  // 8. Protected Route - Invalid JWT
  console.log("\n[TEST 8] Access Protected Endpoint with Invalid Token...");
  try {
    const res = await request('POST', '/api/v1/add-vendor', {}, {
      'Authorization': 'Bearer invalid_token_value'
    });
    console.log("Status:", res.statusCode);
    console.log("Body:", JSON.stringify(res.body, null, 2));
    if (res.statusCode === 401 && res.body.errorCode === 'TOKEN_EXPIRED') {
      console.log("✅ Passed (Expected 401 TOKEN_EXPIRED)");
    } else {
      console.log("❌ Failed");
    }
  } catch (e) {
    console.error(e);
  }

  // 9. Protected Route - RBAC Role Check (Customer calling Vendor endpoint)
  console.log("\n[TEST 9] RBAC: Access Vendor Endpoint with Customer Token...");
  try {
    const res = await request('POST', '/api/v1/add-vendor', {}, {
      'Authorization': `Bearer ${customerTokens.accessToken}`
    });
    console.log("Status:", res.statusCode);
    console.log("Body:", JSON.stringify(res.body, null, 2));
    if (res.statusCode === 403 && res.body.errorCode === 'ROLE_FORBIDDEN') {
      console.log("✅ Passed (Expected 403 ROLE_FORBIDDEN)");
    } else {
      console.log("❌ Failed");
    }
  } catch (e) {
    console.error(e);
  }

  // 10. Refresh Token Flow
  console.log("\n[TEST 10] Token Refresh...");
  try {
    const res = await request('POST', '/api/v1/refresh', {
      refreshToken: customerTokens.refreshToken,
      role: 'customer',
      user_id: customerTokens.user_id
    });
    console.log("Status:", res.statusCode);
    console.log("Body:", JSON.stringify(res.body, null, 2));
    if (res.statusCode === 200 && res.body.data.accessToken) {
      console.log("✅ Passed");
    } else {
      console.log("❌ Failed");
    }
  } catch (e) {
    console.error(e);
  }

  // 11. Token Expiry Handling
  console.log("\n[TEST 11] Token Expiry Flow (Simulated expired JWT)...");
  try {
    const expiredToken = jwt.sign(
      { user_id: customerTokens.user_id, role: 'customer' },
      process.env.JWT_SECRET,
      { expiresIn: '-10s' } // Expired 10 seconds ago
    );
    const res = await request('POST', '/api/v1/location/search', { query: 'test' }, {
      'Authorization': `Bearer ${expiredToken}`
    });
    console.log("Status:", res.statusCode);
    console.log("Body:", JSON.stringify(res.body, null, 2));
    if (res.statusCode === 401 && res.body.errorCode === 'TOKEN_EXPIRED') {
      console.log("✅ Passed (Successfully detected expired token, returning 401)");
    } else {
      console.log("❌ Failed");
    }
  } catch (e) {
    console.error(e);
  }

  // 12. Logout
  console.log("\n[TEST 12] Logout...");
  try {
    const res = await request('POST', '/api/v1/logout', {}, {
      'Authorization': `Bearer ${customerTokens.accessToken}`
    });
    console.log("Status:", res.statusCode);
    console.log("Body:", JSON.stringify(res.body, null, 2));
    if (res.statusCode === 200 && res.body.success) {
      console.log("✅ Passed");
    } else {
      console.log("❌ Failed");
    }
  } catch (e) {
    console.error(e);
  }

  console.log("\n=========================================");
  console.log("=== COMPREHENSIVE SUITE TESTING COMPLETE ===");
  console.log("=========================================");
}

runTests();
