// product-service/src/rabbitmq.ts
import amqp from 'amqplib';

let channel: amqp.Channel;
const PRODUCT_EVENTS_EXCHANGE = 'product_events'; 

export async function connectRabbitMQ() {
  try {
    const RABBITMQ_URI = process.env.RABBITMQ_URI || 'amqp://localhost';
    const connection = await amqp.connect(RABBITMQ_URI);
    channel = await connection.createChannel();
    console.log('Connected to RabbitMQ from product-service!');
  } catch (error) {
    console.error('Failed to connect to RabbitMQ from product-service', error);
  }
}

export function sendMessage(queue: string, message: string) {
  if (channel) {
    // `durable: true` ensures that the queue will survive a broker restart
    channel.assertQueue(queue, { durable: true });
    // RabbitMQ operates on buffers, so we convert the string to a buffer
    channel.sendToQueue(queue, Buffer.from(message));
    console.log(`Sent message to queue ${queue}: ${message}`);
  }
}

export function publishToExchange(message: string) {
  if (channel) {
    // We ensure the exchange exists and is of type 'fanout'
    channel.assertExchange(PRODUCT_EVENTS_EXCHANGE, 'fanout', { durable: true });
    // We publish the message to the exchange. The routing key ('') is ignored in fanout mode.
    channel.publish(PRODUCT_EVENTS_EXCHANGE, '', Buffer.from(message));
    console.log(`Sent message to exchange ${PRODUCT_EVENTS_EXCHANGE}: ${message}`);
  }
}