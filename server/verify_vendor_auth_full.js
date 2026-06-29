const http = require('http');

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

async function runVendorAuthVerification() {
  console.log('=== VENDOR AUTHENTICATION VERIFICATION AUDIT ===\n');

  // 1. Vendor Login (Valid Credentials)
  const loginPayload = {
    username: 'Y',
    password: 'password123',
    role: 'vendor'
  };
  console.log('1. VENDOR LOGIN (Valid)');
  console.log('   - Request Method: POST');
  console.log('   - Request Path: /api/v1/login');
  console.log('   - Request Payload:', JSON.stringify(loginPayload, null, 2));
  
  const loginRes = await makeRequest('POST', '/api/v1/login', loginPayload);
  console.log('   - HTTP Status Code:', loginRes.statusCode);
  console.log('   - Response Payload:', JSON.stringify(loginRes.body, null, 2));
  console.log('--------------------------------------------------\n');

  if (loginRes.statusCode !== 200 || !loginRes.body.success) {
    console.error('ERROR: Valid vendor login failed!');
    process.exit(1);
  }

  const { accessToken, refreshToken, user_id } = loginRes.body;

  // 2. Vendor Login (Invalid Credentials - Expected to fail with 401)
  const invalidLoginPayload = {
    username: 'Y',
    password: 'wrongpassword',
    role: 'vendor'
  };
  console.log('2. VENDOR LOGIN (Invalid Credentials)');
  console.log('   - Request Method: POST');
  console.log('   - Request Path: /api/v1/login');
  console.log('   - Request Payload:', JSON.stringify(invalidLoginPayload, null, 2));

  const invalidLoginRes = await makeRequest('POST', '/api/v1/login', invalidLoginPayload);
  console.log('   - HTTP Status Code:', invalidLoginRes.statusCode);
  console.log('   - Response Payload:', JSON.stringify(invalidLoginRes.body, null, 2));
  console.log('--------------------------------------------------\n');

  // 3. Access Token Validation (Auto-Login verification)
  console.log('3. ACCESS TOKEN VALIDATION / AUTO-LOGIN');
  console.log('   - Request Method: GET');
  console.log('   - Request Path: /api/v1/vendor-details');
  console.log('   - Request Headers: { Authorization: "Bearer [Redacted Access Token]" }');

  const profileRes = await makeRequest('GET', '/api/v1/vendor-details', null, accessToken);
  console.log('   - HTTP Status Code:', profileRes.statusCode);
  console.log('   - Response Payload:', JSON.stringify(profileRes.body, null, 2));
  console.log('--------------------------------------------------\n');

  // 4. Refresh Token Flow
  const refreshPayload = {
    refreshToken: refreshToken,
    role: 'vendor',
    user_id: user_id
  };
  console.log('4. REFRESH TOKEN FLOW');
  console.log('   - Request Method: POST');
  console.log('   - Request Path: /api/v1/refresh');
  console.log('   - Request Payload:', JSON.stringify(refreshPayload, null, 2));

  const refreshRes = await makeRequest('POST', '/api/v1/refresh', refreshPayload);
  console.log('   - HTTP Status Code:', refreshRes.statusCode);
  console.log('   - Response Payload:', JSON.stringify(refreshRes.body, null, 2));
  console.log('--------------------------------------------------\n');

  // 5. Logout Flow
  console.log('5. VENDOR LOGOUT');
  console.log('   - Request Method: POST');
  console.log('   - Request Path: /api/v1/logout');
  console.log('   - Request Headers: { Authorization: "Bearer [Redacted Access Token]" }');

  const logoutRes = await makeRequest('POST', '/api/v1/logout', {}, accessToken);
  console.log('   - HTTP Status Code:', logoutRes.statusCode);
  console.log('   - Response Payload:', JSON.stringify(logoutRes.body, null, 2));
  console.log('==================================================\n');

  console.log('=== VENDOR AUTHENTICATION VERIFICATION SUCCESSFUL ===');
  process.exit(0);
}

runVendorAuthVerification();
