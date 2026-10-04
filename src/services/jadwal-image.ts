/**
 * jadwal-image.ts
 *
 * Mengelola target pesan foto jadwal yang dikirim secara manual oleh user.
 *
 * Alur:
 * - User mengirim foto jadwal ke grup WA secara manual.
 * - User me-reply foto tersebut dengan command `/setjadwal` (atau kirim foto dengan caption `/setjadwal`).
 * - Bot menangkap pesan foto tersebut beserta JID grupnya, dan menyimpannya di storage/Turso.
 * - Setiap reminder shalat akan otomatis dikirim ke grup tersebut sebagai BALASAN (reply) ke foto itu!
 */

import type { WAMessage, WASocket } from "@whiskeysockets/baileys";
import { config } from "../config/index.js";
import { readJson, writeJson } from "../utils/storage.js";

interface JadwalImageState {
    groupJid: string;
    setAt: string;
    message: WAMessage;
}

const STATE_FILE = "jadwal-image.json";

export function loadJadwalImageState(): JadwalImageState | null {
    return readJson<JadwalImageState>(STATE_FILE);
}

/**
 * Mendapatkan JID grup aktif untuk reminder:
 * Mengutamakan groupJid dari pesan foto yang diset via /setjadwal,
 * atau fallback ke config.whatsapp.groupJid dari .env.
 */
export function getTargetGroupJid(): string {
    const state = loadJadwalImageState();
    if (state?.groupJid) {
        return state.groupJid;
    }
    return config.whatsapp.groupJid;
}

/**
 * Mendapatkan pesan foto jadwal yang tersimpan untuk di-reply.
 */
export function getJadwalImageMessage(): WAMessage | null {
    const state = loadJadwalImageState();
    return state?.message ?? null;
}

/**
 * Menyimpan pesan foto jadwal acuan yang dikirim user.
 */
export function setJadwalImageMessage(groupJid: string, message: WAMessage): void {
    writeJson(STATE_FILE, {
        groupJid,
        setAt: new Date().toISOString(),
        message,
    } satisfies JadwalImageState);

    console.log(`📌 Pesan foto jadwal acuan berhasil disimpan untuk grup: ${groupJid}`);
}

/**
 * Mengirim pesan reminder ke grup sebagai balasan (reply) ke foto jadwal.
 */
export async function sendGroupReminder(
    sock: WASocket,
    text: string,
    mentions: string[]
): Promise<void> {
    const quoted = getJadwalImageMessage();
    const groupJid = getTargetGroupJid();

    if (!groupJid) {
        console.error("⚠️ Target grup reminder belum disetel (WHATSAPP_GROUP_JID kosong & belum ada /setjadwal).");
        return;
    }

    if (quoted) {
        try {
            await sock.sendMessage(groupJid, { text, mentions }, { quoted });
            return;
        } catch (err) {
            console.error("⚠️ Gagal reply ke foto jadwal, kirim tanpa reply:", err);
        }
    }

    await sock.sendMessage(groupJid, { text, mentions });
}
