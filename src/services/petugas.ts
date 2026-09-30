import { jadwal } from '../data/petugas.js';

export function getPetugas(hari: string, shalat: string){
    return jadwal[hari]?.[shalat] ?? null;
}