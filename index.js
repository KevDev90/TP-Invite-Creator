// Import packages and load environment variables
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const fetch = require('node-fetch');

// --- Trustpilot Credentials from .env file ---
const TRUSTPILOT_API_KEY = process.env.TRUSTPILOT_API_KEY;
const TRUSTPILOT_API_SECRET = process.env.TRUSTPILOT_API_SECRET;
const TRUSTPILOT_BUSINESS_UNIT_ID = process.env.TRUSTPILOT_BUSINESS_UNIT_ID;

// --- Helper function to get Access Token ---
const getAccessToken = async () => {
  const authUrl = 'https://api.trustpilot.com/v1/oauth/oauth-token';
  const credentials = Buffer.from(
    `${TRUSTPILOT_API_KEY}:${TRUSTPILOT_API_SECRET}`
  ).toString('base64');

  const response = await fetch(authUrl, {
    method: 'POST',
    headers: {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/x-www-form-urlencoded',
    },
    body: 'grant_type=client_credentials',
  });

  if (!response.ok) {
    throw new Error('Failed to get Trustpilot access token');
  }

  const data = await response.json();
  return data.access_token;
};

// Initialize app
const app = express();
const PORT = 3001; // Backend port

// Middleware
app.use(cors());
app.use(express.json());

// --- Main API Endpoint ---
app.post('/api/create-invite', async (req, res) => {
  console.log('Received data from frontend:', req.body);
  const formData = req.body;

  try {
    const accessToken = await getAccessToken();
    const baseInviteApiUrl = `https://invitations-api.trustpilot.com/v1/private/business-units/${TRUSTPILOT_BUSINESS_UNIT_ID}`;

    let apiEndpoint = '';
    let requestBody = {};

    // --- Build Request Based on Invite Type ---
    if (formData.inviteType === 'email') {
      apiEndpoint = `${baseInviteApiUrl}/email-invitations`;
      // This structure is based on the Trustpilot API docs for email invites
      requestBody = {
        referenceId: formData.referenceId,
        name: formData.customerName,
        email: formData.customerEmail,
        locale: 'en-US',
        senderEmail: "someemail2@trustpilot.com", // Replace or configure as needed
        senderName: "John Doe", // Replace or configure as needed
        replyTo: "kej@trustpilot.com", // Replace or configure as needed
      };
      if (formData.reviewType === 'service' || formData.reviewType === 'combined') {
        requestBody.serviceReviewInvitation = { /* Add templateId if needed */ };
      }
      if (formData.reviewType === 'product' || formData.reviewType === 'combined') {
        requestBody.productReviewInvitation = {
          products: [{
            name: formData.productName,
            sku: formData.productSku,
            productUrl: formData.productUrl,
          }]
        };
      }
    } else { // 'link' invite
      apiEndpoint = `${baseInviteApiUrl}/invitation-links`;
      // This structure is based on the Trustpilot API docs for generating links
      requestBody = {
        referenceId: formData.referenceId,
        name: formData.customerName,
        email: formData.customerEmail,
        locale: 'en-US',
        type: formData.reviewType === 'combined' ? 'service-and-product' : formData.reviewType,
      };
      if (formData.reviewType === 'product' || formData.reviewType === 'combined') {
        requestBody.products = [{
          name: formData.productName,
          sku: formData.productSku,
          productUrl: formData.productUrl,
        }];
      }
    }

    // --- Make the API call to Trustpilot ---
    const trustpilotResponse = await fetch(apiEndpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });
    
    const responseData = await trustpilotResponse.json();

    if (!trustpilotResponse.ok) {
        // Forward the error from Trustpilot to our frontend
        throw new Error(JSON.stringify(responseData));
    }

    // --- Send Success Response to Frontend ---
    res.status(200).json(responseData);

  } catch (error) {
    console.error('Error processing invite:', error);
    res.status(500).json({ message: 'Failed to process invite', error: error.message });
  }
});

// Start Server
app.listen(PORT, () => {
  console.log(`✅ Server is running on http://localhost:${PORT}`);
});