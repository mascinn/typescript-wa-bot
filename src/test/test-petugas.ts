import { getPetugas } from '../services/petugas.js';

const petugas = getPetugas("senin", "dzuhur");

console.log(petugas);