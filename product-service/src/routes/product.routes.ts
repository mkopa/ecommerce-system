// ecommerce-system/product-service/src/routes/product.routes.ts

import { Client } from '@elastic/elasticsearch';
import { Router, Request, Response } from 'express';

import Product from '../models/product.model';
import { publishToExchange } from '../rabbitmq';
import { redisClient } from '../redis';

const router = Router();

// Initialize Elasticsearch client
const esClient = new Client({ node: process.env.ELASTICSEARCH_URI || 'http://localhost:9200' });

// === FULL-TEXT SEARCH ENDPOINT ===
// GET /api/products/search?q=...
router.get('/search', async (req: Request, res: Response) => {
  try {
    const query = req.query.q as string;

    if (!query) {
      return res.status(400).json({ message: 'Search parameter "q" is missing.' });
    }

    const { hits } = await esClient.search({
      index: 'products',
      query: {
        multi_match: {
          query: query,
          fields: ['name', 'description'],
          fuzziness: 'AUTO',
        },
      },
    });

    const results = hits.hits.map((hit) => hit._source);
    res.status(200).json(results);
  } catch (error) {
    console.error('Error searching in Elasticsearch:', error);
    res.status(500).json({ message: 'Server error during search' });
  }
});

// === GET ALL PRODUCTS ===
// GET /api/products
router.get('/', async (req: Request, res: Response) => {
  try {
    const products = await Product.find();
    res.status(200).json(products);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// === GET ONE PRODUCT BY ID WITH CACHE-ASIDE ===
router.get('/:id', async (req: Request, res: Response) => {
  const productId = req.params.id;
  const cacheKey = `product:${productId}`;

  try {
    const cachedProduct = await redisClient.get(cacheKey);
    if (cachedProduct) {
      console.log(`CACHE HIT for key: ${cacheKey}`);
      return res.status(200).json(JSON.parse(cachedProduct));
    }

    console.log(`CACHE MISS for key: ${cacheKey}`);
    const product = await Product.findById(productId);
    if (!product) {
      return res.status(404).json({ message: 'Product with the given ID not found.' });
    }

    await redisClient.set(cacheKey, JSON.stringify(product), { EX: 3600 });
    res.status(200).json(product);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// === CREATE PRODUCT ===
// POST /api/products
router.post('/', async (req: Request, res: Response) => {
  try {
    const { name, description, price, sku } = req.body;
    if (!name || !price || !sku) {
      return res.status(400).json({ message: 'Fields name, price, and sku are required.' });
    }
    const newProduct = new Product({ name, description, price, sku });
    await newProduct.save();
    const eventMessage = JSON.stringify({ event: 'PRODUCT_CREATED', product: newProduct });
    publishToExchange(eventMessage);
    res.status(201).json(newProduct);
  } catch (error) {
    // eslint-disable-next-line
    if (error instanceof Error && (error as any).code === 11000) {
      return res.status(400).json({ message: 'Product with the given SKU already exists.' });
    }
    res.status(500).json({ message: 'Server error', error });
  }
});

// === UPDATE PRODUCT BY ID ===
// PUT /api/products/:id
router.put('/:id', async (req: Request, res: Response) => {
  try {
    const updatedProduct = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!updatedProduct) {
      return res.status(404).json({ message: 'Product with the given ID not found.' });
    }
    const eventMessage = JSON.stringify({ event: 'PRODUCT_UPDATED', product: updatedProduct });
    publishToExchange(eventMessage);
    res.status(200).json(updatedProduct);
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

// === DELETE PRODUCT BY ID ===
// DELETE /api/products/:id
router.delete('/:id', async (req: Request, res: Response) => {
  try {
    const deletedProduct = await Product.findByIdAndDelete(req.params.id);
    if (!deletedProduct) {
      return res.status(404).json({ message: 'Product with the given ID not found.' });
    }
    res.status(200).json({ message: 'Product successfully deleted.' });
  } catch (error) {
    res.status(500).json({ message: 'Server error', error });
  }
});

export default router;
