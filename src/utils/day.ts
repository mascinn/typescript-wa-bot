const days = [
    "minggu",
    "senin",
    "selasa",
    "rabu",
    "kamis",
    "jumat",
    "sabtu"
];

/**
 * Mendapatkan nama hari dari objek Date tertentu.
 * Menggunakan getDay() yang sudah terpengaruh TZ=Asia/Jakarta dari env.
 *
 * @param date - objek Date yang ingin diketahui nama harinya
 */
export function getDayName(date: Date): string {
    return days[date.getDay()];
}

/**
 * Mendapatkan nama hari saat ini.
 * Shortcut dari getDayName(new Date()).
 */
export function getCurrentDay(): string {
    return getDayName(new Date());
}