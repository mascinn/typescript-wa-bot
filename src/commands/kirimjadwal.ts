import { Command } from './types.js';

const kirimJadwalCommand: Command = {
    name: "kirimjadwal",
    aliases: ["updatejadwal"],
    description: "Petunjuk set foto jadwal acuan",
    hidden: true,

    async execute({ sock, msg }) {
        const chatJid = msg.key.remoteJid!;

        await sock.sendMessage(chatJid, {
            text: "ℹ️ Untuk mengatur foto jadwal acuan reminder:\n" +
                  "Kirim foto jadwal ke grup secara manual, lalu balas/reply foto tersebut dengan ketik */setjadwal*.",
        }, { quoted: msg });
    }
}

export default kirimJadwalCommand;
