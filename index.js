const express = require('express');
const axios = require('axios');
const path = require('path');
require('dotenv').config();
const cors = require('cors');

const app = express();
const PORT = 3001;

// --- Middleware ---
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Parse JSON bodies
app.use(express.static(path.join(__dirname, 'public'))); // Serve static files from 'public' folder

// --- Trustpilot Credentials from .env ---
const {
  TRUSTPILOT_API_KEY,
  TRUSTPILOT_API_SECRET,
  TRUSTPILOT_BUSINESS_UNIT_ID,
  TRUSTPILOT_BUSINESS_USER_ID, // Ensure this is in your .env file
} = process.env;

/**
 * Gets a Trustpilot Access Token using the Client Credentials grant type.
 */
async function getAccessToken() {
  const tokenUrl = 'https://api.trustpilot.com/v1/oauth/oauth-business-users-for-applications/accesstoken';
  const credentials = Buffer.from(`${TRUSTPILOT_API_KEY}:${TRUSTPILOT_API_SECRET}`).toString('base64');
  const requestBody = 'grant_type=client_credentials';
  const config = {
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
  };

  try {
    const response = await axios.post(tokenUrl, requestBody, config);
    console.log('Successfully retrieved access token!');
    return response.data.access_token;
  } catch (error) {
    console.error('Error: Failed to get Trustpilot access token.');
    console.error('Error Details:', error.response ? error.response.data : error.message);
    throw new Error('Failed to get Trustpilot access token');
  }
}

/**
 * Main API endpoint to handle all invitation logic.
 */
app.post('/api/create-invite', async (req, res) => {
  console.log('Received request on /api/create-invite with body:', req.body);

  try {
    const accessToken = await getAccessToken();
    const { inviteType, reviewType, customerEmail, customerName, referenceId } = req.body;

    // Route logic based on whether user wants an email or a link
    if (inviteType === 'email') {
  try { // Add a try block here to catch the specific error
    const invitationUrl = `https://api.trustpilot.com/v1/business-units/${TRUSTPILOT_BUSINESS_UNIT_ID}/invitations`;
    const payload = {
      customerEmail,
      customerName,
      referenceId,
    };
    const config = {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    };

    // --- ADD THIS LOG ---
    console.log(`DEBUG: Attempting to POST to: ${invitationUrl}`);

    await axios.post(invitationUrl, payload, config);
    res.status(200).json({ message: 'Invitation email scheduled successfully.' });

  } catch (error) {
    // --- ADD THIS LOG ---
    console.error('DEBUG: Full Axios error object:', error);

    // This is the original error handling
    console.error('Error processing invite:', error.response ? error.response.data : error.message);
    res.status(500).json({ message: 'Failed to send invitation.' });
  }


    

    } else if (inviteType === 'link') {
      // --- HANDLE GENERATING INVITATION LINKS ---
      const responseLinks = {};

      // Generate Service Review Link if needed
      if (reviewType === 'service' || reviewType === 'combined') {
        const serviceLinkUrl = `https://api.trustpilot.com/v1/business-units/${TRUSTPILOT_BUSINESS_UNIT_ID}/invitation-links`;
        const servicePayload = { email: customerEmail, name: customerName, referenceId };
        const serviceResponse = await axios.post(serviceLinkUrl, servicePayload, {
          headers: { 'Authorization': `Bearer ${accessToken}` }
        });
        responseLinks.serviceReviewInvitationLink = serviceResponse.data.url;
      }

      // Generate Product Review Link if needed
      if (reviewType === 'product' || reviewType === 'combined') {
        const productLinkUrl = 'https://api.trustpilot.com/v1/product-reviews/invitation-links';
        const productPayload = {
          email: customerEmail,
          name: customerName,
          referenceId,
          products: [{
            productUrl: req.body.productUrl,
            name: req.body.productName,
            sku: req.body.productSku,
          }],
        };
        const productResponse = await axios.post(productLinkUrl, productPayload, {
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'x-business-user-id': TRUSTPILOT_BUSINESS_USER_ID,
          }
        });
        // Format response to match what the frontend expects
        responseLinks.productReviewInvitationLinks = [{ url: productResponse.data.url }];
      }

      res.status(200).json(responseLinks);

    } else {
      res.status(400).json({ message: 'Invalid inviteType specified.' });
    }
  } catch (error) {
    console.error('Error processing invite:', error.response ? error.response.data : error.message);
    const errorMessage = error.response?.data?.message || 'An unexpected error occurred.';
    res.status(500).json({ message: errorMessage });
  }
});

app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
  console.log('Frontend should be accessible at http://localhost:3001/index.html');
  console.log('API endpoint is listening at http://localhost:3001/api/create-invite');
});