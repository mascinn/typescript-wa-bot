import "dotenv/config";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const timezone = process.env.PRAYER_TIMEZONE ?? "Asia/Jakarta";

// Paksa timezone proses mengikuti timezone jadwal shalat.
// Semua perhitungan jam (getHours, getDay, setHours) bergantung pada ini,
// jadi bot tetap benar walaupun server berada di zona waktu lain (misal UTC).
process.env.TZ = timezone;

/**
 * Mencari file gambar jadwal.
 * - Jika JADWAL_IMAGE_PATH diset → pakai itu.
 * - Jika tidak → cari assets/jadwal.jpg / .jpeg / .png.
 */
function resolveJadwalImagePath(): string {
    if (process.env.JADWAL_IMAGE_PATH) {
        return resolve(process.env.JADWAL_IMAGE_PATH);
    }

    const candidates = ["jpg", "jpeg", "png"].map((ext) =>
        resolve("assets", `jadwal.${ext}`)
    );

    return candidates.find((path) => existsSync(path)) ?? candidates[0];
}

function parseNumberList(value: string | undefined): string[] {
    return (value ?? "")
        .split(",")
        .map((v) => v.replace(/\D/g, ""))
        .filter(Boolean);
}

export const config = {
    prayer: {
        apiUrl: process.env.PRAYER_API_URL ?? "https://api.aladhan.com/v1",
        city: process.env.PRAYER_CITY ?? "",
        country: process.env.PRAYER_COUNTRY ?? "",
        method: Number(process.env.PRAYER_METHOD ?? 20),
        timezone,
        reminderMinutes: Number(process.env.REMINDER_MINUTES ?? 15),
    },

    whatsapp: {
        groupJid: (process.env.WHATSAPP_GROUP_JID ?? "").trim(),
        /** Nomor (format 628xxx) yang boleh menjalankan command admin, selain admin grup */
        adminNumbers: parseNumberList(process.env.ADMIN_NUMBERS),
    },

    jadwalImage: {
        path: resolveJadwalImagePath(),
        caption: process.env.JADWAL_IMAGE_CAPTION ?? "📋 *Jadwal Petugas Shalat*",
    },

    turso: {
        url: (process.env.TURSO_DATABASE_URL ?? "").trim(),
        authToken: (process.env.TURSO_AUTH_TOKEN ?? "").trim(),
    },
};

/**
 * Validasi konfigurasi penting.
 * Mengembalikan daftar pesan error (kosong = valid).
 */
export function validateConfig(): string[] {
    const errors: string[] = [];

    if (!config.whatsapp.groupJid) {
        errors.push(
            "WHATSAPP_GROUP_JID belum diisi. Kirim pesan apa saja di grup, " +
            "lalu salin JID yang muncul di log (\"JID : ...@g.us\") ke file .env."
        );
    } else if (!config.whatsapp.groupJid.endsWith("@g.us")) {
        errors.push(
            `WHATSAPP_GROUP_JID tidak valid: "${config.whatsapp.groupJid}" (harus berakhiran @g.us).`
        );
    }

    if (!config.prayer.city || !config.prayer.country) {
        errors.push("PRAYER_CITY dan PRAYER_COUNTRY wajib diisi.");
    }

    if (!Number.isFinite(config.prayer.reminderMinutes) || config.prayer.reminderMinutes <= 0) {
        errors.push("REMINDER_MINUTES harus berupa angka lebih dari 0.");
    }

    return errors;
}