const axios = require('axios');
require('dotenv').config();

// This function runs our test
async function debugApiCall() {
  const businessUnitId = process.env.TRUSTPILOT_BUSINESS_UNIT_ID;
  const accessToken = 'test-token'; // Using a fake token for this test
  const url = `https://api.trustpilot.com/v1/business-units/${businessUnitId}/invitations`;
  const payload = {
    customerEmail: 'test@example.com',
    customerName: 'Test Name',
    referenceId: 'debug-123',
  };
  const config = {
    headers: { Authorization: `Bearer ${accessToken}` },
  };

  console.log(`--- Running Standalone Debug Test ---`);
  console.log(`Attempting to POST to: ${url}`);

  try {
    await axios.post(url, payload, config);
    console.log('✅ Standalone test succeeded (this is unexpected).');
  } catch (error) {
    // We expect an error because the token is fake. We want to see what kind of error.
    if (error.response) {
      console.log('✅ Standalone test failed as expected.');
      console.log('Status:', error.response.status); // Should be 401 or similar
      console.log('Response Data:', error.response.data); // Should be a JSON error from Trustpilot
    } else {
      // If we get here, it means the request didn't even reach the server properly.
      console.error('❌ Standalone test failed with a network or configuration error:');
      console.error(error.message);
    }
  }
}

debugApiCall();