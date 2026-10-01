import { subtractMinutes, timeToDate } from "../utils/time.js";
import type { PrayerTimes } from "./prayer.js";
import type { WASocket } from "@whiskeysockets/baileys";
import { config } from "../config/index.js";
import { getCurrentDay } from "../utils/day.js";
import { getPetugas } from "./petugas.js";
import { getPrayerTimes } from "./prayer.js";

const sentReminders = new Set<string>();
const REMINDER_WINDOW_MINUTES = 2;

let schedulerInterval: NodeJS.Timeout | null = null;

async function checkReminder(
    times: PrayerTimes,
    sock: WASocket
) {
    const now = new Date();
    const hari = getCurrentDay();

    for (const [shalat, time] of Object.entries(times)) {
        const prayerTime = timeToDate(time);
        const reminderTime = subtractMinutes(prayerTime, 15);

        const windowEnd = new Date(
            reminderTime.getTime() +
            REMINDER_WINDOW_MINUTES * 60 * 1000
        );

        if (now >= reminderTime && now < windowEnd) {
            const reminderId =
                `${shalat}-${reminderTime.toDateString()}`;

            if (sentReminders.has(reminderId)) {
                continue;
            }

            const petugas = getPetugas(hari, shalat);

            if (!petugas) {
                continue;
            }

            const adzanJid =
                `${petugas.adzan.nomor}@s.whatsapp.net`;

            const imamJid =
                `${petugas.imam.nomor}@s.whatsapp.net`;

            sentReminders.add(reminderId);

            await sock.sendMessage(
                config.whatsapp.groupJid,
                {
                    text:
                        `🕌 *${shalat} — ${time}*\n` +
                        `⏰ 15 menit lagi\n\n` +
                        `🔊 Muadzin: ${petugas.adzan.nama} — @${petugas.adzan.nomor}\n` +
                        `🤲 Imam: ${petugas.imam.nama} — @${petugas.imam.nomor}`,

                    mentions: [
                        adzanJid,
                        imamJid
                    ]
                }
            );

            console.log(
                `🔔 Reminder sent: ${shalat} — ${time}`
            );
        }
    }
}

export function startReminderScheduler(
    times: PrayerTimes,
    sock: WASocket
) {
    // Pastikan scheduler lama tidak berjalan
    if (schedulerInterval) {
        clearInterval(schedulerInterval);
    }

    let currentTimes = times;
    let currentDate = new Date().toDateString();

    // Cek langsung ketika scheduler dimulai
    checkReminder(currentTimes, sock);

    schedulerInterval = setInterval(async () => {
        const today = new Date().toDateString();

        // Ambil jadwal baru ketika berganti hari
        if (today !== currentDate) {
            currentTimes = await getPrayerTimes();
            currentDate = today;

            console.log("📅 Prayer times updated");
        }

        checkReminder(currentTimes, sock);
    }, 60 * 1000);
}

export function stopReminderScheduler() {
    if (schedulerInterval) {
        clearInterval(schedulerInterval);
        schedulerInterval = null;

        console.log("⏹️ Reminder scheduler stopped");
    }
}