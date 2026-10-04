import type { WASocket } from "@whiskeysockets/baileys";
import { config } from "../config/index.js";
import { getDayName } from "../utils/day.js";
import { readJson, writeJson } from "../utils/storage.js";
import {
    formatDateKey,
    formatDuration,
    getTomorrow,
    subtractMinutes,
    timeToDate,
} from "../utils/time.js";
import { sendGroupReminder } from "./jadwal-image.js";
import { processOutbox } from "./outbox.js";
import {
    getOrCreateKultumForDate,
    isReminderSent,
    markReminderSent,
} from "./kultum.js";
import { getPetugas } from "./petugas.js";
import {
    getPrayerTimes,
    getPrayerTimesForDate,
    PRAYER_LABELS,
    PRAYER_ORDER,
} from "./prayer.js";

// ---------------------------------------------------------------------------
// Konstanta
// ---------------------------------------------------------------------------

// Jam dan menit reminder Subuh (pukul 20:30 WIB)
const SUBUH_REMINDER_HOUR   = 20;
const SUBUH_REMINDER_MINUTE = 30;

const TICK_INTERVAL_MS = 60 * 1000;

// ---------------------------------------------------------------------------
// State persisten (deduplication shalat non-Subuh)
// Disimpan ke file supaya reminder tidak terkirim dua kali jika bot restart.
// Subuh menggunakan state file persisten dari kultum.ts
// ---------------------------------------------------------------------------

const REMINDER_STATE_FILE = "reminder-state.json";

interface ReminderState {
    date: string;   // "YYYY-MM-DD"
    sent: string[]; // daftar shalat yang reminder-nya sudah terkirim hari itu
}

function loadSentToday(today: string): Set<string> {
    const state = readJson<ReminderState>(REMINDER_STATE_FILE);
    return new Set(state?.date === today ? state.sent : []);
}

function saveSentToday(today: string, sent: Set<string>): void {
    writeJson(REMINDER_STATE_FILE, { date: today, sent: [...sent] } satisfies ReminderState);
}

// ---------------------------------------------------------------------------
// Scheduler interval
// ---------------------------------------------------------------------------

let schedulerInterval: NodeJS.Timeout | null = null;
let tickRunning = false;

function toJid(nomor: string): string {
    return `${nomor}@s.whatsapp.net`;
}

// ---------------------------------------------------------------------------
// Reminder shalat biasa (Dzuhur, Ashar, Maghrib, Isya)
// Subuh TIDAK masuk di sini — ditangani oleh checkSubuhReminder()
// ---------------------------------------------------------------------------

async function checkRegularReminders(sock: WASocket) {
    const now   = new Date();
    const today = formatDateKey(now);
    const hari  = getDayName(now);
    const times = await getPrayerTimes();
    const sent  = loadSentToday(today);

    for (const shalat of PRAYER_ORDER) {
        // ── Skip Subuh — ditangani secara terpisah ──
        if (shalat === "subuh") continue;
        if (sent.has(shalat)) continue;

        const time         = times[shalat];
        const prayerTime   = timeToDate(time, now);
        const reminderTime = subtractMinutes(prayerTime, config.prayer.reminderMinutes);

        // Window: dari waktu reminder sampai masuk waktu shalat.
        // Jika bot sempat mati/reconnect saat waktu reminder, reminder tetap
        // dikirim begitu bot hidup lagi (selama belum masuk waktu shalat).
        if (now < reminderTime || now >= prayerTime) continue;

        const petugas = getPetugas(hari, shalat);

        if (!petugas) {
            // Jumat Dzuhur sengaja kosong (Shalat Jumat) → tidak perlu warning
            if (!(hari === "jumat" && shalat === "dzuhur")) {
                console.warn(`⚠️ Petugas ${PRAYER_LABELS[shalat]} hari ${hari} tidak ditemukan.`);
            }
            sent.add(shalat);
            saveSentToday(today, sent);
            continue;
        }

        const minutesLeft = Math.ceil((prayerTime.getTime() - now.getTime()) / 60000);

        await sendGroupReminder(
            sock,
            `🕌 *${PRAYER_LABELS[shalat]} — ${time}*\n` +
            `⏰ ${formatDuration(minutesLeft)} lagi\n\n` +
            `🔊 Muadzin: ${petugas.adzan.nama} — @${petugas.adzan.nomor}\n` +
            `🤲 Imam: ${petugas.imam.nama} — @${petugas.imam.nomor}`,
            [toJid(petugas.adzan.nomor), toJid(petugas.imam.nomor)]
        );

        // Tandai terkirim SETELAH berhasil kirim, supaya kalau gagal dicoba lagi menit berikutnya
        sent.add(shalat);
        saveSentToday(today, sent);

        console.log(`🔔 Reminder sent: ${PRAYER_LABELS[shalat]} — ${time}`);
    }
}

