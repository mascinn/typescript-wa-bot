import { Command } from './types.js';

const pingCommand: Command = {
    name: "ping",

    async execute({ sock, msg }) {
        await sock.sendMessage(msg.key.remoteJid!, {
            text: "Bot is Running"
        });
    }
}

export default pingCommand;