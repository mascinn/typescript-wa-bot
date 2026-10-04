import { Command } from './types.js';
import pingCommand from './ping.js';
import jadwalCommand from './jadwal.js';
import setJadwalCommand from './setjadwal.js';
import kirimJadwalCommand from './kirimjadwal.js';
import { shalatCommands } from './shalat.js';

const helpCommand: Command = {
    name: "help",
    aliases: ["menu", "bantuan"],
    description: "Tampilkan daftar command",

    async execute({ sock, msg }) {
        const lines = commands
            .filter((command) => !command.hidden)
            .map((command) => `• /${command.name} — ${command.description ?? ""}`);

        await sock.sendMessage(msg.key.remoteJid!, {
            text: `🤖 *Daftar Command*\n\n${lines.join("\n")}`,
        }, { quoted: msg });
    }
}

const commands: Command[] = [
    jadwalCommand,
    setJadwalCommand,
    ...shalatCommands,
    pingCommand,
    kirimJadwalCommand,
    helpCommand,
];

export function getCommand(name: string): Command | undefined {
    return commands.find((command) => {
        return command.name == name || command.aliases?.includes(name);
    })
}