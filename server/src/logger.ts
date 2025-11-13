import { styleText } from "node:util";

export interface LoggerConfig {
    logDate: boolean;
    debug: boolean;
    warn: boolean;
    error: boolean;
}

const defaultLoggerConfig: LoggerConfig = {
    logDate: true,
    debug: true,
    warn: true,
    error: true,
};

export class Logger {
    config: LoggerConfig;
    prefix: string;

    constructor(
        prefix: string,
        config: Partial<LoggerConfig> = {},
    ) {
        this.config = {
            ...defaultLoggerConfig,
            ...config,
        };

        this.prefix = prefix;
    }

    private _log(fn: typeof console.log, ...message: any[]): void {
        if (this.config.logDate) {
            const date = new Date();
            const dateString = `[${
                date.toISOString().substring(0, 10)
            } ${date.toLocaleTimeString()}]`;

            fn(
                styleText("cyan", dateString),
                styleText("green", this.prefix),
                "|",
                ...message,
            );
        } else {
            fn(
                styleText("green", this.prefix),
                "|",
                ...message,
            );
        }
    }

    log(...message: any[]) {
        this._log(console.log, ...message);
    }

    debug(...message: any[]) {
        if (!this.config.debug) return;
        this._log(console.debug, ...message);
    }

    warn(...message: any[]): void {
        if (!this.config.warn) return;
        this._log(console.warn, styleText("yellow", "[WARNING]"), ...message);
    }

    error(...message: any[]): void {
        if (!this.config.error) return;
        this._log(console.error, styleText("yellow", "[WARNING]"), ...message);
    }
}
