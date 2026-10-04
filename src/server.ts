import { createServer } from "node:http";
import QRCode from "qrcode";
import { getQr, isConnected } from "./state/qr.js";

const port = Number(process.env.PORT ?? 3000);
const qrToken = process.env.QR_TOKEN?.trim();

const server = createServer(async (req, res) => {
    const parsedUrl = new URL(req.url ?? "/", `http://${req.headers.host ?? "localhost"}`);

    if (parsedUrl.pathname === "/" && req.method === "GET") {
        if (qrToken && parsedUrl.searchParams.get("token") !== qrToken) {
            res.writeHead(403, { "Content-Type": "text/plain; charset=utf-8" });
            res.end("Akses ditolak: Token tidak valid.");
            return;
        }

        const qr = getQr();
        const connected = isConnected();

        res.writeHead(200, {
            "Content-Type": "text/html; charset=utf-8",
        });

        if (connected) {
            res.end(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>WhatsApp Bot</title>
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #f8fafc; }
                        .card { background: #1e293b; padding: 2rem; border-radius: 12px; text-align: center; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1); }
                        .status { color: #22c55e; font-size: 1.25rem; font-weight: bold; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <h1>WhatsApp Bot</h1>
                        <p class="status">🟢 WhatsApp Connected</p>
                        <p>Bot sedang berjalan dan terhubung.</p>
                    </div>
                </body>
                </html>
            `);
            return;
        }

        if (!qr) {
            res.end(`
                <!DOCTYPE html>
                <html>
                <head>
                    <title>WhatsApp Bot</title>
                    <meta http-equiv="refresh" content="3">
                    <meta name="viewport" content="width=device-width, initial-scale=1">
                    <style>
                        body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #f8fafc; }
                        .card { background: #1e293b; padding: 2rem; border-radius: 12px; text-align: center; }
                    </style>
                </head>
                <body>
                    <div class="card">
                        <h1>WhatsApp Bot</h1>
                        <p>⏳ Menunggu QR Code...</p>
                        <small style="color: #94a3b8;">Halaman akan refresh otomatis.</small>
                    </div>
                </body>
                </html>
            `);
            return;
        }

        const qrImage = await QRCode.toDataURL(qr);

        res.end(`
            <!DOCTYPE html>
            <html>
            <head>
                <title>WhatsApp Bot - Scan QR</title>
                <meta http-equiv="refresh" content="15">
                <meta name="viewport" content="width=device-width, initial-scale=1">
                <style>
                    body { font-family: sans-serif; display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; background: #0f172a; color: #f8fafc; }
                    .card { background: #1e293b; padding: 2rem; border-radius: 12px; text-align: center; }
                    img { border-radius: 8px; background: white; padding: 8px; }
                </style>
            </head>
            <body>
                <div class="card">
                    <h1>WhatsApp Bot</h1>
                    <img src="${qrImage}" width="280" alt="QR Code" />
                    <p>Scan QR Code dengan WhatsApp</p>
                    <small style="color: #94a3b8;">QR otomatis berganti tiap 15 detik.</small>
                </div>
            </body>
            </html>
        `);
        return;
    }

    if (parsedUrl.pathname === "/health" && req.method === "GET") {
        res.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8",
        });

        res.end(
            JSON.stringify({
                status: "ok",
                service: "whatsapp-bot",
                connected: isConnected(),
                time: new Date().toISOString(),
            })
        );
        return;
    }

    res.writeHead(404, {
        "Content-Type": "application/json",
    });

    res.end(
        JSON.stringify({
            error: "Not Found",
        })
    );
});

server.listen(port, "0.0.0.0", () => {
    console.log(`HTTP server running on http://localhost:${port}`);
    console.log(`Health check: http://localhost:${port}/health`);
});