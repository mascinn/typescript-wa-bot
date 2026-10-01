let currentQr: string | null = null;
let connected = false;

export function setQr(qr: string) {
    currentQr = qr;
    connected = false;
}

export function getQr() {
    return currentQr;
}

export function setConnected(value: boolean) {
    connected = value;
    
    if (value) {
        currentQr = null;
    }
}

export function isConnected() {
    return connected;
}