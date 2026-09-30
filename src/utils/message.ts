import type { WAMessage } from '@whiskeysockets/baileys';

export function getMessageText(msg: WAMessage): string{
    return (
        msg.message?.conversation ??
        msg.message?.extendedTextMessage?.text ??
        ""
    );
}