import type { WAMessage } from "@whiskeysockets/baileys";
import { Command } from "./types.js";
import { setJadwalImageMessage } from "../services/jadwal-image.js";
import { getRawMessageContent } from "../utils/message.js";

const setJadwalCommand: Command = {
    name: "setjadwal",
    aliases: ["jadwalini"],
    description: "Jadikan foto yang dikirim/dibalas sebagai acuan reply reminder",

    async execute({ sock, msg }) {
        const chatJid = msg.key.remoteJid!;
        const rawContent = getRawMessageContent(msg);

        // Kasus 1: Pengguna mengirim foto dengan caption /setjadwal
        if (rawContent?.imageMessage) {
            setJadwalImageMessage(chatJid, msg);

            await sock.sendMessage(chatJid, {
                text: `✅ *Pesan foto jadwal berhasil dijadikan acuan!*\n\n` +
                      `📌 Grup ID: \`${chatJid}\`\n\n` +
                      `Mulai sekarang, setiap reminder shalat akan otomatis membalas (reply) foto ini.`,
            }, { quoted: msg });
            return;
        }

        // Kasus 2: Pengguna me-reply pesan foto dengan ketik /setjadwal
        const ctxInfo = rawContent?.extendedTextMessage?.contextInfo;
        const quoted = ctxInfo?.quotedMessage;

        if (quoted?.imageMessage && ctxInfo?.stanzaId) {
            const targetMessage: WAMessage = {
                key: {
                    remoteJid: chatJid,
                    fromMe: !ctxInfo.participant,
                    id: ctxInfo.stanzaId,
                    participant: ctxInfo.participant,
                },
                message: quoted,
            };

            setJadwalImageMessage(chatJid, targetMessage);

            await sock.sendMessage(chatJid, {
                text: `✅ *Pesan foto jadwal berhasil dijadikan acuan!*\n\n` +
                      `📌 Grup ID: \`${chatJid}\`\n\n` +
                      `Mulai sekarang, setiap reminder shalat akan otomatis membalas (reply) foto tersebut.`,
            }, { quoted: msg });
            return;
        }

        // Jika tidak ada foto yang di-reply
        await sock.sendMessage(chatJid, {
            text: `⚠️ *Cara menggunakan /setjadwal:*\n\n` +
                  `1. Kirim foto jadwal langsung ke grup dengan caption:\n` +
                  `   */setjadwal*\n\n` +
                  `ATAU\n\n` +
                  `2. Balas/reply pesan foto jadwal yang sudah ada di grup dengan ketik:\n` +
                  `   */setjadwal*`,
        }, { quoted: msg });
    },
};

export default setJadwalCommand;
