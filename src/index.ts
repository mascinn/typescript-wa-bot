import { connectToWhatsApp } from './services/whatsapp.js';
import{ registerConnectionHandler } from './handlers/connection.js';
import { registerMessageHandler } from './handlers/message.js';
import { getPrayerTimes } from './services/prayer.js';
import { startReminderScheduler } from './services/reminder.js';

async function start(){
    const sock = await connectToWhatsApp();

    registerConnectionHandler(
        
        sock, 
        
        async () => {
            console.log("🔥 onOpen terpanggil!");

            const times = await getPrayerTimes();

            console.log("Prayer times: ", times)

            startReminderScheduler(times, sock);
            console.log("🔥 Scheduler berhasil dimulai!");
        },
        
        () => {
        console.log("Trying to reconnect...");
        start();
    });

    registerMessageHandler(sock);
}

start();