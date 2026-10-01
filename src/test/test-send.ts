import { connectToWhatsApp } from '../services/whatsapp.js';
import { config } from '../config/index.js';

const sock = await connectToWhatsApp();

sock.ev.on("connection.update", async (update) => {
    const { connection } = update;

    if(connection === "open"){
        console.log("WhatsApp Connected");

        await sock.sendMessage(config.whatsapp.groupJid, {
            text: "_TEST"
        });

        console.log("Pesan terkirim");
    }
})