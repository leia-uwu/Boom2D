import { Text, type TextOptions, VERSION } from "pixi.js";
import { DebugFlags, type DebugPacket } from "../../../../common/src/packets/debugPacket";
import { DebugTogglePacket } from "../../../../common/src/packets/debugTogglePacket";
import { PingPacket } from "../../../../common/src/packets/pingPacket";
import { settings } from "../../settings";
import type { Game } from "../game";
import { UiStyle, UiTextStyle, VerticalLayout } from "./uiHelpers";

const DebugTextOptions = {
    style: {
        ...UiTextStyle,
        fontSize: 13
    }
} as TextOptions;

export class DebugUi extends VerticalLayout {
    active = false;

    clientTexts = {
        title: new Text({ text: "-- CLIENT --", ...DebugTextOptions }),
        browser: new Text(DebugTextOptions),
        pixi: new Text(DebugTextOptions),
        fps: new Text(DebugTextOptions),
        ping: new Text(DebugTextOptions),
        position: new Text(DebugTextOptions),
        entities: new Text(DebugTextOptions),
        bullets: new Text(DebugTextOptions),
        particles: new Text(DebugTextOptions)
    };

    serverTexts = {
        title: new Text({ text: "-- SERVER --", ...DebugTextOptions }),
        tps: new Text(DebugTextOptions),
        mspt: new Text(DebugTextOptions),
        entities: new Text(DebugTextOptions),
        bullets: new Text(DebugTextOptions)
    };

    lastPingSentTime = 0;
    sendPingTicker = 0;
    ping = 0;

    constructor(readonly game: Game) {
        super({
            margin: 2,
            ignoreInvisible: true
        });
    }

    init() {
        this.position.set(UiStyle.margin, UiStyle.margin);

        for (const text of Object.values(this.clientTexts)) {
            this.addChild(text);
        }
        for (const text of Object.values(this.serverTexts)) {
            this.addChild(text);
        }

        this.clientTexts.browser.text = `Browser: ${navigator.userAgent}`;
        this.clientTexts.pixi.text = `Pixi: ${VERSION}, ${this.game.pixi.renderer.name}`;
        this.clientTexts.ping.text = `Ping: Unknown`;

        settings.addListener("showFPS", (visible) => {
            this.clientTexts.fps.visible = visible || this.active;
        });
        settings.addListener("showPing", (visible) => {
            this.clientTexts.ping.visible = visible || this.active;
        });
        this.setActive(false);
    }

    setActive(active: boolean) {
        this.active = active;

        for (const text of Object.values(this.clientTexts)) {
            text.visible = active;
        }
        for (const text of Object.values(this.serverTexts)) {
            text.visible = active;
        }

        this.clientTexts.fps.visible = settings.get("showFPS") || this.active;
        this.clientTexts.ping.visible = settings.get("showPing") || this.active;

        this.relayout();

        const packet = new DebugTogglePacket();
        packet.enable = active;
        this.game.sendPacket(packet);
    }

    toggle() {
        this.setActive(!this.active);
    }

    render(dt: number) {
        this.sendPingTicker -= dt;

        if (this.sendPingTicker < 0) {
            this.sendPingTicker = 2;
            this.lastPingSentTime = Date.now();
            this.game.sendPacket(new PingPacket());
        }

        const game = this.game;
        const texts = this.clientTexts;
        texts.fps.text = `FPS: ${game.fps}`;

        if (!this.active) return;
        texts.position.text = `Position: ${game.camera.position.x.toFixed(4)}, ${game.camera.position.y.toFixed(4)}`;
        texts.entities.text = `Entities: ${game.entityManager.entities.length}`;
        texts.bullets.text = `Bullets: ${game.bulletManager.activeCount} / ${game.bulletManager.bullets.length}`;
        texts.particles.text = `Particles: ${game.particleManager.activeCount} / ${game.particleManager.particles.length}`;
    }

    onPingPacket() {
        this.ping = Math.round((this.lastPingSentTime - Date.now()) / 1000);
        this.clientTexts.ping.text = `Ping: ${this.ping}ms`;
    }

    updateServerInfo(packet: DebugPacket) {
        const texts = this.serverTexts;

        if (packet.flags & DebugFlags.Tps) {
            texts.tps.text = `TPS: ${packet.tpsAvg}, ${packet.tpsMin}, ${packet.tpsMax} (avg/min/max)`;
            texts.mspt.text = `MSPT: ${packet.msptAvg.toFixed(2)} (avg)`;
        }

        if (packet.flags & DebugFlags.Objects) {
            const entities = Object.values(packet.entityCounts);
            texts.entities.text = `Entities: ${entities.join(", ")}, total: ${entities.reduce((a, b) => a + b)}`;
            texts.bullets.text = `Bullets: ${packet.bullets}`;
        }
    }
}
