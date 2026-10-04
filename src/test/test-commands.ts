/**
 * test-commands.ts — uji logika tanpa koneksi WhatsApp.
 *
 * Jalankan: bun src/test/test-commands.ts
 * (pakai TZ=UTC untuk memastikan bot tetap memakai WIB)
 */

process.env.STORAGE_DIR = "storage-test";

const { config } = await import("../config/index.js");
const { buildJadwalHariIni, buildJadwalShalat } = await import("../services/jadwal-info.js");
const { readJson, writeJson } = await import("../utils/storage.js");
const { generateWAMessageFromContent, proto } = await import("@whiskeysockets/baileys");
const { rmSync } = await import("node:fs");

let failed = 0;
function check(name: string, ok: boolean) {
    console.log(`${ok ? "✅" : "❌"} ${name}`);
    if (!ok) failed++;
}

// 1. Timezone dipaksa ke Asia/Jakarta
check(`TZ = ${process.env.TZ}`, process.env.TZ === config.prayer.timezone);
const jakartaHour = Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: "Asia/Jakarta" }).format(new Date()));
check(`getHours() (${new Date().getHours()}) == jam Jakarta (${jakartaHour})`, new Date().getHours() % 24 === jakartaHour % 24);

// 2. Teks command
console.log("\n----- /jadwal -----\n" + await buildJadwalHariIni());
console.log("\n----- /isya -----\n" + await buildJadwalShalat("isya"));
console.log("\n----- /subuh -----\n" + await buildJadwalShalat("subuh"));

// 3. Simpan & muat pesan foto (BufferJSON) lalu dipakai sebagai quoted
const fakeImageMsg = {
    key: { remoteJid: "120363000000000000@g.us", fromMe: true, id: "3EB0ABCDEF123456" },
    message: {
        imageMessage: {
            caption: "📋 Jadwal",
            mimetype: "image/jpeg",
            jpegThumbnail: Buffer.from([1, 2, 3, 4]),
            mediaKey: new Uint8Array([9, 8, 7]),
            fileLength: 12345,
        },
    },
    messageTimestamp: 1700000000,
};

writeJson("jadwal-image.json", { message: fakeImageMsg });
const loaded = readJson<{ message: any }>("jadwal-image.json")!.message;
check("jpegThumbnail kembali jadi Buffer", Buffer.isBuffer(loaded.message.imageMessage.jpegThumbnail));

const reply = generateWAMessageFromContent(
    "120363000000000000@g.us",
    { extendedTextMessage: { text: "🕌 Isya — 19:00" } },
    { quoted: loaded, userJid: "6280000000000@s.whatsapp.net" }
);
const ctx = reply.message?.extendedTextMessage?.contextInfo;
check("reply berisi stanzaId foto", ctx?.stanzaId === "3EB0ABCDEF123456");
check("reply berisi quotedMessage foto", !!ctx?.quotedMessage?.imageMessage);
const encoded = proto.Message.encode(reply.message!).finish();
check(`pesan reply bisa di-encode (${encoded.length} bytes)`, encoded.length > 0);

rmSync("storage-test", { recursive: true, force: true });

console.log(failed ? `\n❌ ${failed} test gagal` : "\n✅ Semua test lulus");
process.exit(failed ? 1 : 0);
