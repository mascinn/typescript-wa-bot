import { connectToWhatsApp } from './services/whatsapp.js';
import{ registerConnectionHandler } from './handlers/connection.js';
import { registerMessageHandler } from './handlers/message.js';

async function start(){
    const sock = await connectToWhatsApp();

    registerConnectionHandler(sock, () => {
        console.log("Trying to reconnect...");
        start();
    });

    registerMessageHandler(sock);
}

start();