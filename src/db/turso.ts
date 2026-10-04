import { createClient, type Client } from "@libsql/client";
import { config } from "../config/index.js";

let client: Client | null = null;

export function getTursoClient(): Client | null {
    if (client) return client;

    if (config.turso.url && config.turso.authToken) {
        client = createClient({
            url: config.turso.url,
            authToken: config.turso.authToken,
        });
        return client;
    }

    return null;
}

export async function initDb(): Promise<void> {
    const db = getTursoClient();
    if (!db) {
        console.log("📁 Turso tidak dikonfigurasi, menggunakan penyimpanan lokal (file/disk).");
        return;
    }

    try {
        await db.batch([
            `CREATE TABLE IF NOT EXISTS wa_auth (
                id TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );`,
            `CREATE TABLE IF NOT EXISTS kv_store (
                key TEXT PRIMARY KEY,
                value TEXT NOT NULL
            );`,
        ], "write");

        console.log("☁️ Terhubung ke Turso Database & tabel siap.");
    } catch (err) {
        console.error("❌ Gagal inisialisasi tabel Turso:", err);
        throw err;
    }
}
