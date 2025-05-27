const express = require('express');
const axios = require('axios');
const cors = require('cors');
require('dotenv').config();
const app = express();

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

const IP = process.env.IP || 'localhost';
const PORT = process.env.PORT || 3000;
const FLXPOINT_TOKEN = process.env.FLXPOINT_TOKEN;

const flxpoint = axios.create({
  baseURL: 'https://api.flxpoint.com/listing/parents',
  headers: {
    Accept: 'application/json',
  },
});

class FlxPointAttributes {
  constructor(context) {
    if (!context.flxpointToken) {
      throw new Error('FLXPOINT_TOKEN is required');
    }
    flxpoint.defaults.headers.common['X-API-TOKEN'] = context.flxpointToken;
    this.sku = context.product_sku;
  }

  async getAttributes() {
    try {
      const response = await flxpoint.get(`?skus=${this.sku}&includeAttributes=true`);
      return response.data;
    } catch (error) {
      console.error('Error fetching attributes from Flxpoint API:', error.message);
      throw error;
    }
  }
}

const flxpointMiddleware = async (req, res, next) => {
  try {
    const sku = req.query.skus;
    if (!sku) {
      return res.status(400).json({ error: 'SKU is required' });
    }

    if (!FLXPOINT_TOKEN) {
      return res.status(500).json({ error: 'FLXPOINT_TOKEN is not defined in environment variables' });
    }

    const context = {
      flxpointToken: FLXPOINT_TOKEN,
      product_sku: sku,
    };

    const flxpointAttributes = new FlxPointAttributes(context);
    const attributes = await flxpointAttributes.getAttributes();
    req.flxpointAttributes = attributes;
    next();
  } catch (error) {
    console.error('Flxpoint Middleware Error:', error.message);
    next(error);
  }
};

app.use((err, req, res, next) => {
  console.error('Error:', err.message);
  res.status(500).json({
    error: 'Failed to process request',
    details: err.message,
  });
});

app.get('/', (req, res) => {
  res.send('Hello World');
});

app.get('/attributes', flxpointMiddleware, (req, res) => {
  res.status(200).json(req.flxpointAttributes);
});

app.listen(PORT, IP, () => {
  console.log(`Server is running on http://${IP}:${PORT}`);
}).on('error', (err) => {
  console.error('Server failed to start:', err.message);
});