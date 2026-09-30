import { getPrayerTimes } from '../services/prayer.js';
import { startReminderScheduler } from '../services/reminder.js';

const times = await getPrayerTimes();

console.log("Prayer times: ", times);
startReminderScheduler(times);