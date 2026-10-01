import "./server.js";

import { connectToWhatsApp } from "./services/whatsapp.js";
import { registerConnectionHandler } from "./handlers/connection.js";
import { registerMessageHandler } from "./handlers/message.js";
import { getPrayerTimes } from "./services/prayer.js";
import { startReminderScheduler } from "./services/reminder.js";

async function start() {
    const sock = await connectToWhatsApp();

    registerConnectionHandler(
        sock,

        async () => {
            const times = await getPrayerTimes();

            console.log("📅 Prayer times loaded");
            console.log(`   Subuh    : ${times.subuh}`);
            console.log(`   Dzuhur   : ${times.dzuhur}`);
            console.log(`   Ashar    : ${times.ashar}`);
            console.log(`   Maghrib  : ${times.maghrib}`);
            console.log(`   Isya     : ${times.isya}`);

            startReminderScheduler(times, sock);

            console.log("⏰ Reminder scheduler started");
        },

        () => {
            console.log("🔄 Trying to reconnect...");

            start();
        }
    );

    registerMessageHandler(sock);
}

start();