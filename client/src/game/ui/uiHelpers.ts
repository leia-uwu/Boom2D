import { Container, type TextOptions } from "pixi.js";

export const UiTextStyle: TextOptions = {
    style: {
        fill: 0xffffff,
        fontFamily: "Rubik Mono One",
        dropShadow: {
            color: 0,
            alpha: 0.6,
            distance: 2
        },
        align: "right"
    }
};

interface LayoutOptions {
    margin: number;
    width: number;
    height: number;
}

class Layout extends Container {
    layout: LayoutOptions;
    constructor(layout?: Partial<LayoutOptions>) {
        super();
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
        for (let y = 0, i = this.children.length - 1; i >= 0; i--) {
            const child = this.children[i];
            child.y = y;
            y += (this.layout.height || child.height) + this.layout.margin;
        }
    }
}

export class HorizontalLayout extends Layout {
    relayout() {
        for (let x = 0, i = this.children.length - 1; i >= 0; i--) {
            const child = this.children[i];
            child.x = x;
            x += (this.layout.width || child.width) + this.layout.margin;
        }
    }
}