// ---------------------------------------------------------------------------
// Reminder Subuh — dikirim pukul 20:30 WIB untuk Subuh besok
// ---------------------------------------------------------------------------

/**
 * Mengecek apakah sekarang sudah lewat pukul 20:30 (dan belum tengah malam).
 * Window sengaja dibuat sampai 23:59 supaya reminder tetap terkirim
 * walaupun bot sempat mati/reconnect tepat pukul 20:30.
 */
function isSubuhReminderWindow(now: Date): boolean {
    const minutesOfDay = now.getHours() * 60 + now.getMinutes();
    return minutesOfDay >= SUBUH_REMINDER_HOUR * 60 + SUBUH_REMINDER_MINUTE;
}

/**
 * Cek dan kirim reminder Subuh jika sekarang pukul 20:30 WIB.
 *
 * Alur:
 * 1. Cek apakah sekarang dalam window 20:30
 * 2. Cek apakah reminder untuk besok sudah terkirim (baca state file)
 * 3. Ambil jadwal Subuh besok dari API
 * 4. Ambil petugas Subuh besok dari jadwal-petugas.json
 * 5. Ambil/rotasi petugas kultum untuk besok
 * 6. Kirim pesan WhatsApp (reply ke foto jadwal) dengan mention ketiga petugas
 * 7. Tandai reminder sudah terkirim (tulis state file)
 */
async function checkSubuhReminder(sock: WASocket) {
    const now      = new Date();
    const tomorrow = getTomorrow(now);

    // Belum jam 20:30 → tidak perlu lanjut
    if (!isSubuhReminderWindow(now)) return;

    // Sudah pernah dikirim untuk tanggal besok → skip (deduplication)
    if (isReminderSent(tomorrow)) return;

    // ── Ambil jadwal Subuh besok dari API ──
    const tomorrowTimes = await getPrayerTimesForDate(tomorrow);
    const subuhTime = tomorrowTimes.subuh;

    // ── Ambil hari dari tanggal besok ──
    const hariSubuh = getDayName(tomorrow);

    // ── Ambil petugas Subuh besok ──
    const petugas = getPetugas(hariSubuh, "subuh");

    if (!petugas) {
        console.warn(`⚠️ Petugas Subuh ${hariSubuh} tidak ditemukan.`);
        return;
    }

    // ── Ambil/rotasi petugas kultum untuk besok ──
    const { petugas: kultum } = getOrCreateKultumForDate(tomorrow);

    // ── Kirim pesan (reply ke foto jadwal) ──
    await sendGroupReminder(
        sock,
        `🕌 *Subuh — ${subuhTime}*\n` +
        `⏰ Petugas, bangun lebih awal ya!\n\n` +
        `🔊 Muadzin: ${petugas.adzan.nama} — @${petugas.adzan.nomor}\n` +
        `🤲 Imam: ${petugas.imam.nama} — @${petugas.imam.nomor}\n` +
        `📖 Kultum: ${kultum.nama} — @${kultum.nomor}`,
        [toJid(petugas.adzan.nomor), toJid(petugas.imam.nomor), toJid(kultum.nomor)]
    );

    // ── Tandai sudah terkirim ──
    markReminderSent(tomorrow);

    console.log(
        `🔔 Reminder Subuh besok (${hariSubuh}) terkirim — ` +
        `${subuhTime} | Kultum: ${kultum.nama}`
    );
}

// ---------------------------------------------------------------------------
// Tick — dijalankan setiap menit. Semua error ditangkap di sini supaya
// satu kegagalan (API down, WhatsApp error) tidak mematikan proses bot.
// ---------------------------------------------------------------------------

async function tick(sock: WASocket) {
    if (tickRunning) return; // cegah tick tumpang tindih jika API lambat
    tickRunning = true;

    try {
        try {
            await checkRegularReminders(sock);
        } catch (err) {
            console.error("❌ Gagal memproses reminder shalat:", err);
        }

        try {
            await checkSubuhReminder(sock);
        } catch (err) {
            console.error("❌ Gagal memproses reminder Subuh:", err);
        }

        try {
            await processOutbox(sock);
        } catch (err) {
            console.error("❌ Gagal memproses antrean outbox:", err);
        }
    } finally {
        tickRunning = false;
    }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function startReminderScheduler(sock: WASocket) {
    // Pastikan scheduler lama tidak berjalan
    stopReminderScheduler();

    // Cek langsung ketika scheduler dimulai
    void tick(sock);

    // Jadwal shalat otomatis diambil ulang saat berganti hari
    // (getPrayerTimes() memakai cache per tanggal)
    schedulerInterval = setInterval(() => void tick(sock), TICK_INTERVAL_MS);
}

export function stopReminderScheduler() {
    if (schedulerInterval) {
        clearInterval(schedulerInterval);
        schedulerInterval = null;

        console.log("⏹️ Reminder scheduler stopped");
    }
}