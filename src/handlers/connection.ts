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

export function registerConnectionHandler(
    sock: WASocket,
    onOpen: () => void,
    onClose: () => void
) {
    sock.ev.on("connection.update", (update) => {
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

            onOpen();
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

            if (statusCode !== DisconnectReason.loggedOut) {
                onClose();
            }
        }
    });
}