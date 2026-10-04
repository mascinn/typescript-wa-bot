/**
 * jadwal-info.ts
 *
 * Menyusun teks balasan untuk command cek jadwal (/jadwal, /isya, dst).
 */

import { getDayName } from "../utils/day.js";
import { formatDateLong, formatDuration, timeToDate } from "../utils/time.js";
import { peekKultumForDate } from "./kultum.js";
import { getPetugas } from "./petugas.js";
import {
    getPrayerTimes,
    PRAYER_LABELS,
    PRAYER_ORDER,
    type PrayerName,
    type PrayerTimes,
} from "./prayer.js";

const PRAYER_ICONS: Record<PrayerName, string> = {
    subuh:   "🌅",
    dzuhur:  "☀️",
    ashar:   "🌤️",
    maghrib: "🌇",
    isya:    "🌙",
};

/** Ambil jadwal shalat hari ini; null jika API sedang gagal (petugas tetap ditampilkan). */
async function safeGetPrayerTimes(): Promise<PrayerTimes | null> {
    try {
        return await getPrayerTimes();
    } catch (err) {
        console.error("⚠️ Gagal mengambil jadwal shalat untuk command:", err);
        return null;
    }
}

function petugasLines(hari: string, shalat: PrayerName, now: Date): string[] {
    const petugas = getPetugas(hari, shalat);

    if (!petugas) {
        if (hari === "jumat" && shalat === "dzuhur") {
            return ["🕌 _Shalat Jumat_"];
        }

        return ["   _Petugas belum diatur_"];
    }

    const lines = [
        `🔊 Muadzin: ${petugas.adzan.nama}`,
        `🤲 Imam: ${petugas.imam.nama}`,
    ];

    if (shalat === "subuh") {
        const kultum = peekKultumForDate(now);
        if (kultum) lines.push(`📖 Kultum: ${kultum.nama}`);
    }

    return lines;
}

/** Teks untuk /jadwal — seluruh petugas shalat hari ini. */
export async function buildJadwalHariIni(): Promise<string> {
    const now   = new Date();
    const hari  = getDayName(now);
    const times = await safeGetPrayerTimes();

    // Shalat berikutnya yang belum masuk waktunya
    const next = times
        ? PRAYER_ORDER.find((s) => timeToDate(times[s], now) > now)
        : undefined;

    const sections = PRAYER_ORDER.map((shalat) => {
        const time = times?.[shalat] ?? "--:--";
        const passed = times ? timeToDate(time, now) <= now : false;

        const status =
            shalat === next ? "  👉 _berikutnya_"
            : passed ? "  ✔️"
            : "";

        return [
            `${PRAYER_ICONS[shalat]} *${PRAYER_LABELS[shalat]} — ${time}*${status}`,
            ...petugasLines(hari, shalat, now),
        ].join("\n");
    });

    let text =
        `📋 *Jadwal Petugas Hari Ini*\n` +
        `📅 ${formatDateLong(now)}\n\n` +
        sections.join("\n\n");

    if (!times) {
        text += `\n\n⚠️ _Jam shalat gagal dimuat, coba lagi nanti._`;
    }

    return text;
}

/** Teks untuk /subuh, /dzuhur, /ashar, /maghrib, /isya — petugas satu shalat hari ini. */
export async function buildJadwalShalat(shalat: PrayerName): Promise<string> {
    const now   = new Date();
    const hari  = getDayName(now);
    const times = await safeGetPrayerTimes();
    const time  = times?.[shalat] ?? "--:--";

    const lines = [
        `${PRAYER_ICONS[shalat]} *${PRAYER_LABELS[shalat]} — ${time}*`,
        `📅 ${formatDateLong(now)}`,
    ];

    if (times) {
        const diffMinutes = (timeToDate(time, now).getTime() - now.getTime()) / 60000;

        lines.push(
            diffMinutes > 0
                ? `⏳ ${formatDuration(Math.ceil(diffMinutes))} lagi`
                : `✔️ Waktu ${PRAYER_LABELS[shalat]} hari ini sudah lewat`
        );
    } else {
        lines.push(`⚠️ _Jam shalat gagal dimuat, coba lagi nanti._`);
    }

    lines.push("", ...petugasLines(hari, shalat, now));

    return lines.join("\n");
}
