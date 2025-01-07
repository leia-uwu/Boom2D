import type { ServerAPIResponse } from "../../common/src/apiTypings";
import { version } from "../../package.json";
import type { Client } from "./client";
import { Config } from "./config";
import { Game } from "./game";
import { Logger } from "./logger";

const game = new Game(Config);

export interface ClientData {
    client: Client;
}

// Initialize the server
Bun.serve<ClientData>({
    port: Config.port,
    hostname: Config.host,
    tls: Config.ssl
        ? {
            key: Bun.file(Config.ssl.keyFile),
            cert: Bun.file(Config.ssl.certFile),
        }
        : undefined,

    async fetch(request, server) {
        const url = new URL(request.url);

        let response: ServerAPIResponse | undefined = undefined;

        switch (url.pathname) {
            case "/server_info":
                response = {
                    playerCount: game.playerManager.players.length,
                };
                break;
            case "/play": {
                const upgraded = server.upgrade(request, {
                    data: {
                        joined: false,
                    },
                });
                if (!upgraded) {
                    return new Response("Websocket upgrade failed.", { status: 400 });
                }
                return new Response("Upgrade success");
            }
        }

        if (response !== undefined) {
            return new Response(JSON.stringify(response), {
                headers: {
                    "Content-Type": "application/json",
                    "Access-Control-Allow-Origin": "*",
                },
            });
        }
        return new Response("404");
    },
    websocket: {
        idleTimeout: 30,
        open(socket) {
            game.clientManager.addClient(socket);
        },
        message(socket, message) {
            try {
                if (message instanceof Buffer) {
                    socket.data.client.processPacket(message.buffer as ArrayBuffer);
                } else {
                    console.error(`Received invalid message type: ${typeof message}`);
                }
            } catch (e) {
                console.warn("Error parsing message:", e);
            }
        },
        close(socket) {
            game.clientManager.removeClient(socket);
        },
    },
});

const logger = new Logger("Server");

logger.log(`Boom2D server version ${version}`);
logger.log(`Websocket server running on ${Config.host}:${Config.port}`);
