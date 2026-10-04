/**
 * kultum.ts
 *
 * Mengelola rotasi petugas kultum dengan state persisten via JSON file.
 * State disimpan di: storage/kultum-state.json
 *
 * Struktur state:
 * {
 *   "scheduledDate": "2026-10-02",  // tanggal Subuh yang di-remind
 *   "index": 8,                      // index petugas kultum saat ini
 *   "reminderSent": true             // apakah reminder sudah dikirim
 * }
 */

// Di-import (bukan dibaca via readFileSync) supaya `tsc` ikut menyalin
// file JSON ini ke dist/ — sebelumnya `bun start` crash karena file tidak ada.
import petugasKultumData from "../data/jadwal-kultum.json" with { type: "json" };
import { readJson, writeJson } from "../utils/storage.js";
import { formatDateKey } from "../utils/time.js";

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

const STATE_FILE = "kultum-state.json";

const petugasKultumList: PetugasKultum[] = petugasKultumData;

const TOTAL_PETUGAS = petugasKultumList.length;

if (TOTAL_PETUGAS === 0) {
    throw new Error("jadwal-kultum.json kosong — minimal harus ada 1 petugas kultum.");
}

// ---------------------------------------------------------------------------
// State management
// ---------------------------------------------------------------------------

function loadState(): KultumState | null {
    const state = readJson<KultumState>(STATE_FILE);

    // Index di luar jangkauan (misal daftar petugas dikurangi) → mulai ulang dari 0
    if (state && (state.index < 0 || state.index >= TOTAL_PETUGAS)) {
        return { ...state, index: TOTAL_PETUGAS - 1 };
    }

    return state;
}

function saveState(state: KultumState): void {
    writeJson(STATE_FILE, state);
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
    const dateStr = formatDateKey(tomorrowDate);
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
 * Melihat petugas kultum untuk tanggal tertentu TANPA melakukan rotasi.
 * Mengembalikan null jika petugas untuk tanggal itu belum ditentukan
 * (rotasi baru terjadi saat reminder Subuh pukul 20:30 malam sebelumnya).
 */
export function peekKultumForDate(date: Date): PetugasKultum | null {
    const state = loadState();

    if (state && state.scheduledDate === formatDateKey(date)) {
        return petugasKultumList[state.index];
    }

    return null;
}

/**
 * Tandai bahwa reminder untuk tanggal tertentu sudah terkirim.
 * Dipanggil setelah WhatsApp message berhasil dikirim.
 */
export function markReminderSent(tomorrowDate: Date): void {
    const dateStr = formatDateKey(tomorrowDate);
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
    const dateStr = formatDateKey(tomorrowDate);
    const state = loadState();

    return (
        state !== null &&
        state.scheduledDate === dateStr &&
        state.reminderSent === true
    );
}
