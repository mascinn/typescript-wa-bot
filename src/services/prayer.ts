import  { config } from '../config/index.js';


export interface PrayerTimes {
    subuh: string;
    dzuhur: string;
    ashar: string;
    maghrib: string;
    isya: string;
}

export async function getPrayerTimes(){
    const date = new Date();

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear());

    const dateString = `${day}-${month}-${year}`;

    const url = `${config.prayer.apiUrl}/timingsByCity/${dateString}` +
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
        subuh: result.data.timings.Fajr,
        dzuhur: result.data.timings.Dhuhr,
        ashar: result.data.timings.Asr,
        maghrib: result.data.timings.Maghrib,
        isya: result.data.timings.Isha,
    };
}