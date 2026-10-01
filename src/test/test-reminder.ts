import { startReminderScheduler } from "../services/reminder.js";
import { connectToWhatsApp } from "../services/whatsapp.js";

const sock = await connectToWhatsApp();

sock.ev.on("connection.update", (update) => {

    if (update.connection !== "open") return;

    console.log("WhatsApp Connected!");

    const prayerTime = "12:56";

    const times = {
        subuh: "04:27",
        dzuhur: prayerTime,
        ashar: "14:52",
        maghrib: "17:53",
        isya: "19:02"
    };

    console.log("Prayer times:", times);

    startReminderScheduler(times, sock);
});