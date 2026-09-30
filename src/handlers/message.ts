import type { WASocket, WAMessage } from '@whiskeysockets/baileys';
import { getMessageText } from '../utils/message.js';
import { getCommand } from '../commands/index.js';

export function registerMessageHandler(sock: WASocket){
    sock.ev.on("messages.upsert", (data) => {
        const msg: WAMessage = data.messages[0];

        if(!msg.message) return;
        if(msg.key.fromMe) return;

        const text = getMessageText(msg).trim();

        if(!text.startsWith("/")) return;

        const commandName = text.slice(1).split(" ")[0].toLowerCase();
        const command = getCommand(commandName);

        if(!command) return;
        console.log(`Incoming command: ${text} from ${msg.pushName || 'User'}`);

        command.execute({
            sock,
            msg,
            text,
        });

        console.log("✓ Send reply for command ", text)
    })
}