import { config } from '../config/index.js';


export interface PrayerTimes {
    subuh: string;
    dzuhur: string;
    ashar: string;
    maghrib: string;
    isya: string;
}

/**
 * Mengambil jadwal shalat untuk tanggal tertentu dari AlAdhan API.
 * Gunakan fungsi ini ketika perlu jadwal selain hari ini (misal: besok untuk reminder Subuh).
 *
 * @param date - objek Date yang akan diambil jadwalnya
 */
export async function getPrayerTimesForDate(date: Date): Promise<PrayerTimes> {
    // Format tanggal sesuai format AlAdhan API: "DD-MM-YYYY"
    // Gunakan Intl agar selalu dalam Asia/Jakarta, bukan UTC server
    const formatter = new Intl.DateTimeFormat("en-GB", {
        timeZone: "Asia/Jakarta",
        day:   "2-digit",
        month: "2-digit",
        year:  "numeric",
    });

    // en-GB menghasilkan "DD/MM/YYYY" → ganti "/" dengan "-"
    const dateString = formatter.format(date).replace(/\//g, "-");

    const url =
        `${config.prayer.apiUrl}/timingsByCity/${dateString}` +
        `?city=${encodeURIComponent(config.prayer.city)}` +
        `&country=${encodeURIComponent(config.prayer.country)}` +
        `&method=${config.prayer.method}` +
        `&timezonestring=${encodeURIComponent(config.prayer.timezone)}`;

    const response = await fetch(url);

    if (!response.ok) {
        throw new Error(`Prayer API error: ${response.status}`);
    }

    const result = await response.json();

    return {
        subuh:   result.data.timings.Fajr,
        dzuhur:  result.data.timings.Dhuhr,
        ashar:   result.data.timings.Asr,
        maghrib: result.data.timings.Maghrib,
        isya:    result.data.timings.Isha,
    };
}

/**
 * Mengambil jadwal shalat untuk hari ini.
 * Shortcut dari getPrayerTimesForDate(new Date()).
 */
export async function getPrayerTimes(): Promise<PrayerTimes> {
    return getPrayerTimesForDate(new Date());
}