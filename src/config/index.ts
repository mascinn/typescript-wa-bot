import "dotenv/config";

export const config = {
    prayer: {
        apiUrl: process.env.PRAYER_API_URL ?? "https://api.aladhan.com/v1",
        city: process.env.PRAYER_CITY ?? "",
        country: process.env.PRAYER_COUNTRY ?? "",
        method: Number(process.env.PRAYER_METHOD ?? 20),
        timezone: process.env.PRAYER_TIMEZONE ?? "Asia/Jakarta",
        reminderMinutes: Number(process.env.REMINDER_MINUTES ?? 15),
    },

    whatsapp: {
        groupJid: process.env.WHATSAPP_GROUP_JID ?? "",
    },
};