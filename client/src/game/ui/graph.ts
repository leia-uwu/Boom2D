import {
    Container,
    type FillStyle,
    Graphics,
    type StrokeStyle,
    Text,
    type TextOptions,
    type TextStyleOptions,
} from "pixi.js";

// replace with your own merge deep function
// I added this here so i can just copy and paste the entire file between projects
function isObject(item: unknown) {
    return (
        item
        && (typeof item === "undefined" ? "undefined" : typeof item) === "object"
        && !Array.isArray(item)
    );
}
function mergeDeep<T extends object>(target: any, ...sources: any[]): T {
    if (!sources.length) return target;
    const source = sources.shift();

    if (isObject(target) && isObject(source)) {
        for (const key in source) {
            if (isObject(source[key])) {
                if (!target[key]) Object.assign(target, { [key]: {} });
                mergeDeep(target[key], source[key]);
            } else {
                Object.assign(target, { [key]: source[key] });
            }
        }
    }

    return mergeDeep(target, ...sources);
}

const defaultLabelTextOptions: TextOptions = {
    style: {
        fontFamily: "monospace",
        fill: {
            color: "white",
        },
        fontSize: 13,
        dropShadow: {
            alpha: 0.5,
            angle: 0,
            blur: 5,
            color: "black",
            distance: 0,
        },
    },
};

interface GraphOptions {
    width: number;
    height: number;
    x: number;
    y: number;
    maxHistory: number;
    title: string;
    fill: FillStyle;
    stroke: StrokeStyle;
    background: {
        fill: FillStyle;
        stroke: StrokeStyle;
    };
    titleTextStyle: TextStyleOptions;
}

const defaultOptions: GraphOptions = {
    width: 350,
    height: 100,
    x: 0,
    y: 0,
    maxHistory: 150,
    title: "",
    fill: {
        color: "red",
        alpha: 0.1,
    },
    stroke: {
        color: "red",
        width: 1,
    },
    background: {
        fill: { color: "transparent" },
        stroke: { color: "gray", alpha: 0.5 },
    },
    titleTextStyle: {
        ...defaultLabelTextOptions.style as TextStyleOptions,
        fontSize: 15,
    },
};

interface GraphLabel {
    readonly text: Text;
    updateText: (graph: Graph) => string;
}

export class Graph {
    readonly container = new Container();
    readonly gfx = new Graphics();
    readonly title = new Text();

    fill: FillStyle;
    stroke: StrokeStyle;
    background: GraphOptions["background"];

    private readonly _labels: Array<GraphLabel> = [];

    get labels(): ReadonlyArray<GraphLabel> {
        return this._labels;
    }

    get x(): number {
        return this.container.x;
    }
    set x(x: number) {
        this.container.x = x;
    }

    get y(): number {
        return this.container.y;
    }
    set y(y: number) {
        this.container.y = y;
    }

    private _width: number;
    get width(): number {
        return this._width;
    }
    set width(w: number) {
        this._width = w;
        this.update();
    }

    private _height: number;
    get height(): number {
        return this._height;
    }
    set height(h: number) {
        this._height = h;
        this.update();
    }

    private readonly _history: number[] = [];
    get history(): ReadonlyArray<number> {
        return this._history;
    }

    private _maxHistory: number;
    set maxHistory(history: number) {
        this._maxHistory = history;
        this.update();
    }
    get maxHistory(): number {
        return this._maxHistory;
    }

    _maxValue = 0;
    /** Biggest value in the current history */
    get maxValue(): number {
        return this._maxValue;
    }

    _minValue = 0;
    /** Smallest value in the current history */
    get minValue(): number {
        return this._minValue;
    }

    _sum = 0;
    /** Sum of all values in the current history */
    get sum(): number {
        return this._sum;
    }

    _averageValue = 0;
    /** Rounded average value in the history (sum / history size) */
    get averageValue(): number {
        return this._averageValue;
    }

    constructor(options: Partial<GraphOptions> = {}) {
        const merged = mergeDeep<GraphOptions>({}, defaultOptions, options);

        this._width = merged.width;
        this._height = merged.height;
        this.x = merged.x;
        this.y = merged.y;

        this._maxHistory = merged.maxHistory;

        this.fill = merged.fill;
        this.stroke = merged.stroke;
        this.background = merged.background;

        this.title.text = merged.title;
        this.title.style = merged.titleTextStyle;
        this.title.anchor.x = 0.5;
        this.title.anchor.y = 1;

        this.container.addChild(this.gfx, this.title);

        this.update();
    }

    addEntry(data: number): void {
        this._history.push(data);
        if (this._history.length > this.maxHistory) {
            this._history.shift();
        }

        this._maxValue = -Infinity;
        this._minValue = Infinity;
        this._sum = 0;

        for (let i = 0; i < this._history.length; i++) {
            const item = this._history[i];
            this._maxValue = this._maxValue > item ? this._maxValue : item;
            this._minValue = this._minValue < item ? this._minValue : item;
            this._sum += item;
        }
        this._averageValue = Math.round(this._sum / this._history.length);

        this.update();
    }

    addLabel(
        updateText: (graph: Graph) => string,
        textOptions: Partial<TextOptions> = {},
    ) {
        const text = new Text(mergeDeep<TextOptions>({}, defaultLabelTextOptions, textOptions));
        this.container.addChild(text);
        this._labels.push({
            text,
            updateText,
        });
        return this;
    }

    update(): void {
        this.updateLabels();
        this.renderGraph();
    }

    updateLabels(): void {
        for (let i = 0, x = 0; i < this._labels.length; i++) {
            const label = this._labels[i];
            label.text.text = label.updateText(this);
            label.text.x = x;
            label.text.y = this.height;
            x += label.text.width + label.text.style.fontSize;
        }
    }

    renderGraph(): void {
        this.title.x = this.width / 2;

        this.gfx
            .clear()
            .rect(0, 0, this.width, this.height)
            .fill(this.background.fill)
            .stroke(this.background.stroke)
            .beginPath()
            .moveTo(0, this.height);

        const spaceBetween = this.width / (this.maxHistory - 1);

        let x = 0;
        for (let i = 0; i < this._history.length; i++) {
            const height = this._history[i] / this._maxValue * this.height;
            x = spaceBetween * i;
            this.gfx.lineTo(x, this.height - height);
        }

        this.gfx
            .lineTo(x, this.height)
            .closePath()
            .fill(this.fill)
            .stroke(this.stroke);
    }
}
