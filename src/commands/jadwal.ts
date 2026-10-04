import { Command } from './types.js';
import { buildJadwalHariIni } from '../services/jadwal-info.js';

const jadwalCommand: Command = {
    name: "jadwal",
    aliases: ["petugas"],
    description: "Lihat semua petugas shalat hari ini",

    async execute({ sock, msg }) {
        await sock.sendMessage(msg.key.remoteJid!, {
            text: await buildJadwalHariIni(),
        }, { quoted: msg });
    }
}

export default jadwalCommand;
