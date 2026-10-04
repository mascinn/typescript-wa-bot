import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import {
    type AuthenticationCreds,
    type AuthenticationState,
    type SignalDataTypeMap,
    BufferJSON,
    initAuthCreds,
    proto,
} from "@whiskeysockets/baileys";
import { getTursoClient } from "../db/turso.js";

const fixFileName = (file: string) => file?.replace(/\//g, "__")?.replace(/:/g, "-");

export async function useTursoAuthState(): Promise<{
    state: AuthenticationState;
    saveCreds: () => Promise<void>;
}> {
    const client = getTursoClient();
    if (!client) {
        throw new Error("Turso client tidak tersedia.");
    }

    // Baca credentials utama
    const credsRes = await client.execute({
        sql: "SELECT value FROM wa_auth WHERE id = 'creds' LIMIT 1;",
        args: [],
    });

    const creds: AuthenticationCreds =
        credsRes.rows.length > 0 && credsRes.rows[0].value
            ? (JSON.parse(credsRes.rows[0].value as string, BufferJSON.reviver) as AuthenticationCreds)
            : initAuthCreds();

    const writeData = async (data: unknown, id: string) => {
        const key = fixFileName(id);
        await client.execute({
            sql: `INSERT INTO wa_auth (id, value) VALUES (?, ?)
                  ON CONFLICT(id) DO UPDATE SET value = excluded.value;`,
            args: [key, JSON.stringify(data, BufferJSON.replacer)],
        });
    };

    return {
        state: {
            creds,
            keys: {
                get: async <T extends keyof SignalDataTypeMap>(
                    type: T,
                    ids: string[]
                ): Promise<{ [id: string]: SignalDataTypeMap[T] }> => {
                    const data: Record<string, any> = {};
                    if (ids.length === 0) return data;

                    // Pecah query per 50 item agar tidak melebihi batas argumen SQL
                    const CHUNK_SIZE = 50;
                    for (let i = 0; i < ids.length; i += CHUNK_SIZE) {
                        const chunk = ids.slice(i, i + CHUNK_SIZE);
                        const placeholders = chunk.map(() => "?").join(",");
                        const queryKeys = chunk.map((id) => fixFileName(`${type}-${id}`));

                        const rs = await client.execute({
                            sql: `SELECT id, value FROM wa_auth WHERE id IN (${placeholders});`,
                            args: queryKeys,
                        });

                        for (const row of rs.rows) {
                            const rowId = row.id as string;
                            const prefix = fixFileName(`${type}-`);
                            const originalId = rowId.startsWith(prefix) ? rowId.slice(prefix.length) : rowId;

                            let val = JSON.parse(row.value as string, BufferJSON.reviver);
                            if (type === "app-state-sync-key" && val) {
                                val = proto.Message.AppStateSyncKeyData.fromObject(val);
                            }
                            data[originalId] = val;
                        }
                    }

                    for (const id of ids) {
                        if (!(id in data)) {
                            data[id] = null;
                        }
                    }

                    return data;
                },

                set: async (data: any) => {
                    const statements: { sql: string; args: any[] }[] = [];

                    for (const category in data) {
                        for (const id in data[category]) {
                            const value = data[category][id];
                            const key = fixFileName(`${category}-${id}`);

                            if (value) {
                                statements.push({
                                    sql: `INSERT INTO wa_auth (id, value) VALUES (?, ?)
                                          ON CONFLICT(id) DO UPDATE SET value = excluded.value;`,
                                    args: [key, JSON.stringify(value, BufferJSON.replacer)],
                                });
                            } else {
                                statements.push({
                                    sql: "DELETE FROM wa_auth WHERE id = ?;",
                                    args: [key],
                                });
                            }
                        }
                    }

                    const BATCH_SIZE = 50;
                    for (let i = 0; i < statements.length; i += BATCH_SIZE) {
                        const batch = statements.slice(i, i + BATCH_SIZE);
                        await client.batch(batch, "write");
                    }
                },
            },
        },

        saveCreds: async () => {
            await writeData(creds, "creds");
        },
    };
}

export async function clearTursoAuth(): Promise<void> {
    const client = getTursoClient();
    if (!client) return;

    try {
        await client.execute("DELETE FROM wa_auth;");
        console.log("🗑️ Sesi wa_auth di Turso berhasil dibersihkan.");
    } catch (err) {
        console.error("⚠️ Gagal membersihkan wa_auth di Turso:", err);
    }
}

/**
 * Migrasikan auth_info_baileys lokal ke database Turso jika wa_auth masih kosong.
 */
export async function migrateLocalAuthToTursoIfEmpty(folder = "auth_info_baileys"): Promise<void> {
    const client = getTursoClient();
    if (!client) return;

    try {
        const check = await client.execute("SELECT 1 FROM wa_auth WHERE id = 'creds' LIMIT 1;");
        if (check.rows.length > 0) {
            return; // Sudah ada sesi di Turso
        }

        const credsFile = join(folder, "creds.json");
        if (!existsSync(credsFile)) {
            return; // Tidak ada sesi lokal
        }

        console.log("🔄 Memigrasikan sesi lokal (auth_info_baileys) ke Turso...");
        const files = readdirSync(folder);
        const statements: { sql: string; args: any[] }[] = [];

        for (const file of files) {
            if (!file.endsWith(".json")) continue;
            const key = file.replace(/\.json$/, "");
            const content = readFileSync(join(folder, file), "utf-8");

            statements.push({
                sql: `INSERT INTO wa_auth (id, value) VALUES (?, ?)
                      ON CONFLICT(id) DO UPDATE SET value = excluded.value;`,
                args: [key, content],
            });
        }

        const BATCH_SIZE = 50;
        for (let i = 0; i < statements.length; i += BATCH_SIZE) {
            const batch = statements.slice(i, i + BATCH_SIZE);
            await client.batch(batch, "write");
        }

        console.log(`✅ Selesai memigrasikan ${statements.length} file sesi ke Turso!`);
    } catch (err) {
        console.error("⚠️ Gagal migrasi sesi lokal ke Turso:", err);
    }
}
