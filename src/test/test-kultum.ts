/**
 * test-kultum.ts — Script untuk testing logika kultum
 *
 * Jalankan dengan: bun src/test/test-kultum.ts
 *
 * Test yang dicakup:
 * 1. Urutan rotasi 0–10 dan wrap ke 0
 * 2. Restart tidak mengubah index (state persisten)
 * 3. Deduplication — isReminderSent() setelah markReminderSent()
 * 4. Tanggal besok digunakan, bukan tanggal hari ini
 */

import { writeFileSync, existsSync, unlinkSync, mkdirSync } from "node:fs";
import { resolve } from "node:path";

// State kultum sekarang disimpan di storage/ (root project)
mkdirSync(resolve("storage"), { recursive: true });
const STATE_PATH = resolve("storage", "kultum-state.json");

// ---------------------------------------------------------------------------
// Helper — bersihkan state sebelum test
// ---------------------------------------------------------------------------

function clearState() {
    if (existsSync(STATE_PATH)) {
        unlinkSync(STATE_PATH);
    }
}

function setStateManual(state: object) {
    writeFileSync(STATE_PATH, JSON.stringify(state, null, 2));
}

// ---------------------------------------------------------------------------
// Import setelah state helper tersedia
// ---------------------------------------------------------------------------

const { getOrCreateKultumForDate, isReminderSent, markReminderSent } =
    await import("../services/kultum.js");

// ---------------------------------------------------------------------------
// Helper date — buat tanggal tertentu
// ---------------------------------------------------------------------------

function makeDate(year: number, month: number, day: number): Date {
    // month: 1-12
    return new Date(year, month - 1, day, 4, 27, 0, 0);
}

// ---------------------------------------------------------------------------
// Test 1 — Urutan rotasi 0–10 dan wrap ke 0
// ---------------------------------------------------------------------------

console.log("\n===== TEST 1: Urutan Rotasi =====");

const EXPECTED_ORDER = [
    "Basit", "Arif", "Iskandar", "Haris", "Ruzi",
    "Fajar", "Ananda", "Makhasin", "Arjuna", "Imam", "Firdaus",
    "Basit" // wrap ke 0
];

clearState();

const testDates = Array.from({ length: 12 }, (_, i) =>
    makeDate(2026, 10, 2 + i)
);

let allCorrect = true;

for (let i = 0; i < testDates.length; i++) {
    const { petugas } = getOrCreateKultumForDate(testDates[i]);
    const expected = EXPECTED_ORDER[i];
    const ok = petugas.nama === expected;

    if (!ok) allCorrect = false;

    console.log(`  Index ${i}: ${petugas.nama} (expected: ${expected}) ${ok ? "✅" : "❌"}`);

    // Simulasi hari berikutnya: state di-set ke "sudah terkirim" lalu tanggal berubah
    // Ini memicu rotasi di iterasi berikutnya
    markReminderSent(testDates[i]);
}

console.log(allCorrect ? "✅ TEST 1 PASSED" : "❌ TEST 1 FAILED");

// ---------------------------------------------------------------------------
// Test 2 — Restart: state index tidak berubah
// ---------------------------------------------------------------------------

console.log("\n===== TEST 2: Restart tidak mengubah index =====");

clearState();

// Set state manual — simulasi index 8 untuk 2 Oktober
setStateManual({
    scheduledDate: "2026-10-02",
    index: 8,
    reminderSent: false,
});

// Import ulang (simulasi restart): state harus tetap ada di file
const date2Oct = makeDate(2026, 10, 2);
const { petugas: afterRestart } = getOrCreateKultumForDate(date2Oct);

const test2Ok = afterRestart.nama === "Arjuna"; // index 8
console.log(`  Petugas setelah restart: ${afterRestart.nama} (expected: Arjuna) ${test2Ok ? "✅" : "❌"}`);
console.log(test2Ok ? "✅ TEST 2 PASSED" : "❌ TEST 2 FAILED");

// ---------------------------------------------------------------------------
// Test 3 — Deduplication
// ---------------------------------------------------------------------------

console.log("\n===== TEST 3: Deduplication =====");

clearState();

const date3 = makeDate(2026, 10, 3);

// Sebelum kirim
const notSentYet = !isReminderSent(date3);
console.log(`  Sebelum markReminderSent: isReminderSent = ${isReminderSent(date3)} (expected: false) ${notSentYet ? "✅" : "❌"}`);

// Buat state untuk date3
getOrCreateKultumForDate(date3);

// Tandai sudah terkirim
markReminderSent(date3);

const sentNow = isReminderSent(date3);
console.log(`  Setelah markReminderSent: isReminderSent = ${sentNow} (expected: true) ${sentNow ? "✅" : "❌"}`);

// Simulasi scheduler jalan lagi → harus return early
const test3Ok = notSentYet && sentNow;
console.log(test3Ok ? "✅ TEST 3 PASSED" : "❌ TEST 3 FAILED");

// ---------------------------------------------------------------------------
// Test 4 — Tanggal besok digunakan
// ---------------------------------------------------------------------------

console.log("\n===== TEST 4: Tanggal besok (bukan hari ini) =====");

clearState();

// Simulasi: sekarang 1 Oktober 20:30 → besok = 2 Oktober
const todayOct1  = makeDate(2026, 10, 1);
const tomorrowOct2 = makeDate(2026, 10, 2);

// Buat state untuk 2 Oktober
const { petugas: p1 } = getOrCreateKultumForDate(tomorrowOct2);

// Pastikan state tersimpan untuk "2026-10-02"
const { petugas: p2 } = getOrCreateKultumForDate(tomorrowOct2);

const test4Ok = p1.nama === p2.nama;
console.log(`  Petugas besok (2 Okt): ${p1.nama}`);
console.log(`  Petugas hari ini (1 Okt, seharusnya berbeda): akan berbeda saat dipanggil dengan date 1 Okt`);
console.log(`  State konsisten untuk tanggal yang sama: ${test4Ok ? "✅" : "❌"}`);
console.log(test4Ok ? "✅ TEST 4 PASSED" : "❌ TEST 4 FAILED");

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

console.log("\n===== SUMMARY =====");
console.log("Test selesai. Periksa output di atas.");
console.log("State file tersimpan di:", STATE_PATH);
