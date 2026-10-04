import { config } from '../config/index.js';
import { formatDateKey } from '../utils/time.js';


export interface PrayerTimes {
    subuh: string;
    dzuhur: string;
    ashar: string;
    maghrib: string;
    isya: string;
}

export type PrayerName = keyof PrayerTimes;

/** Urutan shalat dalam sehari. */
export const PRAYER_ORDER: PrayerName[] = ["subuh", "dzuhur", "ashar", "maghrib", "isya"];

/** Label tampilan untuk setiap shalat. */
export const PRAYER_LABELS: Record<PrayerName, string> = {
    subuh:   "Subuh",
    dzuhur:  "Dzuhur",
    ashar:   "Ashar",
    maghrib: "Maghrib",
    isya:    "Isya",
};

// Cache jadwal per tanggal ("YYYY-MM-DD") supaya API tidak dipanggil berulang
// (scheduler jalan tiap menit + command dari user).
const cache = new Map<string, PrayerTimes>();
const MAX_CACHE_ENTRIES = 7;

/** Ambil "HH:mm" saja dari string jam API (antisipasi suffix seperti " (WIB)"). */
function cleanTime(value: string): string {
    return /(\d{1,2}:\d{2})/.exec(value)?.[1] ?? value;
}

/**
 * Mengambil jadwal shalat untuk tanggal tertentu dari AlAdhan API.
 * Gunakan fungsi ini ketika perlu jadwal selain hari ini (misal: besok untuk reminder Subuh).
 *
 * @param date - objek Date yang akan diambil jadwalnya
 */
export async function getPrayerTimesForDate(date: Date): Promise<PrayerTimes> {
    const key = formatDateKey(date);
    const cached = cache.get(key);

    if (cached) {
        return cached;
    }

    // Format tanggal sesuai format AlAdhan API: "DD-MM-YYYY"
    const [year, month, day] = key.split("-");
    const dateString = `${day}-${month}-${year}`;

    const url =
        `${config.prayer.apiUrl}/timingsByCity/${dateString}` +
        `?city=${encodeURIComponent(config.prayer.city)}` +
        `&country=${encodeURIComponent(config.prayer.country)}` +
        `&method=${config.prayer.method}` +
        `&timezonestring=${encodeURIComponent(config.prayer.timezone)}`;

    const response = await fetch(url, { signal: AbortSignal.timeout(15_000) });

    if (!response.ok) {
        throw new Error(`Prayer API error: ${response.status}`);
    }

    const result = await response.json();
    const timings = result?.data?.timings;

    if (!timings) {
        throw new Error("Prayer API error: format respons tidak dikenali");
    }

    const times: PrayerTimes = {
        subuh:   cleanTime(timings.Fajr),
        dzuhur:  cleanTime(timings.Dhuhr),
        ashar:   cleanTime(timings.Asr),
        maghrib: cleanTime(timings.Maghrib),
        isya:    cleanTime(timings.Isha),
    };

    cache.set(key, times);

    // Buang entry paling lama agar cache tidak membengkak
    while (cache.size > MAX_CACHE_ENTRIES) {
        const oldestKey = cache.keys().next().value;
        if (oldestKey === undefined) break;
        cache.delete(oldestKey);
    }

    return times;
}

/**
 * Mengambil jadwal shalat untuk hari ini.
 * Shortcut dari getPrayerTimesForDate(new Date()).
 */
export async function getPrayerTimes(): Promise<PrayerTimes> {
    return getPrayerTimesForDate(new Date());
}