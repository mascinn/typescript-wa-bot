// Config harus di-load paling awal: mengisi .env dan mengatur timezone proses
import { config, validateConfig } from "./config/index.js";
import "./server.js";

import { initDb } from "./db/turso.js";
import { initStorage } from "./utils/storage.js";
import { migrateLocalAuthToTursoIfEmpty } from "./services/turso-auth.js";
import { connectToWhatsApp } from "./services/whatsapp.js";
import { registerConnectionHandler } from "./handlers/connection.js";
import { registerMessageHandler } from "./handlers/message.js";
import { getPrayerTimes } from "./services/prayer.js";
import { startReminderScheduler } from "./services/reminder.js";
import { processOutbox } from "./services/outbox.js";

const RECONNECT_DELAY_MS = 3000;

// Jaring pengaman terakhir: error async yang lolos tidak boleh mematikan bot
process.on("unhandledRejection", (reason) => {
    console.error("❌ Unhandled promise rejection:", reason);
});

const configErrors = validateConfig();

for (const error of configErrors) {
    console.error(`❌ Config: ${error}`);
}

console.log(`🕒 Timezone: ${config.prayer.timezone} — ${new Date().toString()}`);

async function onConnected(sock: Awaited<ReturnType<typeof connectToWhatsApp>>) {
    if (configErrors.length > 0) {
        console.error("⚠️ Reminder TIDAK dijalankan karena config belum benar (lihat error di atas). Command tetap aktif.");
        return;
    }

    // Jadwal shalat — gagal di sini tidak fatal, scheduler akan mencoba lagi tiap menit
    try {
        const times = await getPrayerTimes();

        console.log("📅 Prayer times loaded");
        console.log(`   Subuh    : ${times.subuh}`);
        console.log(`   Dzuhur   : ${times.dzuhur}`);
        console.log(`   Ashar    : ${times.ashar}`);
        console.log(`   Maghrib  : ${times.maghrib}`);
        console.log(`   Isya     : ${times.isya}`);
    } catch (err) {
        console.error("⚠️ Gagal memuat jadwal shalat, akan dicoba lagi:", err);
    }

    startReminderScheduler(sock);

    console.log("⏰ Reminder scheduler started");

    try {
        await processOutbox(sock);
    } catch (err) {
        console.error("⚠️ Gagal memproses outbox saat startup:", err);
    }
}

async function start() {
    try {
        const sock = await connectToWhatsApp();

        registerConnectionHandler(
            sock,

            () => onConnected(sock),

            () => {
                console.log(`🔄 Trying to reconnect in ${RECONNECT_DELAY_MS / 1000}s...`);

                setTimeout(start, RECONNECT_DELAY_MS);
            }
        );

        registerMessageHandler(sock);
    } catch (err) {
        console.error("❌ Gagal memulai koneksi WhatsApp:", err);

        setTimeout(start, RECONNECT_DELAY_MS);
    }
}

async function bootstrap() {
    try {
        // 1. Inisialisasi database Turso (jika disetel)
        await initDb();

        // 2. Migrasikan sesi lokal ke Turso jika Turso masih kosong
        await migrateLocalAuthToTursoIfEmpty();

        // 3. Load state persisten (kultum, reminder, jadwal-image)
        await initStorage();

        // 4. Hubungkan ke WhatsApp
        await start();
    } catch (err) {
        console.error("❌ Fatal error saat inisialisasi:", err);
        process.exit(1);
    }
}

bootstrap();