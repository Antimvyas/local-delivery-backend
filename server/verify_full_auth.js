const http = require('http');
const pool = require('./dbs');
const bcrypt = require('bcrypt');

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

    req.on('error', (err) => {
      reject(err);
    });

    if (body) {
      req.write(postData);
    }
    req.end();
  });
}

async function verifyAuthFlow() {
  console.log('--- STARTING AUTHENTICATION AND PASSWORD VERIFICATION TESTS ---');
  const timestamp = Date.now();
  const testCustomer = {
    username: `cust_${timestamp}`,
    Name: 'Test New Customer',
    Phone: `99${String(timestamp).slice(-8)}`,
    password: 'securePassword123',
    selectedOption: 'customer',
    customer_address: 'Test Address 123'
  };

  const testVendor = {
    username: `vend_${timestamp}`,
    Name: 'Test New Vendor',
    Phone: `88${String(timestamp).slice(-8)}`,
    password: 'secureVendorPassword456',
    selectedOption: 'vendor'
  };

  // 1. Register New Customer
  console.log('\n[TEST 1] Registering New Customer...');
  const regCustRes = await makeRequest('POST', '/api/v1/set-data', testCustomer);
  if (regCustRes.statusCode === 200 && regCustRes.body.username === testCustomer.username) {
    console.log('  - PASS: Customer registration succeeded.', regCustRes.body);
  } else {
    console.error('  - FAIL: Customer registration failed.', regCustRes);
    process.exit(1);
  }

  // 2. Register New Vendor
  console.log('\n[TEST 2] Registering New Vendor...');
  const regVendRes = await makeRequest('POST', '/api/v1/set-data', testVendor);
  if (regVendRes.statusCode === 200 && regVendRes.body.username === testVendor.username) {
    console.log('  - PASS: Vendor registration succeeded.', regVendRes.body);
  } else {
    console.error('  - FAIL: Vendor registration failed.', regVendRes);
    process.exit(1);
  }

  // 3. Login Customer
  console.log('\n[TEST 3] Logging in New Customer...');
  const loginCustRes = await makeRequest('POST', '/api/v1/login', {
    username: testCustomer.username,
    password: testCustomer.password,
    role: 'customer'
  });
  if (loginCustRes.statusCode === 200 && loginCustRes.body.success) {
    console.log('  - PASS: Customer login succeeded. Received tokens.');
  } else {
    console.error('  - FAIL: Customer login failed.', loginCustRes);
    process.exit(1);
  }

  // 4. Login Vendor
  console.log('\n[TEST 4] Logging in New Vendor...');
  const loginVendRes = await makeRequest('POST', '/api/v1/login', {
    username: testVendor.username,
    password: testVendor.password,
    role: 'vendor'
  });
  if (loginVendRes.statusCode === 200 && loginVendRes.body.success) {
    console.log('  - PASS: Vendor login succeeded. Received tokens.');
  } else {
    console.error('  - FAIL: Vendor login failed.', loginVendRes);
    process.exit(1);
  }

  // 5. Verify Token Refresh Flow
  console.log('\n[TEST 5] Verifying Token Refresh Flow...');
  const refreshRes = await makeRequest('POST', '/api/v1/refresh', {
    refreshToken: loginCustRes.body.refreshToken,
    role: 'customer',
    user_id: loginCustRes.body.user_id
  });
  if (refreshRes.statusCode === 200 && refreshRes.body.accessToken) {
    console.log('  - PASS: Token refresh succeeded. Received new accessToken.');
  } else {
    console.error('  - FAIL: Token refresh failed.', refreshRes);
    process.exit(1);
  }

  // 6. Verify password storage in DB
  console.log('\n[TEST 6] Auditing database password storage for new users...');
  pool.query('SELECT password FROM customer WHERE username = ?', [testCustomer.username], async (err, custRows) => {
    if (err || custRows.length === 0) {
      console.error('  - FAIL: Customer not found in DB.', err);
      process.exit(1);
    }
    const custPw = custRows[0].password;
    const isCustBcrypt = custPw.startsWith('$2b$') || custPw.startsWith('$2a$');
    console.log(`  - Customer DB Password: ${custPw.slice(0, 15)}... (Bcrypt: ${isCustBcrypt})`);

    pool.query('SELECT password FROM vendor WHERE username = ?', [testVendor.username], async (err, vendRows) => {
      if (err || vendRows.length === 0) {
        console.error('  - FAIL: Vendor not found in DB.', err);
        process.exit(1);
      }
      const vendPw = vendRows[0].password;
      const isVendBcrypt = vendPw.startsWith('$2b$') || vendPw.startsWith('$2a$');
      console.log(`  - Vendor DB Password: ${vendPw.slice(0, 15)}... (Bcrypt: ${isVendBcrypt})`);

      if (isCustBcrypt && isVendBcrypt) {
        console.log('\n=== ALL AUTHENTICATION FLOW TESTS PASSED SUCCESSFULLY ===');
        process.exit(0);
      } else {
        console.error('\n=== DATABASE AUDIT FAILED: Password not hashed ===');
        process.exit(1);
      }
    });
  });
}

verifyAuthFlow();
