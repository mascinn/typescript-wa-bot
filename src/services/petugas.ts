import { jadwal } from '../data/petugas.js';
import type { JadwalShalat } from '../types/petugas.js';

export function getPetugas(hari: string, shalat: string): JadwalShalat | null {
    return jadwal[hari]?.[shalat] ?? null;
}