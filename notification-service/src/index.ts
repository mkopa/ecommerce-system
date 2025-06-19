// notification-service/src/index.ts
import amqp from 'amqplib';
import { redisClient, connectRedis } from './redis';

const RABBITMQ_URI = process.env.RABBITMQ_URI || 'amqp://localhost';
const EXCHANGE_NAME = 'product_events';

async function main() {
  await connectRedis();
  console.log('[Notification Service] Try to connect to RabbitMQ...');
  try {
    const connection = await amqp.connect(RABBITMQ_URI);
    const channel = await connection.createChannel();

    await channel.assertExchange(EXCHANGE_NAME, 'fanout', { durable: true });
    const q = await channel.assertQueue('', { exclusive: true });

    console.log(`[Notification Service] Created temporary queue: ${q.queue}`);
    await channel.bindQueue(q.queue, EXCHANGE_NAME, '');
    console.log(`[Notification Service] Listening echange messages: ${EXCHANGE_NAME}`);

    channel.consume(q.queue, async (msg) => {
      if (msg) {
        const messageContent = msg.content.toString();
        console.log(`[Notification Service] New event: ${messageContent}`);

        try {
            const event = JSON.parse(messageContent);
            if (event.event === 'PRODUCT_UPDATED' && event.productId) {
                const cacheKey = `product:${event.productId}`;
                await redisClient.del(cacheKey);
                console.log(`CACHE INVALIDATED for key: ${cacheKey}`);
            }
        } catch (e) {
            console.error('Error during message processing', e);
        }
      }
    }, { noAck: true });

  } catch (error) {
    console.error('[Notification Service] Could not connect to RabbitMQ', error);
    setTimeout(main, 5000);
  }
}

main();