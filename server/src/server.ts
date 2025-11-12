import { version } from "../../package.json";
import type { Client } from "./client";
import { Config } from "./config";
import { Game } from "./game";
import { Logger } from "./logger";

const game = new Game(Config);

const logger = new Logger("Server");

export interface SocketData {
    client: Client;
}

// Initialize the server
Bun.serve<SocketData>({
    port: Config.port,
    hostname: Config.host,
    tls: Config.ssl
        ? {
            key: Bun.file(Config.ssl.keyFile),
            cert: Bun.file(Config.ssl.certFile),
        }
        : undefined,

    routes: {
        "/server_info": (_req) => {
            return Response.json({
                playerCount: game.playerManager.players.length,
            });
        },
        "/play": (req, server) => {
            const upgraded = server.upgrade(req, {
                data: {
                    client: undefined,
                } as unknown as SocketData,
            });
            if (!upgraded) {
                return new Response("Websocket upgrade failed.", { status: 400 });
            }
            return new Response("Upgrade success");
        },
    },

    async fetch(_request, _server) {
        return new Response("Not found!", { status: 404 });
    },

    websocket: {
        idleTimeout: 30,
        open(socket) {
            game.clientManager.addClient(socket);
        },
        message(socket, message) {
            if (message instanceof Buffer) {
                socket.data.client.processPacket(message.buffer as ArrayBuffer);
            } else {
                logger.warn(`Received invalid message type: ${typeof message}`);
                socket.close();
            }
        },
        close(socket) {
            game.clientManager.removeClient(socket);
        },
    },
});

logger.log(`Boom2D server version ${version}`);
logger.log(`Websocket server running on ${Config.host}:${Config.port}`);
