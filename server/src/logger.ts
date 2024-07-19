export const Colors = {
    black: {
        normal: 30,
        bright: 90
    },
    red: {
        normal: 31,
        bright: 91
    },
    green: {
        normal: 32,
        bright: 92
    },
    yellow: {
        normal: 33,
        bright: 93
    },
    blue: {
        normal: 34,
        bright: 94
    },
    magenta: {
        normal: 35,
        bright: 95
    },
    cyan: {
        normal: 36,
        bright: 96
    },
    white: {
        normal: 37,
        bright: 97
    },
    default: {
        normal: 39,
        bright: 39
    }
} as const;

type Color = keyof typeof Colors;
type Variant = keyof (typeof Colors)[Color];

const CSI = "\u001B";
export function styleText(
    string: string,
    ...styles: Array<(typeof Colors)[Color][Variant]>
): string {
    return `${CSI}[${styles.join(";")}m${string}${CSI}[0m`;
}

export class Logger {
    constructor(public prefix: string) {}

    log(...message: any[]): void {
        const date = new Date();
        const dateString = `[${date.toISOString().substring(0, 10)} ${date.toLocaleTimeString()}]`;
        console.log(
            styleText(dateString, Colors.cyan.normal),
            styleText(this.prefix, Colors.green.normal),
            "|",
            message.join(" ")
        );
    }
    warn(...message: any[]): void {
        this.log(styleText("[WARNING]", Colors.yellow.normal), message.join(" "));
    }
}
