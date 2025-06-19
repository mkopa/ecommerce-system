// product-service/src/redis.ts
import { createClient } from 'redis';

const REDIS_URI = process.env.REDIS_URI || 'redis://localhost:6379';
export const redisClient = createClient({ url: REDIS_URI });

redisClient.on('error', (err) => console.log('Redis connection error:', err));

export async function connectRedis() {
    try {
        await redisClient.connect();
        console.log('Connected to Redis!');
    } catch (error) {
        console.error('Failed to connect to Redis', error);
    }
}