import type { WASocket } from "@whiskeysockets/baileys";
import { readJsonAsync, deleteKey } from "../utils/storage.js";
import { sendGroupReminder } from "./jadwal-image.js";

export interface OutboxMessage {
    id: string;
    text: string;
    mentions?: string[];
}

const OUTBOX_KEY = "outbox.json";

export async function processOutbox(sock: WASocket): Promise<void> {
    try {
        const messages = await readJsonAsync<OutboxMessage[]>(OUTBOX_KEY);
        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return;
        }

        console.log(`📨 Memproses ${messages.length} pesan antrean outbox...`);

        for (const msg of messages) {
            try {
                await sendGroupReminder(sock, msg.text, msg.mentions ?? []);
                console.log(`✅ Pesan outbox terkirim: ${msg.id}`);
            } catch (err) {
                console.error(`❌ Gagal mengirim pesan outbox ${msg.id}:`, err);
            }
        }

        await deleteKey(OUTBOX_KEY);
    } catch (err) {
        console.error("⚠️ Error saat memproses antrean outbox:", err);
    }
}
