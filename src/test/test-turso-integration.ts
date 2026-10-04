import { initDb, getTursoClient } from "../db/turso.js";
import { initStorage, readJson, writeJson } from "../utils/storage.js";
import { migrateLocalAuthToTursoIfEmpty } from "../services/turso-auth.js";

console.log("1. Testing initDb()...");
await initDb();

console.log("2. Testing migration...");
await migrateLocalAuthToTursoIfEmpty();

console.log("3. Testing initStorage()...");
await initStorage();

console.log("4. Testing writeJson and readJson with Turso sync...");
writeJson("test-key.json", { message: "halo turso", timestamp: Date.now() });

const data = readJson<{ message: string; timestamp: number }>("test-key.json");
console.log("Read data:", data);

const client = getTursoClient()!;
const rs = await client.execute("SELECT * FROM kv_store WHERE key = 'test-key.json'");
console.log("Turso row:", rs.rows);

// Clean test key
await client.execute("DELETE FROM kv_store WHERE key = 'test-key.json'");

const authCount = await client.execute("SELECT count(*) as total FROM wa_auth");
console.log("Total wa_auth records in Turso:", authCount.rows[0].total);

console.log("✅ All Turso tests passed!");
