const http = require('http');

function loginUser(username, password, role) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ username, password, role });
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/v1/login',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      }
    };

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
    req.write(postData);
    req.end();
  });
}

async function verifyExisting() {
  console.log('--- VERIFYING EXISTING USERS LOGIN ---');
  
  // Login customer Xx
  console.log('Logging in customer Xx...');
  const custRes = await loginUser('Xx', 'password123', 'customer');
  if (custRes.statusCode === 200 && custRes.body.success) {
    console.log('  - PASS: Customer Xx logged in successfully.');
  } else {
    console.error('  - FAIL: Customer Xx login failed.', custRes);
    process.exit(1);
  }

  // Login vendor Y
  console.log('Logging in vendor Y...');
  const vendRes = await loginUser('Y', 'password123', 'vendor');
  if (vendRes.statusCode === 200 && vendRes.body.success) {
    console.log('  - PASS: Vendor Y logged in successfully.');
  } else {
    console.error('  - FAIL: Vendor Y login failed.', vendRes);
    process.exit(1);
  }

  console.log('=== EXISTING USERS LOGIN VERIFICATION PASSED ===');
  process.exit(0);
}

verifyExisting();
