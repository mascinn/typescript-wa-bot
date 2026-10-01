import { subtractMinutes, timeToDate } from '../utils/time.js';
import type { PrayerTimes } from './prayer.js';
import type { WASocket } from '@whiskeysockets/baileys';
import { config } from '../config/index.js';

const sentReminders = new Set<string>();

async function checkReminder(times: PrayerTimes, sock: WASocket){
    const now = new Date();

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

            sentReminders.add(reminderId);

            await sock.sendMessage(config.whatsapp.groupJid, {
                text: `🔔 Pengingat: 15 menit lagi menuju shalat ${shalat}.`,
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