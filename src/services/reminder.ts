import { subtractMinutes, timeToDate } from "../utils/time.js";
import type { PrayerTimes } from "./prayer.js";
import type { WASocket } from "@whiskeysockets/baileys";
import { config } from "../config/index.js";
import { getCurrentDay, getDayName } from "../utils/day.js";
import { getPetugas } from "./petugas.js";
import { getPrayerTimes, getPrayerTimesForDate } from "./prayer.js";
import {
    getOrCreateKultumForDate,
    isReminderSent,
    markReminderSent,
} from "./kultum.js";

// ---------------------------------------------------------------------------
// Konstanta
// ---------------------------------------------------------------------------

const REMINDER_WINDOW_MINUTES = 2;

// Jam dan menit reminder Subuh (pukul 20:30 WIB)
const SUBUH_REMINDER_HOUR   = 20;
const SUBUH_REMINDER_MINUTE = 30;

// ---------------------------------------------------------------------------
// State in-memory (deduplication shalat non-Subuh)
// Subuh menggunakan state file persisten dari kultum.ts
// ---------------------------------------------------------------------------

const sentReminders = new Set<string>();

// ---------------------------------------------------------------------------
// Scheduler interval
// ---------------------------------------------------------------------------

let schedulerInterval: NodeJS.Timeout | null = null;

// ---------------------------------------------------------------------------
// Reminder shalat biasa (Dzuhur, Ashar, Maghrib, Isya)
// Subuh TIDAK masuk di sini — ditangani oleh checkSubuhReminder()
// ---------------------------------------------------------------------------

async function checkRegularReminders(
    times: PrayerTimes,
    sock: WASocket
) {
    const now  = new Date();
    const hari = getCurrentDay();

    for (const [shalat, time] of Object.entries(times)) {
        // ── Skip Subuh — ditangani secara terpisah ──
        if (shalat === "subuh") continue;

        const prayerTime  = timeToDate(time);
        const reminderTime = subtractMinutes(prayerTime, 15);

        const windowEnd = new Date(
            reminderTime.getTime() +
            REMINDER_WINDOW_MINUTES * 60 * 1000
        );

        if (now >= reminderTime && now < windowEnd) {
            const reminderId = `${shalat}-${reminderTime.toDateString()}`;

            if (sentReminders.has(reminderId)) {
                continue;
            }

            const petugas = getPetugas(hari, shalat);

            if (!petugas) {
                continue;
            }

            const adzanJid = `${petugas.adzan.nomor}@s.whatsapp.net`;
            const imamJid  = `${petugas.imam.nomor}@s.whatsapp.net`;

            sentReminders.add(reminderId);

            await sock.sendMessage(
                config.whatsapp.groupJid,
                {
                    text:
                        `🕌 *${shalat} — ${time}*\n` +
                        `⏰ 15 menit lagi\n\n` +
                        `🔊 Muadzin: ${petugas.adzan.nama} — @${petugas.adzan.nomor}\n` +
                        `🤲 Imam: ${petugas.imam.nama} — @${petugas.imam.nomor}`,

                    mentions: [adzanJid, imamJid],
                }
            );

            console.log(`🔔 Reminder sent: ${shalat} — ${time}`);
        }
    }
}

// ---------------------------------------------------------------------------
// Reminder Subuh — dikirim pukul 20:30 WIB untuk Subuh besok
// ---------------------------------------------------------------------------

/**
 * Mendapatkan objek Date "besok" dalam timezone Asia/Jakarta.
 * Menambahkan 1 hari ke tanggal saat ini.
 */
function getTomorrow(): Date {
    const now = new Date();
    const tomorrow = new Date(now);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return tomorrow;
}

/**
 * Mengecek apakah sekarang berada dalam window reminder Subuh (20:30 WIB).
 * Window: 20:30:00 s/d 20:31:59 (2 menit, konsisten dengan reminder biasa).
 */
function isSubuhReminderWindow(now: Date): boolean {
    const hour   = now.getHours();
    const minute = now.getMinutes();

    return (
        hour === SUBUH_REMINDER_HOUR &&
        minute >= SUBUH_REMINDER_MINUTE &&
        minute < SUBUH_REMINDER_MINUTE + REMINDER_WINDOW_MINUTES
    );
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
 * 6. Kirim pesan WhatsApp dengan mention ketiga petugas
 * 7. Tandai reminder sudah terkirim (tulis state file)
 */
async function checkSubuhReminder(sock: WASocket) {
    const now      = new Date();
    const tomorrow = getTomorrow();

    // Tidak dalam window 20:30 → tidak perlu lanjut
    if (!isSubuhReminderWindow(now)) return;

    // Sudah pernah dikirim untuk tanggal besok → skip (deduplication)
    if (isReminderSent(tomorrow)) return;

    // ── Ambil jadwal Subuh besok dari API ──
    let tomorrowTimes;
    try {
        tomorrowTimes = await getPrayerTimesForDate(tomorrow);
    } catch (err) {
        console.error("❌ Gagal mengambil jadwal Subuh besok:", err);
        return;
    }

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

    // ── Bentuk JID WhatsApp ──
    const adzanJid  = `${petugas.adzan.nomor}@s.whatsapp.net`;
    const imamJid   = `${petugas.imam.nomor}@s.whatsapp.net`;
    const kultumJid = `${kultum.nomor}@s.whatsapp.net`;

    // ── Kirim pesan ──
    await sock.sendMessage(
        config.whatsapp.groupJid,
        {
            text:
                `🕌 *Subuh — ${subuhTime}*\n` +
                `⏰ Petugas, bangun lebih awal ya!\n\n` +
                `🔊 Muadzin: ${petugas.adzan.nama} — @${petugas.adzan.nomor}\n` +
                `🤲 Imam: ${petugas.imam.nama} — @${petugas.imam.nomor}\n` +
                `📖 Kultum: ${kultum.nama} — @${kultum.nomor}`,

            mentions: [adzanJid, imamJid, kultumJid],
        }
    );

    // ── Tandai sudah terkirim ──
    markReminderSent(tomorrow);

    console.log(
        `🔔 Reminder Subuh besok (${hariSubuh}) terkirim — ` +
        `${subuhTime} | Kultum: ${kultum.nama}`
    );
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function startReminderScheduler(
    times: PrayerTimes,
    sock: WASocket
) {
    // Pastikan scheduler lama tidak berjalan
    if (schedulerInterval) {
        clearInterval(schedulerInterval);
    }

    let currentTimes = times;
    let currentDate  = new Date().toDateString();

    // Cek langsung ketika scheduler dimulai
    checkRegularReminders(currentTimes, sock);
    checkSubuhReminder(sock);

    schedulerInterval = setInterval(async () => {
        const today = new Date().toDateString();

        // Ambil jadwal baru ketika berganti hari
        if (today !== currentDate) {
            currentTimes = await getPrayerTimes();
            currentDate  = today;

            console.log("📅 Prayer times updated");
        }

        checkRegularReminders(currentTimes, sock);
        checkSubuhReminder(sock);
    }, 60 * 1000);
}

export function stopReminderScheduler() {
    if (schedulerInterval) {
        clearInterval(schedulerInterval);
        schedulerInterval = null;

        console.log("⏹️ Reminder scheduler stopped");
    }
}