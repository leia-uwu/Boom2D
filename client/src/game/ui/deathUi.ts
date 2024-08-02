import {
    Container,
    Graphics,
    Sprite,
    Text,
    type TextStyleOptions,
    Texture
} from "pixi.js";
import type { DeathPacket } from "../../../../common/src/packets/deathPacket";
import { RespawnPacket } from "../../../../common/src/packets/respawnPacket";
import type { Game } from "../game";
import { Button, UiTextStyle, VerticalLayout } from "./uiHelpers";

const Stats = {
    kills: "Kills",
    damageDone: "Damage Done",
    damageTaken: "Damage Taken"
} as const;

type StatKey = keyof typeof Stats;

const Height = 200;
const Width = 340;

export class DeathUi extends Container {
    ticker = 0;

    overlay = new Sprite(Texture.WHITE);

    statsContainer = new Container();
    bg = new Graphics();

    title = new Text({
        text: "You Died",
        style: {
            ...UiTextStyle
        }
    });

    playerName = new Text({
        text: "Player",
        style: {
            ...UiTextStyle,
            fontSize: 25,
            fontWeight: "bold"
        } satisfies TextStyleOptions
    });

    respawnBtn = new Button({
        text: "Respawn",
        color: 0x29a25f,
        width: 150
    });
    quitBtn = new Button({
        text: "Quit Game",
        color: 0xaa0000,
        width: 150
    });

    textsLayout = new VerticalLayout({
        height: 14,
        margin: 16
    });
    statsLayout = new VerticalLayout({
        height: 14,
        margin: 16
    });

    texts = {} as Record<StatKey, Text>;
    stats = {} as Record<StatKey, Text>;

    init(game: Game) {
        this.addChild(this.overlay, this.statsContainer, this.respawnBtn, this.quitBtn);

        this.overlay.tint = 0;
        this.overlay.alpha = 0.5;
        this.overlay.anchor.set(0.5);

        this.statsContainer.addChild(
            this.bg,
            this.title,
            this.playerName,
            this.textsLayout,
            this.statsLayout
        );
        this.statsContainer.pivot.set(Width / 2, Height / 2);

        this.respawnBtn.onclick = () => {
            game.sendPacket(new RespawnPacket());
        };

        this.quitBtn.onclick = () => {
            game.endGame();
        };

        this.bg.roundRect(0, 0, Width, Height, 4);
        this.bg.fill({ color: 0, alpha: 0.3 });
        const borderWidth = 5;
        this.bg.roundRect(
            -borderWidth / 2,
            -borderWidth / 2,
            Width + borderWidth,
            Height + borderWidth,
            4
        );
        this.bg.stroke({
            color: 0x333333,
            width: borderWidth,
            alpha: 0.5
        });

        this.title.x = Width / 2;
        this.title.y = -45;
        this.title.anchor.x = 0.5;

        const btnY = this.height / 2 + 24;
        const btnX = 80;
        this.respawnBtn.y = this.quitBtn.y = btnY;
        this.respawnBtn.x = -btnX;
        this.quitBtn.x = btnX;

        this.playerName.x = Width / 2;
        this.playerName.y = 16;
        this.playerName.anchor.x = 0.5;

        this.textsLayout.y = 80;
        this.statsLayout.y = 80;
        this.textsLayout.x = -8;
        this.statsLayout.x = Width / 2 + 16;
        const keys = Object.keys(Stats) as StatKey[];

        for (const key of keys) {
            const text = new Text({
                text: Stats[key],
                style: {
                    ...UiTextStyle,
                    fontSize: 14
                }
            });
            this.texts[key] = text;
            text.x = Width / 2;
            text.anchor.x = 1;
            this.textsLayout.addChild(text);

            const stat = new Text({
                text: 0,
                style: {
                    ...UiTextStyle,
                    fontSize: 14
                }
            });
            this.stats[key] = stat;
            this.statsLayout.addChild(stat);
        }
    }

    resize(width: number, height: number) {
        this.x = width / 2;
        this.y = height / 2;

        this.overlay.width = width;
        this.overlay.height = height;

        this.textsLayout.relayout();
        this.statsLayout.relayout();
    }

    render(dt: number) {
        if (!this.visible) return;

        this.alpha += dt;
    }

    show(playerName: string, stats: DeathPacket) {
        this.playerName.text = playerName;
        this.visible = true;
        this.alpha = -1;

        const keys = Object.keys(Stats) as StatKey[];
        for (const key of keys) {
            this.stats[key].text = stats[key];
        }
    }

    hide() {
        this.visible = false;
        this.alpha = 0;
    }
}
