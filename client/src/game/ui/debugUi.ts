import { type CanvasTextOptions, Text } from "pixi.js";
import { EntityType } from "../../../../common/src/constants";
import { DebugFlags, DebugPacket } from "../../../../common/src/packets/debugPacket";
import { DebugTogglePacket } from "../../../../common/src/packets/debugTogglePacket";
import { settings } from "../../settings";
import type { Game } from "../game";
import { UiStyle, UiTextStyle, VerticalLayout } from "./uiHelpers";

const DebugTextOptions = {
    style: {
        ...UiTextStyle,
        fontSize: 13,
    },
} as CanvasTextOptions;

export class DebugUi extends VerticalLayout {
    active = false;

    texts: Text[] = [];

    serverInfo = {
        tpsAvg: 0,
        tpsMin: 0,
        tpsMax: 0,
        msptAvg: 0,
        entityCounts: [] as DebugPacket["entityCounts"],
        bullets: 0,
        allocatedBullets: 0,
    };

    constructor(readonly game: Game) {
        super({
            margin: 2,
            ignoreInvisible: true,
        });
    }

    init() {
        this.position.set(UiStyle.margin, UiStyle.margin);

        this.setActive(false);
    }

    setActive(active: boolean) {
        this.active = active;

        this.relayout();

        const packet = new DebugTogglePacket();
        packet.enable = active;
        this.game.sendPacket(packet);
    }

    toggle() {
        this.setActive(!this.active);
    }

    render() {
        const game = this.game;

        for (let i = 0; i < this.texts.length; i++) {
            this.texts[i].visible = false;
        }

        if (!this.active) {
            if (settings.get("showFPS")) {
                this.addLine(`FPS: ${game.fps}`);
            }
            if (settings.get("showPing")) {
                this.addLine(`Ping: ${game.ping}`);
            }
            this.relayout();
            return;
        }

        const addEntityCount = (name: string, count: number, allocated: number) => {
            const title = `${name}:`.padEnd(15);
            this.addLine(` - ${title} ${count.toString().padStart(5)} / ${allocated}`);
        };

        this.addLine("-- CLIENT --");

        this.addLine(`FPS: ${game.fps}`);
        this.addLine(`Ping: ${game.ping}`);

        const pos = game.camera.position;

        this.addLine(`Pos: ${pos.x.toFixed(4)}, ${pos.y.toFixed(4)}`);

        this.addLine(`Entities: (${game.entityManager.entities.length})`);

        for (const [type, pool] of Object.entries(game.entityManager.typeToPool)) {
            addEntityCount(
                EntityType[type as unknown as EntityType],
                pool.activeCount,
                pool.allocatedCount,
            );
        }
        addEntityCount(
            "Bullets",
            game.bulletManager.activeCount,
            game.bulletManager.bullets.length,
        );
        addEntityCount(
            "Particles",
            game.particleManager.activeCount,
            game.particleManager.particles.length,
        );

        this.addLine("\n-- SERVER --");

        const sInfo = this.serverInfo;

        this.addLine(`TPS: ${sInfo.tpsAvg} / ${sInfo.tpsMin} / ${sInfo.tpsMax} (avg/min/max)`);
        this.addLine(`AVG MSPT: ${sInfo.msptAvg.toFixed(4)}`);
        this.addLine("- Entities:");

        for (let i = 0; i < sInfo.entityCounts.length; i++) {
            const count = sInfo.entityCounts[i];
            addEntityCount(EntityType[count.type], count.active, count.allocated);
        }
        addEntityCount("Bullets", sInfo.bullets, sInfo.allocatedBullets);

        this.relayout();
    }

    addLine(line: string) {
        let text = this.texts.find(t => !t.visible);
        if (!text) {
            text = new Text(DebugTextOptions);
            this.addChild(text);
            this.texts.push(text);
        }
        text.visible = true;
        text.text = line;
    }

    updateServerInfo(packet: DebugPacket) {
        if (packet.flags & DebugFlags.Tps) {
            this.serverInfo.tpsAvg = packet.tpsAvg;
            this.serverInfo.tpsMin = packet.tpsMin;
            this.serverInfo.tpsMax = packet.tpsMax;
            this.serverInfo.msptAvg = packet.msptAvg;
        }

        if (packet.flags & DebugFlags.Objects) {
            this.serverInfo.entityCounts = packet.entityCounts;
            this.serverInfo.bullets = packet.bullets;
            this.serverInfo.allocatedBullets = packet.allocatedBullets;
        }
    }
}
