const http = require('http');
const jwt = require('jsonwebtoken');

const JWT_SECRET = "super_secret_access_key_123!";

// Generate mock tokens
const customerA = jwt.sign({ user_id: 6, role: 'customer' }, JWT_SECRET, { expiresIn: '15m' }); // Antim
const customerB = jwt.sign({ user_id: 7, role: 'customer' }, JWT_SECRET, { expiresIn: '15m' }); // Test Customer
const vendorA = jwt.sign({ user_id: 1, role: 'vendor' }, JWT_SECRET, { expiresIn: '15m' }); // Pizza wings (vendor 1)
const vendorB = jwt.sign({ user_id: 2, role: 'vendor' }, JWT_SECRET, { expiresIn: '15m' }); // Pizza wings (vendor 2)

const testCases = [
  // 1. Role-based Access Controls
  {
    name: "Customer A accessing Vendor dashboard (Role restriction)",
    method: 'GET',
    path: '/api/v1/vendor-dashboard/1',
    token: customerA,
    expectedStatus: 403
  },
  {
    name: "Vendor A accessing Customer orders (Role restriction)",
    method: 'GET',
    path: '/api/v1/customer/orders/new',
    token: vendorA,
    expectedStatus: 403
  },

  // 2. Vendor A vs Vendor B attacks
  {
    name: "Vendor B updating Vendor A food item",
    method: 'POST',
    path: '/api/v1/food-update',
    token: vendorB,
    body: { food_id: 2, food_name: 'Malicious Update', cost: 99.99 }, // Food 2 belongs to vendor 1
    expectedStatus: 403
  },
  {
    name: "Vendor B deleting Vendor A food item",
    method: 'POST',
    path: '/api/v1/food-delete',
    token: vendorB,
    body: { food_id: 2 },
    expectedStatus: 403
  },
  {
    name: "Vendor B toggling Vendor A food item availability",
    method: 'POST',
    path: '/api/v1/toggle-food/2',
    token: vendorB,
    body: { is_available: 0 },
    expectedStatus: 403
  },
  {
    name: "Vendor B updating Vendor A order status",
    method: 'PUT',
    path: '/api/v1/vendor/orders/update-status',
    token: vendorB,
    body: { order_id: 1, customer_id: 2, new_status: 'accepted' }, // Order 1 belongs to vendor 1
    expectedStatus: 403
  },

  // 3. Customer A vs Customer B attacks
  {
    name: "Customer B viewing Customer A profile details",
    method: 'GET',
    path: '/api/v1/customer/6', // Customer A is 6
    token: customerB,
    expectedStatus: 403
  },
  {
    name: "Customer B viewing Customer A transactions",
    method: 'GET',
    path: '/api/v1/customer-transactions/6',
    token: customerB,
    expectedStatus: 403
  },
  {
    name: "Customer B viewing Customer A payment requests",
    method: 'GET',
    path: '/api/v1/payment-requests/6',
    token: customerB,
    expectedStatus: 403
  },

  // 4. Vendor A vs Vendor B dashboard/requests
  {
    name: "Vendor B viewing Vendor A dashboard metrics",
    method: 'GET',
    path: '/api/v1/vendor-dashboard/1',
    token: vendorB,
    expectedStatus: 403
  },
  {
    name: "Vendor B viewing Vendor A udar requests",
    method: 'GET',
    path: '/api/v1/udar-requests/1',
    token: vendorB,
    expectedStatus: 403
  },

  // 5. Authorized/Safe path checks
  {
    name: "Vendor A updating Vendor A food item (Authorized)",
    method: 'POST',
    path: '/api/v1/food-update',
    token: vendorA,
    body: { food_id: 2, food_name: 'Coffee ', cost: 12.00 }, // Food 2 belongs to vendor 1
    expectedStatus: 200
  },
  {
    name: "Customer A viewing Customer A profile (Authorized)",
    method: 'GET',
    path: '/api/v1/customer/6',
    token: customerA,
    expectedStatus: 200
  }
];

async function runTests() {
  console.log('--- RUNNING STRICT AUTHORIZATION VERIFICATION TESTS ---');
  let passed = 0;
  let failed = 0;

  for (const tc of testCases) {
    try {
      const status = await makeRequest(tc.method, tc.path, tc.token, tc.body);
      const isSuccess = status === tc.expectedStatus;
      console.log(`[${isSuccess ? 'PASS' : 'FAIL'}] ${tc.name}`);
      console.log(`  - Route: ${tc.method} ${tc.path}`);
      console.log(`  - Expected: ${tc.expectedStatus}, Got: ${status}`);
      if (isSuccess) passed++;
      else failed++;
    } catch (err) {
      console.error(`  - Request Error:`, err.message);
      failed++;
    }
  }

  console.log(`\n=== TEST SUMMARY ===`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

function makeRequest(method, path, token, body) {
  return new Promise((resolve, reject) => {
    const postData = body ? JSON.stringify(body) : '';
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: path,
      method: method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      }
    };

    if (body) {
      options.headers['Content-Length'] = Buffer.byteLength(postData);
    }

    const req = http.request(options, (res) => {
      resolve(res.statusCode);
    });

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(postData);
    }
    req.end();
  });
}

runTests();
