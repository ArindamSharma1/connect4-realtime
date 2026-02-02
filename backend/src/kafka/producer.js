const { Kafka } = require('kafkajs');

// Only init kafka if broker env var is present to avoid crashing if not used
const brokers = process.env.KAFKA_BROKER ? [process.env.KAFKA_BROKER] : [];
const kafka = brokers.length > 0 ? new Kafka({ clientId: 'connect4', brokers }) : null;
const producer = kafka ? kafka.producer() : null;

async function send(event) {
    if (!producer) return;
    try {
        await producer.connect();
        await producer.send({
            topic: 'game-analytics',
            messages: [{ value: JSON.stringify(event) }]
        });
    } catch (e) {
        console.warn('Kafka produce error', e.message);
    }
    await producer.disconnect();
}
module.exports = { send };
