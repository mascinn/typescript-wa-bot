import { makeWASocket, useMultiFileAuthState } from "@whiskeysockets/baileys";
import pino from "pino";

export async function connectToWhatsApp(){
    const { state, saveCreds } = await useMultiFileAuthState("auth_info_baileys");

    const sock = makeWASocket({
        auth: state,
        logger: pino({
            level: "warn"
        }),
        syncFullHistory: false,
        shouldIgnoreJid: (jid) => jid?.endsWith("@broadcast"),
    });

    sock.ev.on("creds.update", saveCreds);

    return sock;
}