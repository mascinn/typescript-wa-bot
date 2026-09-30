import { getPrayerTimes } from './services/prayer.js';

const prayerTimes = await getPrayerTimes();

console.log(prayerTimes);