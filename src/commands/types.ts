import type { WASocket, WAMessage } from '@whiskeysockets/baileys';

interface CommandContext {
    sock: WASocket;
    msg: WAMessage;
    text: string;
}

export interface Command {
    name: string;
    aliases?: string[];
    execute(ctx: CommandContext): Promise<void>;
}