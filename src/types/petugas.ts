export interface Petugas {
    nama: string;
    nomor: string;
}

export interface JadwalShalat {
    adzan: Petugas;
    imam: Petugas;
}

export interface JadwalHarian {
    [shalat: string]: JadwalShalat | null;
}

export interface JadwalPetugas {
    [hari: string]: JadwalHarian;
}