import { Container, Graphics, Text, type TextStyleOptions } from "pixi.js";
import { GameConstants } from "../../../../common/src/constants";
import type { LeaderboardEntry } from "../../../../common/src/packets/updatePacket";
import type { Game } from "../game";
import { UiHelpers, UiStyle, UiTextStyle, VerticalLayout } from "./uiHelpers";

const LineTextStyle = {
    ...UiTextStyle,
    fontSize: 16
} satisfies TextStyleOptions;

class LeaderboardEntryDisplay extends Container {
    index = new Text({ style: LineTextStyle });
    playerName = new Text({ style: LineTextStyle });
    kills = new Text({ style: LineTextStyle });
    constructor(index: number) {
        super();
        this.addChild(this.index, this.playerName, this.kills);
        this.kills.anchor.x = 1;
        this.kills.x = LeaderBoardUi.Width - UiStyle.margin;
        this.playerName.y = UiStyle.margin;
        this.kills.y = UiStyle.margin;
        this.playerName.x = UiStyle.margin + LineTextStyle.fontSize * 2.2;
        this.index.text = `${index + 1}.`;
        this.index.x = UiStyle.margin;
        this.index.y = UiStyle.margin;
    }

    setData(name: string, kills: number, isActivePlayer: boolean) {
        this.index.tint = isActivePlayer ? 0xffff00 : 0xffffff;
        this.playerName.text = name;
        this.kills.text = kills;
    }
}

export class LeaderBoardUi extends Container {
    static LineHeight = 20;
    static Width = 250;
    static Height =
        GameConstants.leaderboardMaxEntries * LeaderBoardUi.LineHeight +
        24 +
        UiStyle.margin * 2;
    bg = new Graphics();

    layout = new VerticalLayout({
        height: LeaderBoardUi.LineHeight
    });

    title = new Text({ text: "Kills", style: { ...LineTextStyle, fontSize: 18 } });

    init() {
        this.addChild(this.bg, this.title, this.layout);

        this.title.anchor.x = 0.5;
        this.title.x = LeaderBoardUi.Width / 2;
        this.title.y = UiStyle.margin;

        this.layout.y = 24;

        for (let i = 0; i < GameConstants.leaderboardMaxEntries; i++) {
            const entry = new LeaderboardEntryDisplay(i);
            this.layout.addChild(entry);
        }
        this.layout.relayout();

        this.redrawBackGround();
    }

    redrawBackGround() {
        UiHelpers.drawPanel(this.bg, LeaderBoardUi.Width, LeaderBoardUi.Height);
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
            const name = nameCache.get(entry.playerId) ?? "Unknown Player";
            const isActivePlayer = entry.playerId === activePlayerId;
            entryDisplay.setData(name, entry.kills, isActivePlayer);
        }
    }

    resize(width: number, _height: number) {
        const margin = UiStyle.margin + UiStyle.panels.borderWidth;
        this.x = width - LeaderBoardUi.Width - margin;
        this.y = margin;
    }
}
