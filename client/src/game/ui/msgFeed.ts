import {
    type ColorSource,
    Container,
    Graphics,
    Text,
    type TextStyleOptions
} from "pixi.js";
import { UiTextStyle } from "./uiHelpers";

const MsgMargin = 8;
const MsgTextStyle = {
    ...UiTextStyle,
    fontSize: 16
} satisfies TextStyleOptions;

enum MsgState {
    Showing,
    Idle,
    Hiding,
    BeingDeleted
}

class FeedMsg extends Container {
    bg = new Graphics();
    text = new Text({ style: MsgTextStyle });

    state = MsgState.Showing;

    ticker = 0;
    msgHeight: number;

    lifeSpan = 2;

    constructor(text: string, color: ColorSource, rightAligned?: boolean) {
        super();

        this.alpha = 0;

        this.text.position.set(MsgMargin / 2, MsgMargin / 2);
        this.text.text = text;

        this.msgHeight = this.text.height + MsgMargin + 5;

        const width = this.text.width + MsgMargin;
        if (rightAligned) {
            this.pivot.x = width;
        }

        this.bg.roundRect(0, 0, width, this.text.height + MsgMargin, 4);
        this.bg.fill({ color, alpha: 0.5 });

        this.addChild(this.bg, this.text);
    }

    render(dt: number) {
        switch (this.state) {
            case MsgState.Showing:
                this.alpha += dt * 3;
                if (this.alpha > 1) {
                    this.state = MsgState.Idle;
                    this.alpha = 1;
                }
                break;
            case MsgState.Idle:
                this.lifeSpan -= dt;
                if (this.lifeSpan < 0) {
                    this.state = MsgState.Hiding;
                }
                break;
            case MsgState.Hiding:
                this.alpha -= dt;
                if (this.alpha < 0) {
                    this.state = MsgState.BeingDeleted;
                }
                break;
            case MsgState.BeingDeleted:
                this.msgHeight -= dt * 60;
                break;
        }
    }
}

export class MsgFeed extends Container<FeedMsg> {
    protected _addMsg(text: string, color: ColorSource, rightAligned?: boolean) {
        const msg = new FeedMsg(text, color, rightAligned);
        this.addChild(msg);
    }

    render(dt: number) {
        for (let i = 0, x = 0; i < this.children.length; i++) {
            const msg = this.children[i];
            msg.render(dt);
            msg.position.y = x;
            x += msg.msgHeight;
            if (msg.msgHeight < 0) {
                i--;
                this.removeChild(msg);
            }
        }
    }
}
