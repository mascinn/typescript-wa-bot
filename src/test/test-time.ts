import { timeToDate, subtractMinutes } from '../utils/time.js';

const prayerTime = timeToDate("17:54");

const reminderTime = subtractMinutes(prayerTime, 15);

console.log("Prayer time: ", prayerTime);
console.log("Reminder time: ", reminderTime);