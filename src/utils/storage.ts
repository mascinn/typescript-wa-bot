/**
 * storage.ts
 *
 * Helper baca/tulis state JSON yang persisten.
 * Terintegrasi dengan Turso Database jika TURSO_DATABASE_URL aktif.
 * Menggunakan in-memory cache untuk performa cepat dan fallback ke folder storage/ lokal.
 */

import {
    existsSync,
    mkdirSync,
    readFileSync,
    renameSync,
    writeFileSync,
} from "node:fs";
import { join, resolve } from "node:path";
import { BufferJSON } from "@whiskeysockets/baileys";
import { getTursoClient } from "../db/turso.js";

export const STORAGE_DIR = resolve(process.env.STORAGE_DIR ?? "storage");

// In-memory cache untuk pembacaan instan tanpa latency jaringan
const memoryCache = new Map<string, any>();

function ensureStorageDir(): void {
    if (!existsSync(STORAGE_DIR)) {
        mkdirSync(STORAGE_DIR, { recursive: true });
    }
}

export function storagePath(fileName: string): string {
    return join(STORAGE_DIR, fileName);
}

/**
 * Inisialisasi storage: load data dari Turso ke cache memory.
 */
export async function initStorage(): Promise<void> {
    const client = getTursoClient();
    if (!client) return;

    try {
        const rs = await client.execute("SELECT key, value FROM kv_store;");
        for (const row of rs.rows) {
            const key = row.key as string;
            const val = JSON.parse(row.value as string, BufferJSON.reviver);
            memoryCache.set(key, val);
        }
        console.log(`📦 State dimuat dari Turso (${memoryCache.size} item).`);
    } catch (err) {
        console.error("⚠️ Gagal memuat state dari Turso:", err);
    }
}

export function readJson<T>(fileName: string): T | null {
    if (memoryCache.has(fileName)) {
        return memoryCache.get(fileName) as T;
    }

    const path = storagePath(fileName);
    if (!existsSync(path)) {
        return null;
    }

    try {
        const data = JSON.parse(readFileSync(path, "utf-8"), BufferJSON.reviver) as T;
        memoryCache.set(fileName, data);
        return data;
    } catch (err) {
        console.error(`⚠️ Gagal membaca ${fileName}, file diabaikan:`, err);
        return null;
    }
}

export function writeJson(fileName: string, data: unknown): void {
    // 1. Simpan di cache memory
    memoryCache.set(fileName, data);

    // 2. Simpan di disk lokal (mirror / backup)
    try {
        ensureStorageDir();
        const path = storagePath(fileName);
        const tmpPath = `${path}.tmp`;
        writeFileSync(tmpPath, JSON.stringify(data, BufferJSON.replacer, 2), "utf-8");
        renameSync(tmpPath, path);
    } catch {
        // Abaikan error disk pada environment tanpa write access
    }

    // 3. Simpan ke Turso DB secara async jika aktif
    const client = getTursoClient();
    if (client) {
        client.execute({
            sql: `INSERT INTO kv_store (key, value) VALUES (?, ?)
                  ON CONFLICT(key) DO UPDATE SET value = excluded.value;`,
            args: [fileName, JSON.stringify(data, BufferJSON.replacer)],
        }).catch((err) => {
            console.error(`⚠️ Gagal sinkronisasi ${fileName} ke Turso:`, err);
        });
    }
}

export async function readJsonAsync<T>(fileName: string): Promise<T | null> {
    const client = getTursoClient();
    if (client) {
        try {
            const rs = await client.execute({
                sql: "SELECT value FROM kv_store WHERE key = ? LIMIT 1;",
                args: [fileName],
            });
            if (rs.rows.length > 0) {
                const val = JSON.parse(rs.rows[0].value as string, BufferJSON.reviver) as T;
                memoryCache.set(fileName, val);
                return val;
            }
            return null;
        } catch (err) {
            console.error(`⚠️ Gagal membaca ${fileName} dari Turso:`, err);
        }
    }

    return readJson<T>(fileName);
}

export async function deleteKey(fileName: string): Promise<void> {
    memoryCache.delete(fileName);
    const client = getTursoClient();
    if (client) {
        try {
            await client.execute({
                sql: "DELETE FROM kv_store WHERE key = ?;",
                args: [fileName],
            });
        } catch (err) {
            console.error(`⚠️ Gagal menghapus ${fileName} di Turso:`, err);
        }
    }
}
