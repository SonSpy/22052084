require('dotenv').config();
const express = require('express');
const axios = require('axios');
const NodeCache = require('node-cache');
const app = express();

const PORT = process.env.API_PORT || 3000;
const TEST_SERVER_URL = process.env.API_BASE_URL;
const API_KEY = process.env.API_KEY;
const AUTH_TOKEN = process.env.AUTH_TOKEN;
const BEARER_TOKEN = process.env.BEARER_TOKEN;

const requiredEnvVars = ['API_BASE_URL', 'API_KEY'];
for (const envVar of requiredEnvVars) {
  if (!process.env[envVar]) {
    console.error(`Missing required environment variable: ${envVar}`);
    process.exit(1);
  }
}

const cache = new NodeCache({ stdTTL: 60, checkperiod: 120 });

axios.defaults.baseURL = TEST_SERVER_URL;
axios.defaults.headers.common['x-api-key'] = API_KEY;
axios.defaults.headers.common['Authorization'] = AUTH_TOKEN 
  ? `Token ${AUTH_TOKEN}`
  : `Bearer ${BEARER_TOKEN}`;

app.use((err, req, res, next) => {
  console.error('API Error:', {
    message: err.message,
    url: req.originalUrl,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
  res.status(500).json({ 
    error: 'API request failed',
    details: process.env.NODE_ENV === 'development' ? err.message : null
  });
});

async function getAllUsers() {
  const cachedUsers = cache.get('allUsers');
  if (cachedUsers) return cachedUsers;

  try {
    const response = await axios.get('/users', {
      timeout: 5000,
      headers: {
        'Cache-Control': 'no-cache'
      }
    });
    
    if (!response.data.users) {
      throw new Error('Invalid response format - missing users data');
    }
    
    cache.set('allUsers', response.data.users);
    return response.data.users;
  } catch (error) {
    console.error('User fetch error:', {
      status: error.response?.status,
      data: error.response?.data,
      config: error.config
    });
    throw error;
  }
}

app.listen(PORT, async () => {
  console.log(`Server running on port ${PORT}`);
  console.log('Testing API connection...');
  
  try {
    const testResponse = await axios.get('/users');
    console.log('API connection successful! Status:', testResponse.status);
  } catch (error) {
    console.error('Initial API connection failed:', {
      status: error.response?.status,
      message: error.message
    });
  }
});