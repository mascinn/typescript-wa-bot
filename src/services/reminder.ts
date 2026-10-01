import { subtractMinutes, timeToDate } from '../utils/time.js';
import type { PrayerTimes } from './prayer.js';
import type { WASocket } from '@whiskeysockets/baileys';
import { config } from '../config/index.js';
import { getCurrentDay } from '../utils/day.js';
import { getPetugas } from './petugas.js';
import { getPrayerTimes } from './prayer.js';

const sentReminders = new Set<string>();
const REMINDER_WINDOW_MINUTES = 2;

async function checkReminder(times: PrayerTimes, sock: WASocket){
    const now = new Date();
    const hari = getCurrentDay();

    for(const [shalat, time] of Object.entries(times)){
        const prayerTime = timeToDate(time);
        const reminderTime = subtractMinutes(prayerTime, 15);

        const windowEnd = new Date(
            reminderTime.getTime() + REMINDER_WINDOW_MINUTES * 60 * 1000
        );

        if(now >= reminderTime && now < windowEnd){

            const reminderId = `${shalat}-${reminderTime.toDateString()}`;

            if(sentReminders.has(reminderId)){
                continue;
            }

            const petugas = getPetugas(hari, shalat);
            if(!petugas){
                continue;
            }

            const adzanJid = `${petugas.adzan.nomor}@s.whatsapp.net`;
            const imamJid = `${petugas.imam.nomor}@s.whatsapp.net`;

            sentReminders.add(reminderId);

            await sock.sendMessage(config.whatsapp.groupJid, {
                text:
                    `🕌 *${shalat} — ${time}*\n` +
                    `⏰ 15 menit lagi\n\n` +
                    `🔊 Muadzin: ${petugas.adzan.nama} — @${petugas.adzan.nomor}\n` +
                    `🤲 Imam: ${petugas.imam.nama} — @${petugas.imam.nomor}`,

                mentions: [
                    adzanJid,
                    imamJid
                ]
            });

            console.log(`Reminder: ${shalat}`);
        }
    }

    console.log("Scheduler check: ", now);
}

export function startReminderScheduler(
    times: PrayerTimes,
    sock: WASocket
){
    let currentTimes = times;
    let currentDate = new Date().toDateString();

    checkReminder(times,sock);

    setInterval(async () => {
        const today = new Date().toDateString();

        if(today !== currentDate){
            currentTimes = await getPrayerTimes();
            currentDate = today;

            console.log("Prayer times updated: ", currentTimes);
        }

        checkReminder(currentTimes, sock);
    }, 60 * 1000);
}