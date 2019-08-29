const amqp = require('amqplib');

//Request ID
let uniqueID = 0;

// Random id generator
function getUniqueID () {
    uniqueID ++;
    return uniqueID.toString();
};

module.exports = {

    async startRabbit({url, eventEmmiter}) {
        let channel = null;
        await amqp.connect(url) // when the connection is created...
            .then(conn => conn.createChannel()) // and when the channel is created...
            .then(ch => {
                // the created channel will be our global channel for this server instance
                channel = ch;
                // give instructions for how to handle replies:
                // when a message is available in the reply-to queue (meaning the message has been processed by the worker)
                ch.consume('amq.rabbitmq.reply-to', msg => {
                    // emit the message to the eventEmmitter for handling (each method will handle replies differently)
                    eventEmmiter.emit(msg.properties.correlationId, msg.content);
                }, {noAck: true}); //no Ack is required
            });
        return channel;
    },

    publish({channel, routingKey, exchange, eventEmmiter, handler, msg}) {
        const queue = routingKey;
        // assign random id to our message
        let id = getUniqueID();
        // handle the reply from the worker
        eventEmmiter.once(id, handler);
        // send our message to the reservation queue
        return channel.assertExchange(exchange, 'direct') // assert message is in reservation queue
            .then(() => channel.assertQueue(queue))
            .then(() => channel.bindQueue(queue, exchange, queue))
            .then(() => {
                // send our message in a Buffer to the reservation queue
                // correlationId is set to the random id we assigned to the message. The reply will have the same correlationId.
                channel.publish(exchange, queue, Buffer.from(msg), {correlationId:id, replyTo: 'amq.rabbitmq.reply-to'});
            });
    }

}