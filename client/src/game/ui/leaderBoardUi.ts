import { Container, Graphics, Text, type TextStyleOptions } from "pixi.js";
import { GameConstants } from "../../../../common/src/constants";
import type { LeaderboardEntry } from "../../../../common/src/packets/updatePacket";
import type { Game } from "../game";
import { UiHelpers, UiStyle, UiTextStyle, VerticalLayout } from "./uiHelpers";

const LineHeight = 20;
const Width = 200;
const Height = GameConstants.leaderboardMaxEntries * LineHeight + UiStyle.margin * 2;

const LineTextStyle: TextStyleOptions = {
    ...UiTextStyle,
    fontSize: 16
};

class LeaderboardEntryDisplay extends Container {
    playerName = new Text({ style: LineTextStyle });
    kills = new Text({ style: LineTextStyle });
    constructor() {
        super();
        this.addChild(this.playerName, this.kills);
        this.kills.anchor.x = 1;
        this.kills.x = Width - UiStyle.margin;
        this.playerName.y = this.kills.y = UiStyle.margin;
        this.playerName.x = UiStyle.margin;
    }

    setData(name: string, kills: number, isActivePlayer: boolean) {
        this.playerName.text = name;
        this.kills.text = kills;
        const tint = isActivePlayer ? 0xff0000 : 0xffffff;
        this.playerName.tint = tint;
        this.kills.tint = tint;
    }
}

export class LeaderBoardUi extends Container {
    bg = new Graphics();

    layout = new VerticalLayout({
        height: LineHeight
    });

    init() {
        this.addChild(this.bg, this.layout);

        for (let i = 0; i < GameConstants.leaderboardMaxEntries; i++) {
            const entry = new LeaderboardEntryDisplay();
            this.layout.addChild(entry);
        }
        this.layout.relayout();

        this.redrawBackGround();
    }

    redrawBackGround() {
        UiHelpers.drawPanel(this.bg, Width, Height);
    }

    update(
        data: LeaderboardEntry[],
        nameCache: Game["playerNames"],
        activePlayerId: number
    ) {
        for (let i = 0; i < GameConstants.leaderboardMaxEntries; i++) {
            const entry = data[i];
            const entryDisplay = this.layout.children[i] as LeaderboardEntryDisplay;
            if (entry === undefined) {
                entryDisplay.visible = false;
                continue;
            }
            entryDisplay.visible = true;
            entryDisplay.setData(
                nameCache.get(entry.playerId) ?? "Unknown Player",
                entry.kills,
                entry.playerId === activePlayerId
            );
        }
    }

    resize(width: number, _height: number) {
        const margin = UiStyle.margin + UiStyle.panels.borderWidth;
        this.x = width - Width - margin;
        this.y = margin;
    }
}
