import type { WAMessage, proto } from '@whiskeysockets/baileys';

export function getRawMessageContent(msg: WAMessage): proto.IMessage | null | undefined {
    let m = msg.message;
    if (m?.ephemeralMessage?.message) m = m.ephemeralMessage.message;
    if (m?.viewOnceMessage?.message) m = m.viewOnceMessage.message;
    if (m?.viewOnceMessageV2?.message) m = m.viewOnceMessageV2.message;
    if (m?.documentWithCaptionMessage?.message) m = m.documentWithCaptionMessage.message;
    return m;
}

export function getMessageText(msg: WAMessage): string{
    const m = getRawMessageContent(msg);
    return (
        m?.conversation ??
        m?.extendedTextMessage?.text ??
        m?.imageMessage?.caption ??
        m?.videoMessage?.caption ??
        m?.documentMessage?.caption ??
        ""
    );
}