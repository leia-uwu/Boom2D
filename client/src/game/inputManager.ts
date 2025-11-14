import { type WeaponDefKey, WeaponDefs } from "../../../common/src/defs/weaponDefs";
import { InputPacket } from "../../../common/src/packets/inputPacket";
import { Vec2 } from "../../../common/src/utils/vector";
import type { Game } from "./game";

interface Input {
    type: "key" | "mouse" | "wheel";
    down: boolean;
}

const wheelEvents = [
    "MWheelRight",
    "MWheelLeft",
    "MWheelDown",
    "MWheelUp",
    "MWheelForwards",
    "MWheelBackwards",
] as const;

export class InputManager {
    readonly game: Game;

    private _inputsDown: Record<string, Input> = {};

    mousePos = Vec2.new(0, 0);

    /**
     * The angle between the mouse pointer and the screen center
     */
    mouseDir = Vec2.new(0, 0);

    /**
     * The distance between the mouse pointer and the screen center
     */
    mouseDistance = 0;

    weaponToSwitch = "" as WeaponDefKey;

    inputPacket = new InputPacket();
    ticker = 0;

    sequenceInFlight = false;
    lastSequenceTime = 0;
    inputSequence = 0;

    /**
     * Gets if an input is down
     * @param input The input key or mouse button
     * Key events are `KeyboardEvent.code`
     * Mouse buttons are `Mouse${ButtonNumber}`
     * @returns true if the bind is pressed
     */
    isInputDown(input: string): boolean {
        return this._inputsDown[input]?.down ?? false;
    }

    constructor(game: Game) {
        this.game = game;
    }

    init() {
        window.addEventListener("keydown", this.onKeyDown.bind(this));
        window.addEventListener("keyup", this.onKeyUp.bind(this));

        this.game.pixi.stage.on("pointerdown", this.onPointerDown.bind(this));
        this.game.pixi.stage.on("pointerup", this.onPointerUp.bind(this));
        this.game.pixi.stage.on("pointermove", this.onPointerMove.bind(this));

        this.game.pixi.stage.on("wheel", this.onWheel.bind(this));
    }

    onKeyDown(e: KeyboardEvent) {
        this._inputsDown[e.code] = {
            type: "key",
            down: true,
        };

        if (e.code === "F3") {
            this.game.ui.debugUi.toggle();
            e.preventDefault();
        }
    }

    onKeyUp(e: KeyboardEvent) {
        this._inputsDown[e.code] = {
            type: "key",
            down: false,
        };
    }

    onPointerDown(e: MouseEvent) {
        this._inputsDown[`Mouse${e.button}`] = {
            type: "mouse",
            down: true,
        };
    }

    onPointerUp(e: MouseEvent) {
        this._inputsDown[`Mouse${e.button}`] = {
            type: "mouse",
            down: false,
        };
    }

    onPointerMove(e: MouseEvent) {
        this.mousePos = Vec2.new(e.clientX, e.clientY);

        const rotation = Math.atan2(
            window.innerHeight / 2 - e.clientY,
            window.innerWidth / 2 - e.clientX,
        )
            - Math.PI / 2;

        this.mouseDir = Vec2.new(Math.sin(rotation), -Math.cos(rotation));
    }

    onWheel(e: WheelEvent) {
        let key: typeof wheelEvents[number] | undefined = undefined;
        switch (true) {
            case e.deltaX > 0: {
                key = "MWheelRight";
                break;
            }
            case e.deltaX < 0: {
                key = "MWheelLeft";
                break;
            }
            case e.deltaY > 0: {
                key = "MWheelDown";
                break;
            }
            case e.deltaY < 0: {
                key = "MWheelUp";
                break;
            }
            case e.deltaZ > 0: {
                key = "MWheelForwards";
                break;
            }
            case e.deltaZ < 0: {
                key = "MWheelBackwards";
                break;
            }
        }

        if (!key) {
            console.error(`Unknown wheel event:`, e);
            return;
        }

        this._inputsDown[key] = {
            type: "wheel",
            down: true,
        };
    }

    update(dt: number): void {
        this.ticker += dt;
        const inputPacket = new InputPacket();
        inputPacket.moveLeft = this.isInputDown("KeyA");
        inputPacket.moveRight = this.isInputDown("KeyD");
        inputPacket.moveDown = this.isInputDown("KeyS");
        inputPacket.moveUp = this.isInputDown("KeyW");

        inputPacket.mouseDown = this.isInputDown("Mouse0");

        inputPacket.weaponToSwitch = this.weaponToSwitch;

        let i = 1;

        if (this.game.activePlayer) {
            const validWeaps = this.game.ui.weaponsUi.validWeapons;
            for (const weapon of WeaponDefs) {
                if (
                    this.isInputDown(`Digit${i}`)
                    && weapon !== this.game.activePlayer.activeWeapon
                    && validWeaps.includes(weapon)
                ) {
                    inputPacket.weaponToSwitch = weapon;
                    break;
                }
                i++;
            }

            if (this.isInputDown("MWheelDown")) {
                let idx = validWeaps.indexOf(this.game.activePlayer.activeWeapon);
                idx = (idx + 1) % validWeaps.length;
                inputPacket.weaponToSwitch = validWeaps.at(idx) || "" as WeaponDefKey;
            } else if (this.isInputDown("MWheelUp")) {
                let idx = validWeaps.indexOf(this.game.activePlayer.activeWeapon);
                idx = (idx - 1) % validWeaps.length;
                inputPacket.weaponToSwitch = validWeaps.at(idx) || "" as WeaponDefKey;
            }
        }

        inputPacket.direction = this.mouseDir;

        if (inputPacket.didChange(this.inputPacket) || this.ticker > 1) {
            if (!this.sequenceInFlight) {
                this.sequenceInFlight = true;
                this.inputSequence = (this.inputSequence + 1) % 256;
                this.lastSequenceTime = performance.now();
            }
            inputPacket.inputSequence = this.inputSequence;

            this.ticker = 0;
            this.game.sendPacket(inputPacket);
        }

        this.inputPacket = inputPacket;
        this.weaponToSwitch = "" as WeaponDefKey;
    }

    flushInputs() {
        // reset wheel events at the end of every frame
        for (const e of wheelEvents) {
            if (this._inputsDown[e]) {
                this._inputsDown[e].down = false;
            }
        }
    }
}
