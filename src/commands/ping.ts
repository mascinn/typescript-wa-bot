import { Command } from './types.js';

const pingCommand: Command = {
    name: "ping",
    description: "Cek apakah bot aktif",

    async execute({ sock, msg }) {
        await sock.sendMessage(msg.key.remoteJid!, {
            text: "Bot is Running"
        }, { quoted: msg });
    }
}

export default pingCommand;