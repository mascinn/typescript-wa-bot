import  { DisconnectReason, type WASocket } from "@whiskeysockets/baileys";
import qrcode from 'qrcode-terminal';

export function registerConnectionHandler(sock: WASocket, onOpen: () => void, onClose: () => void){

    sock.ev.on("connection.update", (update) => {
        const { connection, qr } = update;

        if(qr){
            qrcode.generate(qr, { small: true });
        }

        if(connection === "open"){
             console.log("WhatsApp Connected!");
             console.log("🔥 Memanggil onOpen...");
             onOpen();
        }

        if(connection === "close"){
            const statusCode = (update.lastDisconnect?.error as any)?.output?.statusCode;

            console.log("WhatsApp Disconected. Status code: ", statusCode);
            if(statusCode !== DisconnectReason.loggedOut){
                onClose();
            }
        }
    })
}