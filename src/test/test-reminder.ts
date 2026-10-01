import { startReminderScheduler } from "../services/reminder.js";
import { connectToWhatsApp } from "../services/whatsapp.js";

const sock = await connectToWhatsApp();

sock.ev.on("connection.update", (update) => {
    if (update.connection !== "open") return;

    console.log("WhatsApp Connected!");

    const now = new Date();

    const reminderTime = new Date(
        now.getTime() - 60 * 1000
    );

    const prayerTime = new Date(
        reminderTime.getTime() + 15 * 60 * 1000
    );

    const formatTime = (date: Date) => {
        return `${String(date.getHours()).padStart(2, "0")}:${String(
            date.getMinutes()
        ).padStart(2, "0")}`;
    };

    const times = {
        subuh: "04:27",
        dzuhur: formatTime(prayerTime),
        ashar: "14:52",
        maghrib: "17:53",
        isya: "19:02",
    };

    console.log("Prayer times:", times);

    startReminderScheduler(times, sock);
});