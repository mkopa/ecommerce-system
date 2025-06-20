// src/index.ts
import express from 'express';
import mongoose from 'mongoose';

import { connectRabbitMQ } from './rabbitmq';
import { connectRedis } from './redis';
import productRouter from './routes/product.routes'; // Import our router

const app = express();
const port = process.env.PORT || 3000;
const mongoUri = process.env.MONGO_URI;

const connectDB = async () => {
  if (!mongoUri) {
    console.error('Error: MONGO_URI environment variable is not defined.');
    process.exit(1);
  }
  try {
    await mongoose.connect(mongoUri);
    console.log('Connected to MongoDB!');
  } catch (err) {
    console.error('Error connecting to MongoDB:', err);
    process.exit(1);
  }
};

const startServer = async () => {
  await connectDB();
  await connectRabbitMQ();
  await connectRedis();

  // Middleware to parse request body as JSON
  app.use(express.json());

  // Main welcome endpoint
  app.get('/', (req, res) => {
    res.json({
      message: 'Welcome to the product-service for Erli!',
      databaseStatus: mongoose.connection.readyState === 1 ? 'connected' : 'disconnected',
    });
  });

  // Use the product router for all requests starting with /api/products
  app.use('/api/products', productRouter);

  app.listen(port, () => {
    console.log(`Product-service server is listening on port ${port}`);
  });
};

startServer();
