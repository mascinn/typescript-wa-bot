import type { WASocket, WAMessage } from '@whiskeysockets/baileys';
import { getMessageText } from '../utils/message.js';
import { getCommand } from '../commands/index.js';

async function handleMessage(sock: WASocket, msg: WAMessage) {
    if (!msg.message) return;

    const text = getMessageText(msg).trim();
    if (!text.startsWith("/")) return;

    console.log("📩 Pesan command terdeteksi dari JID:", msg.key.remoteJid, "Text:", text);

    const [rawName, ...args] = text.slice(1).split(/\s+/);
    const commandName = rawName.toLowerCase();
    const command = getCommand(commandName);

    if (!command) return;
    console.log(`Incoming command: ${text} from ${msg.pushName || 'User'}`);

    try {
        await command.execute({
            sock,
            msg,
            text,
            args,
        });

        console.log("✓ Berhasil membalas command:", text);
    } catch (err) {
        console.error(`❌ Command "${commandName}" gagal:`, err);
    }
}

export function registerMessageHandler(sock: WASocket){
    sock.ev.on("messages.upsert", ({ messages, type }) => {
        // Hanya proses pesan baru (bukan riwayat yang disinkronkan saat connect)
        if (type !== "notify") return;

        for (const msg of messages) {
            void handleMessage(sock, msg);
        }
    });
}