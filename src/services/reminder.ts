import { subtractMinutes, timeToDate } from '../utils/time.js';
import type { PrayerTimes } from './prayer.js';

function checkReminder(times: PrayerTimes){
    const now = new Date();

    for(const [shalat, time] of Object.entries(times)){
        const prayerTime = timeToDate(time);
        const reminderTime = subtractMinutes(prayerTime, 15);

        if (
            now.getHours() === reminderTime.getHours() &&
            now.getMinutes() === reminderTime.getMinutes()
        ){
            console.log(`Reminder: ${shalat}`);
        }
    }

    console.log("Scheduler check: ", now);
}

export function startReminderScheduler(times: PrayerTimes){
    checkReminder(times);

    setInterval(() => {
        checkReminder(times);
    }, 60 * 1000);
}