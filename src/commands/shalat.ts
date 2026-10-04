import { Command } from './types.js';
import { buildJadwalShalat } from '../services/jadwal-info.js';
import { PRAYER_LABELS, type PrayerName } from '../services/prayer.js';

// Alias ejaan yang sering dipakai orang
const ALIASES: Record<PrayerName, string[]> = {
    subuh:   ["shubuh", "fajr"],
    dzuhur:  ["zuhur", "dhuhur", "duhur", "zhuhur"],
    ashar:   ["asar", "asr"],
    maghrib: ["magrib"],
    isya:    ["isa", "isha"],
};

function createShalatCommand(shalat: PrayerName): Command {
    return {
        name: shalat,
        aliases: ALIASES[shalat].filter((alias) => alias !== shalat),
        description: `Lihat petugas ${PRAYER_LABELS[shalat]} hari ini`,

        async execute({ sock, msg }) {
            await sock.sendMessage(msg.key.remoteJid!, {
                text: await buildJadwalShalat(shalat),
            }, { quoted: msg });
        },
    };
}

export const shalatCommands: Command[] = (Object.keys(ALIASES) as PrayerName[])
    .map(createShalatCommand);
