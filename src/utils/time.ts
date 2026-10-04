/**
 * Mengubah string jam "HH:mm" (boleh ada suffix seperti "04:31 (WIB)")
 * menjadi objek Date pada tanggal `base` (default: hari ini).
 */
export function timeToDate(time: string, base: Date = new Date()): Date {
    const match = /(\d{1,2}):(\d{2})/.exec(time);

    if (!match) {
        throw new Error(`Format jam tidak valid: "${time}"`);
    }

    const date = new Date(base);

    date.setHours(Number(match[1]), Number(match[2]), 0, 0);

    return date;
}

export function subtractMinutes(date: Date, minutes: number): Date {
    return new Date(date.getTime() - minutes * 60 * 1000);
}

/** Format tanggal "YYYY-MM-DD" sesuai timezone proses (sudah diset ke Asia/Jakarta). */
export function formatDateKey(date: Date): string {
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, "0");
    const d = String(date.getDate()).padStart(2, "0");

    return `${y}-${m}-${d}`;
}

/** Format tanggal panjang Bahasa Indonesia, misal "Minggu, 4 Oktober 2026". */
export function formatDateLong(date: Date): string {
    return date.toLocaleDateString("id-ID", {
        weekday: "long",
        day: "numeric",
        month: "long",
        year: "numeric",
    });
}

/** Format durasi menit menjadi "2 jam 15 menit" / "45 menit". */
export function formatDuration(totalMinutes: number): string {
    const minutes = Math.max(0, Math.round(totalMinutes));
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;

    if (h === 0) return `${m} menit`;
    if (m === 0) return `${h} jam`;

    return `${h} jam ${m} menit`;
}

/** Objek Date untuk besok (jam sama dengan sekarang). */
export function getTomorrow(from: Date = new Date()): Date {
    const tomorrow = new Date(from);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
}