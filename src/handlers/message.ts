import type { WASocket, WAMessage } from '@whiskeysockets/baileys';

export function registerMessageHandler(sock: WASocket){
    sock.ev.on("messages.upsert", (data) => {
        const msg = data.messages[0];

        if(!msg.message) return;
        if(msg.key.fromMe) return;

        const text = msg.message.conversation;

        console.log("Incoming messages: ", text);
    })
}