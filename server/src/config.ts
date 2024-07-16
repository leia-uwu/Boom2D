import type { MapDefKey } from "../../common/src/defs/mapDefs";

export const Config: ServerConfig = {
    host: "127.0.0.1",
    port: 8000,
    tps: 35,
    map: "main"
};

export interface ServerConfig {
    readonly host: string;
    readonly port: number;

    readonly map: MapDefKey;

    /**
     * The server tick rate
     * In ticks/second
     */
    readonly tps: number;
    /**
     * HTTPS/SSL options. Not used if running locally or with nginx.
     */
    readonly ssl?: {
        readonly keyFile: string;
        readonly certFile: string;
    };
}
