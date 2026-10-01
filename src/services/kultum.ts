/**
 * kultum.ts
 *
 * Mengelola rotasi petugas kultum dengan state persisten via JSON file.
 * State disimpan di: src/state/kultum-state.json
 *
 * Struktur state:
 * {
 *   "scheduledDate": "2026-10-02",  // tanggal Subuh yang di-remind
 *   "index": 8,                      // index petugas kultum saat ini
 *   "reminderSent": true             // apakah reminder sudah dikirim
 * }
 */

import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";

// ---------------------------------------------------------------------------
// Tipe
// ---------------------------------------------------------------------------

export interface PetugasKultum {
    nama: string;
    nomor: string;
}

interface KultumState {
    scheduledDate: string; // "YYYY-MM-DD" — tanggal Subuh yang di-remind
    index: number;         // index petugas kultum yang bertugas
    reminderSent: boolean; // apakah reminder untuk scheduledDate sudah terkirim
}

// ---------------------------------------------------------------------------
// Data petugas kultum
// ---------------------------------------------------------------------------

const __dirname = fileURLToPath(new URL(".", import.meta.url));

// Jalur ke data JSON petugas kultum
const KULTUM_DATA_PATH = join(
    __dirname,
    "../data/jadwal-kultum.json"
);

// Jalur ke file state (persistent)
const STATE_PATH = join(
    __dirname,
    "../state/kultum-state.json"
);

// Load data petugas kultum dari JSON
const petugasKultumList: PetugasKultum[] = JSON.parse(
    readFileSync(KULTUM_DATA_PATH, "utf-8")
);

const TOTAL_PETUGAS = petugasKultumList.length;

// ---------------------------------------------------------------------------
// State management
// ---------------------------------------------------------------------------

function loadState(): KultumState | null {
    if (!existsSync(STATE_PATH)) {
        return null;
    }

    try {
        const raw = readFileSync(STATE_PATH, "utf-8");
        return JSON.parse(raw) as KultumState;
    } catch {
        return null;
    }
}

function saveState(state: KultumState): void {
    writeFileSync(STATE_PATH, JSON.stringify(state, null, 2), "utf-8");
}

// ---------------------------------------------------------------------------
// Format tanggal "YYYY-MM-DD" dalam timezone Asia/Jakarta
// ---------------------------------------------------------------------------

function formatDateJakarta(date: Date): string {
    // Intl.DateTimeFormat menggunakan timezone lokal yang sudah diset via TZ=Asia/Jakarta
    // Gunakan toLocaleDateString dengan locale en-CA untuk format YYYY-MM-DD
    const parts = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Jakarta",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
    }).format(date);

    return parts; // sudah dalam format "YYYY-MM-DD"
}

// ---------------------------------------------------------------------------
// API publik
// ---------------------------------------------------------------------------

/**
 * Mendapatkan petugas kultum untuk tanggal besok (tanggal Subuh yang di-remind).
 *
 * Logika:
 * - Jika state sudah ada untuk scheduledDate yang sama → gunakan index yang tersimpan
 *   (mencegah rotasi ganda akibat restart)
 * - Jika state belum ada ATAU scheduledDate berbeda → rotasi index, simpan state baru
 *
 * @param tomorrowDate - objek Date yang merepresentasikan tanggal Subuh besok
 * @returns PetugasKultum yang bertugas + apakah reminder sudah terkirim
 */
export function getOrCreateKultumForDate(tomorrowDate: Date): {
    petugas: PetugasKultum;
    reminderSent: boolean;
} {
    const dateStr = formatDateJakarta(tomorrowDate);
    const existingState = loadState();

    // Jika state ada dan untuk tanggal yang sama → gunakan state yang ada
    if (existingState && existingState.scheduledDate === dateStr) {
        return {
            petugas: petugasKultumList[existingState.index],
            reminderSent: existingState.reminderSent,
        };
    }

    // State belum ada atau tanggal berbeda → tentukan index baru
    let newIndex: number;

    if (existingState === null) {
        // Belum pernah ada state → mulai dari index 0
        newIndex = 0;
    } else {
        // Rotasi: (currentIndex + 1) % total
        newIndex = (existingState.index + 1) % TOTAL_PETUGAS;
    }

    const newState: KultumState = {
        scheduledDate: dateStr,
        index: newIndex,
        reminderSent: false,
    };

    saveState(newState);

    return {
        petugas: petugasKultumList[newIndex],
        reminderSent: false,
    };
}

/**
 * Tandai bahwa reminder untuk tanggal tertentu sudah terkirim.
 * Dipanggil setelah WhatsApp message berhasil dikirim.
 */
export function markReminderSent(tomorrowDate: Date): void {
    const dateStr = formatDateJakarta(tomorrowDate);
    const state = loadState();

    if (state && state.scheduledDate === dateStr) {
        state.reminderSent = true;
        saveState(state);
    }
}

/**
 * Mengecek apakah reminder untuk tanggal tertentu sudah terkirim.
 * Digunakan untuk mencegah duplicate reminder.
 */
export function isReminderSent(tomorrowDate: Date): boolean {
    const dateStr = formatDateJakarta(tomorrowDate);
    const state = loadState();

    return (
        state !== null &&
        state.scheduledDate === dateStr &&
        state.reminderSent === true
    );
}
