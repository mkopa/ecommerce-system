// search-indexer-service/src/index.ts
import amqp from 'amqplib';
import { Client } from '@elastic/elasticsearch';

// Service connection configuration
const RABBITMQ_URI = process.env.RABBITMQ_URI || 'amqp://localhost';
const ELASTICSEARCH_URI = process.env.ELASTICSEARCH_URI || 'http://localhost:9200';
const EXCHANGE_NAME = 'product_events';
const INDEX_NAME = 'products'; // Name of our index in Elasticsearch

// Initialize Elasticsearch client
const esClient = new Client({ 
    node: ELASTICSEARCH_URI
});

async function processMessage(msg: amqp.ConsumeMessage) {
    const messageContent = msg.content.toString();
    console.log(`[Indexer Service] Received event: ${messageContent}`);

    try {
        const event = JSON.parse(messageContent);
        // We check if the event contains the necessary product data
        if ((event.event === 'PRODUCT_CREATED' || event.event === 'PRODUCT_UPDATED') && event.product) {
            console.log(`[Indexer Service] Indexing product ID: ${event.product._id}`);

            // We use the `index` method of the ES client.
            // Providing an ID ensures that updates will overwrite the existing document (upsert).
            await esClient.index({
                index: INDEX_NAME,
                id: event.product._id,
                document: {
                    name: event.product.name,
                    description: event.product.description,
                    price: event.product.price,
                    sku: event.product.sku
                }
            });
            console.log(`[Indexer Service] Successfully indexed product ID: ${event.product._id}`);
        }
    } catch (e) {
        console.error('[Indexer Service] Error processing message', e);
    }
}

async function main() {
  console.log('[Indexer Service] Starting service...');
  try {
    // RabbitMQ consumer logic (very similar to notification-service)
    const connection = await amqp.connect(RABBITMQ_URI);
    const channel = await connection.createChannel();
    await channel.assertExchange(EXCHANGE_NAME, 'fanout', { durable: true });
    const q = await channel.assertQueue('', { exclusive: true });
    await channel.bindQueue(q.queue, EXCHANGE_NAME, '');

    console.log(`[Indexer Service] Listening for events from exchange: ${EXCHANGE_NAME}`);
    channel.consume(q.queue, (msg) => {
        if(msg) processMessage(msg);
    }, { noAck: true });

  } catch (error) {
    console.error('[Indexer Service] Critical error', error);
    setTimeout(main, 5000); // Retry connection after 5 seconds
  }
}

main();