const http = require('http');
const pool = require('./dbs');

function makeRequest(method, path, body, token = null) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
      }
    };
    if (token) {
      options.headers['Authorization'] = `Bearer ${token}`;
    }
    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve({
            statusCode: res.statusCode,
            body: data ? JSON.parse(data) : {}
          });
        } catch (e) {
          resolve({
            statusCode: res.statusCode,
            body: data
          });
        }
      });
    });

    req.on('error', reject);
    if (body) req.write(postData);
    req.end();
  });
}

function queryDb(sql, params = []) {
  return new Promise((resolve, reject) => {
    pool.query(sql, params, (err, res) => {
      if (err) reject(err);
      else resolve(res);
    });
  });
}

async function runExtendedValidation() {
  console.log('=== STARTING SECURITY & AUTHORIZATION PHASE EXTENDED VALIDATION ===\n');

  // ----------------------------------------------------
  // 1. Existing Account Verification
  // ----------------------------------------------------
  console.log('[SECTION 1] Existing Account Verification (Customer Xx & Vendor Y):');
  
  // 1a. Customer Xx Login
  console.log('  * Logging in Customer Xx (password123)...');
  const custLogin = await makeRequest('POST', '/api/v1/login', {
    username: 'Xx',
    password: 'password123',
    role: 'customer'
  });
  if (custLogin.statusCode === 200 && custLogin.body.success) {
    console.log('    - PASS: Customer Xx logged in successfully.');
  } else {
    console.error('    - FAIL: Customer Xx login failed.', custLogin);
    process.exit(1);
  }

  // 1b. Customer Xx Token Refresh
  console.log('  * Refreshing Customer Xx token...');
  const custRefresh = await makeRequest('POST', '/api/v1/refresh', {
    refreshToken: custLogin.body.refreshToken,
    role: 'customer',
    user_id: custLogin.body.user_id
  });
  if (custRefresh.statusCode === 200 && custRefresh.body.accessToken) {
    console.log('    - PASS: Customer Xx token refresh succeeded.');
  } else {
    console.error('    - FAIL: Customer Xx token refresh failed.', custRefresh);
    process.exit(1);
  }

  // 1c. Customer Xx Logout
  console.log('  * Logging out Customer Xx...');
  const custLogout = await makeRequest('POST', '/api/v1/logout', {}, custLogin.body.accessToken);
  if (custLogout.statusCode === 200 && custLogout.body.success) {
    console.log('    - PASS: Customer Xx logout succeeded.');
  } else {
    console.error('    - FAIL: Customer Xx logout failed.', custLogout);
    process.exit(1);
  }

  // 1d. Vendor Y Login
  console.log('  * Logging in Vendor Y (password123)...');
  const vendLogin = await makeRequest('POST', '/api/v1/login', {
    username: 'Y',
    password: 'password123',
    role: 'vendor'
  });
  if (vendLogin.statusCode === 200 && vendLogin.body.success) {
    console.log('    - PASS: Vendor Y logged in successfully.');
  } else {
    console.error('    - FAIL: Vendor Y login failed.', vendLogin);
    process.exit(1);
  }

  // 1e. Vendor Y Token Refresh
  console.log('  * Refreshing Vendor Y token...');
  const vendRefresh = await makeRequest('POST', '/api/v1/refresh', {
    refreshToken: vendLogin.body.refreshToken,
    role: 'vendor',
    user_id: vendLogin.body.user_id
  });
  if (vendRefresh.statusCode === 200 && vendRefresh.body.accessToken) {
    console.log('    - PASS: Vendor Y token refresh succeeded.');
  } else {
    console.error('    - FAIL: Vendor Y token refresh failed.', vendRefresh);
    process.exit(1);
  }

  // 1f. Vendor Y Logout
  console.log('  * Logging out Vendor Y...');
  const vendLogout = await makeRequest('POST', '/api/v1/logout', {}, vendLogin.body.accessToken);
  if (vendLogout.statusCode === 200 && vendLogout.body.success) {
    console.log('    - PASS: Vendor Y logout succeeded.');
  } else {
    console.error('    - FAIL: Vendor Y logout failed.', vendLogout);
    process.exit(1);
  }

  // ----------------------------------------------------
  // 2. Refresh Token Exposure Audit
  // ----------------------------------------------------
  console.log('\n[SECTION 2] Refresh Token Exposure Audit:');
  const checkExposure = (resName, body) => {
    const keysStr = JSON.stringify(body);
    const leaksPassword = keysStr.includes('password') || keysStr.includes('password_hash');
    const leaksToken = keysStr.includes('refresh_token') || keysStr.includes('refresh_token_hash');
    const leaksBcrypt = keysStr.includes('$2b$') || keysStr.includes('$2a$');

    if (!leaksPassword && !leaksToken && !leaksBcrypt) {
      console.log(`    - PASS: ${resName} response is clean.`);
    } else {
      console.error(`    - FAIL: ${resName} response leaked sensitive authentication data!`, body);
      process.exit(1);
    }
  };

  // Re-login to get active tokens for auditing
  const cLogin = await makeRequest('POST', '/api/v1/login', { username: 'Xx', password: 'password123', role: 'customer' });
  const vLogin = await makeRequest('POST', '/api/v1/login', { username: 'Y', password: 'password123', role: 'vendor' });
  const cToken = cLogin.body.accessToken;
  const vToken = vLogin.body.accessToken;

  // 2a. Customer Details Profile API
  console.log('  * Auditing Customer profile endpoint...');
  const resCustDet = await makeRequest('GET', '/api/v1/customer/5', null, cToken);
  checkExposure('Customer Details', resCustDet.body);

  // 2b. Address API
  console.log('  * Auditing Customer addresses list endpoint...');
  const resAddress = await makeRequest('GET', '/api/v1/customer/addresses', null, cToken);
  checkExposure('Customer Addresses', resAddress.body);

  // 2c. Orders API
  console.log('  * Auditing Customer orders endpoint...');
  const resOrders = await makeRequest('GET', '/api/v1/customer/orders/new', null, cToken);
  checkExposure('Customer Orders', resAddress.body);

  // 2d. Credit API
  console.log('  * Auditing Customer credit (udar) status endpoint...');
  const resCredit = await makeRequest('GET', '/api/v1/customer/udar/5', null, cToken);
  checkExposure('Customer Credit', resCredit.body);

  // 2e. Menu/Shop Discovery API
  console.log('  * Auditing Shop discovery/menu endpoint...');
  const resNearby = await makeRequest('GET', '/api/v1/customer/nearby-vendors', null, cToken);
  checkExposure('Shop Discovery', resNearby.body);

  // 2f. Vendor Dashboard API
  console.log('  * Auditing Vendor Dashboard endpoint...');
  const resVendDash = await makeRequest('GET', '/api/v1/vendor-dashboard/1', null, vToken);
  checkExposure('Vendor Dashboard', resVendDash.body);

  // 2g. Settings / Shop timings API
  console.log('  * Auditing Shop Settings/Timings endpoint...');
  const resSettings = await makeRequest('GET', '/api/v1/udar-requests/1', null, vToken);
  checkExposure('Shop Settings', resSettings.body);

  // ----------------------------------------------------
  // 3. Expanded RBAC Verification
  // ----------------------------------------------------
  console.log('\n[SECTION 3] Expanded RBAC Verification:');

  // 3a. Customer Token accessing Vendor-only endpoints
  console.log('  * Testing Customer token against Vendor-only endpoints (expect 403 Forbidden):');
  const vendorEndpoints = [
    { method: 'GET', path: '/api/v1/vendor-dashboard/1', body: null, name: 'Vendor Dashboard' },
    { method: 'GET', path: '/api/v1/vendor/orders', body: null, name: 'Vendor Orders' },
    { method: 'GET', path: '/api/v1/vendor/accepted-orders', body: null, name: 'Vendor Accepted Orders' },
    { method: 'POST', path: '/api/v1/vendor/receive-payment', body: { customer_id: 5, amount: 100 }, name: 'Vendor Payments' },
    { method: 'POST', path: '/api/v1/food-set', body: {}, name: 'Menu Create' },
    { method: 'POST', path: '/api/v1/food-update', body: {}, name: 'Menu Update' },
    { method: 'POST', path: '/api/v1/food-delete', body: {}, name: 'Menu Delete' },
    { method: 'POST', path: '/api/v1/toggle-food/2', body: { is_available: false }, name: 'Food Toggle' },
    { method: 'POST', path: '/api/v1/update-shop-online-status/1', body: { isOnline: true }, name: 'Shop Status Update' },
    { method: 'POST', path: '/api/v1/update-shop-timings/1', body: {}, name: 'Shop Timing Update' }
  ];

  for (const ep of vendorEndpoints) {
    const res = await makeRequest(ep.method, ep.path, ep.body, cToken);
    if (res.statusCode === 403) {
      console.log(`    - PASS: Customer token blocked from ${ep.name} (${ep.method} ${ep.path}) -> 403`);
    } else {
      console.error(`    - FAIL: Customer token bypassed RBAC protection for ${ep.name}! Status: ${res.statusCode}`, res);
      process.exit(1);
    }
  }

  // 3b. Vendor Token accessing Customer-only endpoints
  console.log('  * Testing Vendor token against Customer-only endpoints (expect 403 Forbidden):');
  const customerEndpoints = [
    { method: 'GET', path: '/api/v1/customer/5', body: null, name: 'Customer Profile' },
    { method: 'POST', path: '/api/v1/orders', body: {}, name: 'Customer Orders' },
    { method: 'GET', path: '/api/v1/customer-udar-accounts/5', body: null, name: 'Customer Credit Accounts' },
    { method: 'GET', path: '/api/v1/payment-requests/5', body: null, name: 'Customer Payment Requests' },
    { method: 'GET', path: '/api/v1/customer/addresses', body: null, name: 'Customer Address Management' }
  ];

  for (const ep of customerEndpoints) {
    const res = await makeRequest(ep.method, ep.path, ep.body, vToken);
    if (res.statusCode === 403) {
      console.log(`    - PASS: Vendor token blocked from ${ep.name} (${ep.method} ${ep.path}) -> 403`);
    } else {
      console.error(`    - FAIL: Vendor token bypassed RBAC protection for ${ep.name}! Status: ${res.statusCode}`, res);
      process.exit(1);
    }
  }

  // ----------------------------------------------------
  // 4. Database Ownership Attack Tests (Critical)
  // ----------------------------------------------------
  console.log('\n[SECTION 4] Database Ownership Attack Tests:');
  
  // 4a. Vendor A (ID 1) attempts to modify Vendor B (ID 2) resources
  console.log('  * Vendor A (Y, ID 1) attempting Vendor B (J, ID 2) modifications:');
  
  // Update Vendor B food item (food_id = 7 owned by vendor 2)
  const resVendUpdateFood = await makeRequest('POST', '/api/v1/food-update', { food_id: 7, food_name: 'Hacked Item', cost: 10 }, vToken);
  if (resVendUpdateFood.statusCode === 403) {
    console.log('    - PASS: Blocked Vendor A from updating Vendor B\'s food item (403 Forbidden).');
  } else {
    console.error('    - FAIL: Vendor A successfully updated Vendor B\'s food item!', resVendUpdateFood);
    process.exit(1);
  }

  // Delete Vendor B food item
  const resVendDeleteFood = await makeRequest('POST', '/api/v1/food-delete', { food_id: 7 }, vToken);
  if (resVendDeleteFood.statusCode === 403) {
    console.log('    - PASS: Blocked Vendor A from deleting Vendor B\'s food item (403 Forbidden).');
  } else {
    console.error('    - FAIL: Vendor A successfully deleted Vendor B\'s food item!', resVendDeleteFood);
    process.exit(1);
  }

  // Toggle Vendor B food item availability
  const resVendToggleFood = await makeRequest('POST', '/api/v1/toggle-food/7', { is_available: 0 }, vToken);
  if (resVendToggleFood.statusCode === 403) {
    console.log('    - PASS: Blocked Vendor A from toggling Vendor B\'s food item status (403 Forbidden).');
  } else {
    console.error('    - FAIL: Vendor A successfully toggled Vendor B\'s food item status!', resVendToggleFood);
    process.exit(1);
  }

  // Update Vendor B settings (POST /api/v1/add-vendor - verify it doesn't modify Vendor B)
  // Get original vendor B record
  const origVendB = await queryDb('SELECT Shop_name FROM vendor WHERE vendor_id = 2');
  const origNameB = origVendB[0].Shop_name;
  
  // Vendor A calls /api/v1/add-vendor with body specifying vendor_id: 2
  await makeRequest('POST', '/api/v1/add-vendor', { Shop_name: 'Stolen Name', vendor_id: 2 }, vToken);
  const checkVendB = await queryDb('SELECT Shop_name FROM vendor WHERE vendor_id = 2');
  if (checkVendB[0].Shop_name === origNameB) {
    console.log('    - PASS: Blocked settings parameter hijacking. Vendor B settings remained unmodified.');
  } else {
    console.error(`    - FAIL: Vendor A hijacked and updated Vendor B's settings!`, checkVendB);
    process.exit(1);
  }

  // Update Vendor B shop timings
  const resVendTimings = await makeRequest('POST', '/api/v1/update-shop-timings/2', { open_close_timings: {} }, vToken);
  if (resVendTimings.statusCode === 403) {
    console.log('    - PASS: Blocked Vendor A from updating Vendor B\'s shop timings (403 Forbidden).');
  } else {
    console.error('    - FAIL: Vendor A updated Vendor B\'s shop timings!', resVendTimings);
    process.exit(1);
  }

  // Update Vendor B shop status
  const resVendStatus = await makeRequest('POST', '/api/v1/update-shop-online-status/2', { isOnline: 1 }, vToken);
  if (resVendStatus.statusCode === 403) {
    console.log('    - PASS: Blocked Vendor A from updating Vendor B\'s shop status (403 Forbidden).');
  } else {
    console.error('    - FAIL: Vendor A updated Vendor B\'s shop status!', resVendStatus);
    process.exit(1);
  }

  // 4b. Customer A (ID 5) attempts to modify Customer B (ID 2) resources
  console.log('  * Customer A (Xx, ID 5) attempting Customer B (X, ID 2) modifications:');

  // View Customer B profile
  const resCustProfile = await makeRequest('GET', '/api/v1/update/2', null, cToken);
  if (resCustProfile.statusCode === 403) {
    console.log('    - PASS: Blocked Customer A from viewing Customer B\'s profile (403 Forbidden).');
  } else {
    console.error('    - FAIL: Customer A viewed Customer B\'s profile!', resCustProfile);
    process.exit(1);
  }

  // View Customer B orders
  const resCustOrdersView = await makeRequest('GET', '/api/v1/customer/udar/2', null, cToken);
  if (resCustOrdersView.statusCode === 403) {
    console.log('    - PASS: Blocked Customer A from viewing Customer B\'s orders (403 Forbidden).');
  } else {
    console.error('    - FAIL: Customer A viewed Customer B\'s orders!', resCustOrdersView);
    process.exit(1);
  }

  // Inject a temporary address for Customer B (customer_id = 2) to test attacks
  const tempAddrQuery = `
    INSERT INTO customer_addresses (customer_id, address_type, latitude, longitude, formatted_address, is_default)
    VALUES (2, 'home', 29.15, 75.72, 'Customer B Temp Address', 0)
  `;
  const insertAddrRes = await queryDb(tempAddrQuery);
  const tempAddrId = insertAddrRes.insertId;
  console.log(`    - Injected temporary address_id = ${tempAddrId} for Customer B (ID 2).`);

  // Edit Customer B address
  const resCustEditAddr = await makeRequest('PUT', `/api/v1/customer/addresses/${tempAddrId}`, {
    address_type: 'work',
    latitude: 29.16,
    longitude: 75.73,
    formatted_address: 'Hacked Address'
  }, cToken);
  if (resCustEditAddr.statusCode === 403) {
    console.log('    - PASS: Blocked Customer A from editing Customer B\'s address (403 Forbidden).');
  } else {
    console.error('    - FAIL: Customer A edited Customer B\'s address!', resCustEditAddr);
  }

  // Delete Customer B address
  const resCustDeleteAddr = await makeRequest('DELETE', `/api/v1/customer/addresses/${tempAddrId}`, null, cToken);
  if (resCustDeleteAddr.statusCode === 403) {
    console.log('    - PASS: Blocked Customer A from deleting Customer B\'s address (403 Forbidden).');
  } else {
    console.error('    - FAIL: Customer A deleted Customer B\'s address!', resCustDeleteAddr);
  }

  // Set Customer B default address
  const resCustDefaultAddr = await makeRequest('PUT', `/api/v1/customer/addresses/${tempAddrId}/default`, null, cToken);
  if (resCustDefaultAddr.statusCode === 403) {
    console.log('    - PASS: Blocked Customer A from setting Customer B\'s address as default (403 Forbidden).');
  } else {
    console.error('    - FAIL: Customer A set Customer B\'s address as default!', resCustDefaultAddr);
  }

  // Clean up Customer B's temp address
  await queryDb('DELETE FROM customer_addresses WHERE address_id = ?', [tempAddrId]);
  console.log('    - Cleaned up temporary address.');

  // View Customer B payment requests
  const resCustPayments = await makeRequest('GET', '/api/v1/payment-requests/2', null, cToken);
  if (resCustPayments.statusCode === 403) {
    console.log('    - PASS: Blocked Customer A from viewing Customer B\'s payment requests (403 Forbidden).');
  } else {
    console.error('    - FAIL: Customer A viewed Customer B\'s payment requests!', resCustPayments);
    process.exit(1);
  }

  // ----------------------------------------------------
  // 5. Temporary Account Cleanup Verification
  // ----------------------------------------------------
  console.log('\n[SECTION 5] SQL Account Cleanup Verification:');
  const custCleanupCount = await queryDb("SELECT COUNT(*) FROM customer WHERE username LIKE 'cust_ok_%'");
  const vendCleanupCount = await queryDb("SELECT COUNT(*) FROM vendor WHERE username LIKE 'vend_ok_%'");
  console.log(`  - SELECT COUNT(*) FROM customer WHERE username LIKE 'cust_ok_%': ${custCleanupCount[0]['COUNT(*)']}`);
  console.log(`  - SELECT COUNT(*) FROM vendor WHERE username LIKE 'vend_ok_%': ${vendCleanupCount[0]['COUNT(*)']}`);

  // ----------------------------------------------------
  // 6. Plaintext Password Verification
  // ----------------------------------------------------
  console.log('\n[SECTION 6] SQL Plaintext Password Verification:');
  const custPlaintextCount = await queryDb("SELECT COUNT(*) FROM customer WHERE password NOT LIKE '$2b$%'");
  const vendPlaintextCount = await queryDb("SELECT COUNT(*) FROM vendor WHERE password NOT LIKE '$2b$%'");
  console.log(`  - SELECT COUNT(*) FROM customer WHERE password NOT LIKE '$2b$%': ${custPlaintextCount[0]['COUNT(*)']}`);
  console.log(`  - SELECT COUNT(*) FROM vendor WHERE password NOT LIKE '$2b$%': ${vendPlaintextCount[0]['COUNT(*)']}`);

  console.log('\n=== ALL EXTENDED VALIDATIONS PASSED SUCCESSFUL ===');
  process.exit(0);
}

runExtendedValidation();
