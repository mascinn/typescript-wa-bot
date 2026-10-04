import { makeWASocket, useMultiFileAuthState } from "@whiskeysockets/baileys";
import pino from "pino";
import { getTursoClient } from "../db/turso.js";
import { useTursoAuthState } from "./turso-auth.js";

export const AUTH_FOLDER = "auth_info_baileys";

export async function connectToWhatsApp() {
    const isUsingTurso = !!getTursoClient();

    const { state, saveCreds } = isUsingTurso
        ? await useTursoAuthState()
        : await useMultiFileAuthState(AUTH_FOLDER);

    const sock = makeWASocket({
        auth: state,
        logger: pino({
            level: "warn",
        }),
        syncFullHistory: false,
        shouldIgnoreJid: (jid) => jid?.endsWith("@broadcast"),
    });

    sock.ev.on("creds.update", saveCreds);

    return sock;
}