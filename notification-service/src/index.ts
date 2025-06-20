// notification-service/src/index.ts
// eslint-disable-next-line
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

    channel.consume(
      q.queue,
      async (msg) => {
        // The message must exist to be processed
        if (msg) {
          const messageContent = msg.content.toString();
          console.log(`[Notification Service] New event: ${messageContent}`);

          try {
            const event = JSON.parse(messageContent);

            // Check if the event is a product update and if it contains an ID
            if (event.event === 'PRODUCT_UPDATED' && event.product?._id) {
              // The Redis key deletion is idempotent - deleting the same key multiple times is safe.
              const cacheKey = `product:${event.product._id}`;
              await redisClient.del(cacheKey);
              console.log(`CACHE INVALIDATED for key: ${cacheKey}`);
            }

            // Acknowledge the successful processing of the message. RabbitMQ can now safely delete it.
            channel.ack(msg);
          } catch (e) {
            console.error('[Notification Service] Error during message processing', e);
            // Inform RabbitMQ that processing failed.
            // The message will be returned to the queue (third argument `requeue = true`).
            channel.nack(msg, false, true);
          }
        }
      },
      { noAck: false },
    ); // Changed noAck to false!
  } catch (error) {
    console.error('[Notification Service] Could not connect to RabbitMQ', error);
    setTimeout(main, 5000); // Retry connection after 5 seconds
  }
}

main();
