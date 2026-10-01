import { getPrayerTimes } from '../services/prayer.js';
import { startReminderScheduler } from '../services/reminder.js';
import type { WASocket } from '@whiskeysockets/baileys';
import { connectToWhatsApp } from '../services/whatsapp.js';

const times = await getPrayerTimes();
const sock = await connectToWhatsApp();

console.log("Prayer times: ", times);
startReminderScheduler(times, sock);