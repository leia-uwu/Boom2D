import {
    Color,
    type ColorSource,
    Container,
    type ContainerOptions,
    Graphics,
    Text,
    type TextStyleOptions
} from "pixi.js";

export const UiTextStyle: TextStyleOptions = {
    fill: 0xffffff,
    fontFamily: "Roboto Mono Semi Bold",
    dropShadow: {
        color: 0,
        alpha: 0.6,
        distance: 2
    }
};

export const UiStyle = {
    margin: 8,
    panels: {
        borderWidth: 5,
        backgroundColor: 0,
        backgroundAlpha: 0.3,
        borderRadius: 4,
        strokeColor: 0x333333,
        strokeWidth: 5,
        stroleAlpha: 0.5
    }
};

export const UiHelpers = {
    drawPanel(ctx: Graphics, width: number, height: number) {
        const style = UiStyle.panels;
        ctx.clear();
        ctx.roundRect(0, 0, width, height, style.borderRadius);
        ctx.fill({
            color: UiStyle.panels.backgroundColor,
            alpha: UiStyle.panels.backgroundAlpha
        });
        ctx.roundRect(
            -style.strokeWidth / 2,
            -style.strokeWidth / 2,
            width + style.strokeWidth,
            height + style.strokeWidth,
            style.borderRadius + style.strokeWidth / 2
        );
        ctx.stroke({
            color: UiStyle.panels.strokeColor,
            width: style.strokeWidth,
            alpha: style.stroleAlpha
        });
    }
};

interface LayoutOptions {
    margin: number;
    width: number;
    height: number;
}

class Layout extends Container {
    layout: LayoutOptions;
    constructor(layout?: Partial<LayoutOptions>, containerOptions?: ContainerOptions) {
        super(containerOptions);
        this.layout = {
            width: 0,
            height: 0,
            margin: 0,
            ...layout
        };
    }
}

export class VerticalLayout extends Layout {
    relayout() {
        for (let i = 0, y = 0; i < this.children.length; i++) {
            const child = this.children[i];
            child.y = y;
            y += (this.layout.height || child.height) + this.layout.margin;
        }
    }
}

export class HorizontalLayout extends Layout {
    relayout() {
        for (let i = 0, x = 0; i < this.children.length; i++) {
            const child = this.children[i];
            child.x = x;
            x += (this.layout.width || child.width) + this.layout.margin;
        }
    }
}

interface ButtonOptions {
    text: string;
    width: number;
    color: ColorSource;
    fontSize?: number;
}

export class Button extends Container {
    bg = new Graphics({
        cursor: "pointer"
    });
    text = new Text({
        cursor: "pointer",
        style: UiTextStyle
    });

    constructor(public options: ButtonOptions) {
        super();

        this.addChild(this.bg, this.text);

        this.text.style.fontSize = options.fontSize ?? 14;
        this.text.text = options.text;

        this.draw();
    }

    draw() {
        const padding = 16;
        const height = this.text.height + padding;
        const width = this.options.width;

        this.text.anchor.x = 0.5;
        this.text.x = width / 2;

        this.bg.roundRect(0, -padding / 2, width, height, 4);

        this.bg.fill(this.options.color);
        this.bg.stroke({
            color: new Color(this.options.color).multiply(0x444444),
            width: 4
        });
        this.pivot.x = this.width / 2;
        this.pivot.y = this.height / 2;
    }
}
