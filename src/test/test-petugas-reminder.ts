import { getCurrentDay } from '../utils/day.js';
import { getPetugas } from '../services/petugas.js';
import { getPrayerTimes } from '../services/prayer.js';

const hari = getCurrentDay();
const shalat = "maghrib";

const petugas = getPetugas(hari, shalat);

console.log("Hari : ", hari);
console.log("Shalat : ", shalat);
console.log("Petugas : ", petugas);