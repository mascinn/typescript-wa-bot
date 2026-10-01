import { subtractMinutes, timeToDate } from '../utils/time.js';
import type { PrayerTimes } from './prayer.js';
import type { WASocket } from '@whiskeysockets/baileys';
import { config } from '../config/index.js';
import { getCurrentDay } from '../utils/day.js';
import { getPetugas } from './petugas.js';

const sentReminders = new Set<string>();

async function checkReminder(times: PrayerTimes, sock: WASocket){
    const now = new Date();
    const hari = getCurrentDay();

    for(const [shalat, time] of Object.entries(times)){
        const prayerTime = timeToDate(time);
        const reminderTime = subtractMinutes(prayerTime, 15);

        if (
            now.getHours() === reminderTime.getHours() &&
            now.getMinutes() === reminderTime.getMinutes()
        ){
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
                    `🔔 *15 menit menuju Shalat ${shalat}*\n\n` +
                    `🕌 Muadzin: @${petugas.adzan.nomor}\n` +
                    `🤲 Imam: @${petugas.imam.nomor}`,

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

export function startReminderScheduler(times: PrayerTimes, sock: WASocket){
    checkReminder(times,sock);

    setInterval(() => {
        checkReminder(times, sock);
    }, 60 * 1000);
}