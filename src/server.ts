import { createServer } from "node:http";
import QRCode from "qrcode";
import { getQr, isConnected } from "./state/qr.js";

const port = Number(process.env.PORT ?? 3000);

const server = createServer(async (req, res) => {

    if (req.url === "/" && req.method === "GET") {
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
                </head>
                <body>
                    <h1>WhatsApp Bot</h1>
                    <p>🟢 WhatsApp Connected</p>
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
                </head>
                <body>
                    <h1>WhatsApp Bot</h1>
                    <p>Menunggu QR Code...</p>
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
                <title>WhatsApp Bot</title>
            </head>
            <body>
                <h1>WhatsApp Bot</h1>
                <img src="${qrImage}" width="300" />
                <p>Scan QR Code dengan WhatsApp</p>
            </body>
            </html>
        `);

        return;
    }

    if (req.url === "/health" && req.method === "GET") {
        res.writeHead(200, {
            "Content-Type": "application/json; charset=utf-8",
        });

        res.end(
            JSON.stringify({
                status: "ok",
                service: "whatsapp-bot",
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
    console.log("Timezone:", Intl.DateTimeFormat().resolvedOptions().timeZone);
    console.log("Current time:", new Date().toString());
});