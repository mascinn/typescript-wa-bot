import { existsSync, rmSync } from "node:fs";
import {
    DisconnectReason,
    type WASocket
} from "@whiskeysockets/baileys";

import {
    setConnected,
    setQr
} from "../state/qr.js";

import {
    stopReminderScheduler
} from "../services/reminder.js";

import { AUTH_FOLDER } from "../services/whatsapp.js";
import { clearTursoAuth } from "../services/turso-auth.js";

export function registerConnectionHandler(
    sock: WASocket,
    onOpen: () => void | Promise<void>,
    onClose: () => void
) {
    sock.ev.on("connection.update", async (update) => {
        const {
            connection,
            qr
        } = update;

        // QR Code tersedia
        if (qr) {
            setQr(qr);
        }

        // WhatsApp berhasil terhubung
        if (connection === "open") {
            setConnected(true);

            console.log("🟢 WhatsApp Connected!");

            Promise.resolve(onOpen()).catch((err) => {
                console.error("❌ Gagal menjalankan setup setelah connect:", err);
            });
        }

        // WhatsApp terputus
        if (connection === "close") {
            setConnected(false);

            stopReminderScheduler();

            const statusCode =
                (update.lastDisconnect?.error as any)
                    ?.output?.statusCode;

            console.log(
                "🔴 WhatsApp Disconnected. Status code:",
                statusCode
            );

            if (statusCode === DisconnectReason.loggedOut) {
                // Sesi dihapus dari HP → hapus sesi lama supaya QR baru muncul
                // di halaman web, tanpa perlu hapus folder/tabel manual.
                console.log("🚪 Logged out. Menghapus sesi lama, silakan scan QR baru.");

                await clearTursoAuth();
                if (existsSync(AUTH_FOLDER)) {
                    rmSync(AUTH_FOLDER, { recursive: true, force: true });
                }
            }

            onClose();
        }
    });
}