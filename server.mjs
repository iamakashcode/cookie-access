import { createServer } from 'http';
import next from 'next';
import dotenv from 'dotenv';

// Load environment variables
dotenv.config();

const port = process.env.PORT || 7019; // Set the port from environment variables or default to 3019
const dev = process.env.NODE_ENV !== 'production'; // Check if we are in development mode
const app = next({ dev });
const handle = app.getRequestHandler(); // Get the default request handler for Next.js

function ensureVaryAccept(res) {
    const originalWriteHead = res.writeHead.bind(res);
    res.writeHead = (statusCode, ...args) => {
        const existing = res.getHeader("Vary");
        const values = new Set(
            (Array.isArray(existing) ? existing.join(",") : existing || "")
                .split(",")
                .map((v) => v.trim())
                .filter(Boolean)
        );
        values.add("Accept");
        values.add("Accept-Encoding");
        res.setHeader("Vary", Array.from(values).join(", "));
        return originalWriteHead(statusCode, ...args);
    };
}

app.prepare()
    .then(() => {
        createServer(async (req, res) => {
            ensureVaryAccept(res);
            if (req.url.startsWith("/api/auth/")) {
                // Forward NextAuth API requests to Next.js handler
                return handle(req, res);
            }
            handle(req, res); // Forward the regular requests
        }).listen(port, (err) => {
            if (err) throw err;
            console.log(`> Ready on http://localhost:${port}`); // Log that the server is ready
        });
    })
    .catch(err => {
        console.error('Error starting server:', err); // Log any errors
        process.exit(1); // Exit the process if there's an error
    });
