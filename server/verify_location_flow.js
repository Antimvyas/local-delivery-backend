const http = require('http');
const jwt = require('jsonwebtoken');

const JWT_SECRET = "super_secret_access_key_123!";

// Generate mock tokens
const customerA = jwt.sign({ user_id: 6, role: 'customer' }, JWT_SECRET, { expiresIn: '15m' }); // Antim
const customerB = jwt.sign({ user_id: 7, role: 'customer' }, JWT_SECRET, { expiresIn: '15m' }); // Test Customer
const vendorA = jwt.sign({ user_id: 1, role: 'vendor' }, JWT_SECRET, { expiresIn: '15m' }); // Pizza wings (vendor 1)
const vendorB = jwt.sign({ user_id: 2, role: 'vendor' }, JWT_SECRET, { expiresIn: '15m' }); // Pizza wings (vendor 2)

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
      let responseBody = '';
      res.on('data', (chunk) => { responseBody += chunk; });
      res.on('end', () => {
        let parsed = null;
        try {
          parsed = JSON.parse(responseBody);
        } catch (e) {}
        resolve({ statusCode: res.statusCode, data: parsed });
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

async function runTests() {
  console.log('--- STARTING LOCATION PHASE INTEGRATION TESTS ---');
  let passed = 0;
  let failed = 0;

  const assert = (name, cond) => {
    if (cond) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.log(`[FAIL] ${name}`);
      failed++;
    }
  };

  try {
    // Test 1: Reverse Geocoding via Nominatim / Fallback
    console.log('\n1. Testing Reverse Geocoding...');
    const geoRes = await makeRequest('POST', '/api/v1/location/reverse-geocode', customerA, {
      latitude: 29.1492,
      longitude: 75.7217
    });
    assert("Reverse geocoding endpoint returns 200 OK", geoRes.statusCode === 200);
    assert("Geocoding payload contains human-readable address", geoRes.data && typeof geoRes.data.formatted_address === 'string');
    console.log(`   Formatted Address returned: ${geoRes.data?.formatted_address}`);

    // Test 2: Add Customer Addresses
    console.log('\n2. Testing Customer Address Management...');
    const addr1 = await makeRequest('POST', '/api/v1/customer/addresses', customerA, {
      address_type: 'home',
      latitude: 29.1492,
      longitude: 75.7217,
      formatted_address: 'Sector 15, Hisar, Haryana',
      is_default: true
    });
    console.log("   addr1 response:", addr1.statusCode, addr1.data);
    assert("Customer A saves default Home address successfully", addr1.statusCode === 200 && addr1.data && addr1.data.success);
    const addressId1 = addr1.data?.address_id;

    const addr2 = await makeRequest('POST', '/api/v1/customer/addresses', customerA, {
      address_type: 'work',
      latitude: 29.1800,
      longitude: 75.7217,
      formatted_address: 'Sector 13, Hisar, Haryana',
      is_default: false
    });
    console.log("   addr2 response:", addr2.statusCode, addr2.data);
    assert("Customer A saves Work address successfully", addr2.statusCode === 200);
    const addressId2 = addr2.data?.address_id;

    // Test 3: Fetch saved addresses
    const fetchRes = await makeRequest('GET', '/api/v1/customer/addresses', customerA);
    console.log("   fetchRes response:", fetchRes.statusCode, fetchRes.data);
    assert("Customer A fetches saved addresses (size >= 2)", fetchRes.statusCode === 200 && fetchRes.data && fetchRes.data.length >= 2);

    // Test 4: Address ownership protection
    console.log('\n3. Testing Address Security & Ownership...');
    const deleteAttack = await makeRequest('DELETE', `/api/v1/customer/addresses/${addressId1 || 0}`, customerB);
    assert("Customer B trying to delete Customer A's address is rejected with 403 Forbidden", deleteAttack.statusCode === 403);

    const defaultAttack = await makeRequest('PUT', `/api/v1/customer/addresses/${addressId1 || 0}/default`, customerB);
    assert("Customer B trying to set Customer A's default address is rejected with 403 Forbidden", defaultAttack.statusCode === 403);

    // Test 5: Vendor location updates
    console.log('\n4. Testing Vendor Location Updates...');
    const vLoc1 = await makeRequest('POST', '/api/v1/vendor/location', vendorA, {
      latitude: 29.1492,
      longitude: 75.7217,
      formatted_address: 'Pizza Wings Shop, Hisar, Haryana',
      service_radius: 5.50
    });
    assert("Vendor A updates shop location & service range (5.5km) successfully", vLoc1.statusCode === 200);

    const vLoc2 = await makeRequest('POST', '/api/v1/vendor/location', vendorB, {
      latitude: 29.2000,
      longitude: 75.7500,
      formatted_address: 'Tea Corner Shop, Hisar, Haryana',
      service_radius: 2.00
    });
    assert("Vendor B updates shop location successfully", vLoc2.statusCode === 200);

    // Test 6: Vendor location update role restriction
    const vLocAttack = await makeRequest('POST', '/api/v1/vendor/location', customerA, {
      latitude: 29.1492,
      longitude: 75.7217,
      formatted_address: 'Attack Shop',
      service_radius: 10
    });
    assert("Customer A trying to update vendor location is rejected with 403 Forbidden", vLocAttack.statusCode === 403);

    // Test 7: Fetch sorted nearby vendors
    console.log('\n5. Testing Haversine Distance Sorting...');
    const nearbyRes = await makeRequest('GET', '/api/v1/customer/nearby-vendors?latitude=29.1492&longitude=75.7217', customerA);
    console.log("   nearbyRes response:", nearbyRes.statusCode, nearbyRes.data);
    assert("Customer A fetches sorted nearby shops", nearbyRes.statusCode === 200);
    if (nearbyRes.data && nearbyRes.data.length > 0) {
      console.log("   Nearby Shop distances:");
      nearbyRes.data.forEach(shop => {
        console.log(`     - ${shop.Shop_name} (${shop.formatted_address}): ${shop.distance} km away, Within Radius? ${shop.is_within_service_radius}`);
      });
      const firstShop = nearbyRes.data[0];
      const lastShop = nearbyRes.data[nearbyRes.data.length - 1];
      if (firstShop.distance !== null && lastShop.distance !== null) {
        assert("Shops are sorted in ascending order of distance", firstShop.distance <= lastShop.distance);
      }
    }

    // Clean up test addresses
    console.log('\n6. Cleaning up test addresses...');
    if (addressId1) await makeRequest('DELETE', `/api/v1/customer/addresses/${addressId1}`, customerA);
    if (addressId2) await makeRequest('DELETE', `/api/v1/customer/addresses/${addressId2}`, customerA);
    console.log("   Cleanup finished.");

  } catch (err) {
    console.error("❌ Test run encountered exception:", err);
    failed++;
  }

  console.log(`\n=== LOCATION TEST SUMMARY ===`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  process.exit(failed > 0 ? 1 : 0);
}

runTests();
