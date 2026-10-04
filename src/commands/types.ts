import type { WASocket, WAMessage } from '@whiskeysockets/baileys';

export interface CommandContext {
    sock: WASocket;
    msg: WAMessage;
    text: string;
    /** Kata-kata setelah nama command, misal "/jadwal a b" → ["a", "b"] */
    args: string[];
}

export interface Command {
    name: string;
    aliases?: string[];
    /** Deskripsi singkat untuk /help */
    description?: string;
    /** Sembunyikan dari /help (misal command khusus admin) */
    hidden?: boolean;
    execute(ctx: CommandContext): Promise<void>;
}