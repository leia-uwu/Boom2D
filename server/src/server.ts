import { type Player } from "./entities/player";
import { Game } from "./game";
import { Config } from "./config";
import { ServerAPIResponse } from "../../common/src/apiTypings";
import { version } from "../../package.json";

const game = new Game(Config);

export interface PlayerData {
    joined: boolean
    /**
     * The player socket game entity
     */
    entity?: Player
}

// Initialize the server
Bun.serve<PlayerData>({
    port: Config.port,
    hostname: Config.host,
    tls: Config.ssl
        ? {
            key: Bun.file(Config.ssl.keyFile),
            cert: Bun.file(Config.ssl.certFile)
        }
        : undefined,

    async fetch(request, server) {
        const url = new URL(request.url);

        let response: ServerAPIResponse | undefined = undefined;

        switch (url.pathname) {
            case "/server_info":
                response = {
                    playerCount: game.players.size
                };
                break;
            case "/play": {
                const upgraded = server.upgrade(request, {
                    data: {
                        joined: false
                    }
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
                    "Access-Control-Allow-Origin": "*"
                }
            });
        }
        return new Response("404");
    },
    websocket: {
        idleTimeout: 30,
        open(socket) {
            // disconnect players that didn't send a join packet after 1 second
            setTimeout(() => {
                if (!socket.data.joined) {
                    socket.close();
                }
            }, 1000);
            socket.data.entity = game.addPlayer(socket);
        },
        message(socket, message) {
            try {
                const player = socket.data.entity;
                if (player === undefined) return;
                player.processMessage((message as Buffer).buffer as ArrayBuffer);
            } catch (e) {
                console.warn("Error parsing message:", e);
            }
        },
        close(socket) {
            const data = socket.data;
            if (data.entity) game.removePlayer(data.entity);
        }
    }
});

console.log(`Boom2D server version ${version}`);
console.log(`Websocket server running on ${Config.host}:${Config.port}`);
