import { type WeaponDefKey, WeaponDefs } from "../../../common/src/defs/weaponDefs";
import { InputPacket } from "../../../common/src/packets/inputPacket";
import { Vec2 } from "../../../common/src/utils/vector";
import type { Game } from "./game";

export class InputManager {
    readonly game: Game;

    private _inputsDown: Record<string, boolean> = {};

    /**
     * The angle between the mouse pointer and the screen center
     */
    mouseDir = Vec2.new(0, 0);

    /**
     * The distance between the mouse pointer and the screen center
     */
    mouseDistance = 0;

    weaponToSwitch = "" as WeaponDefKey;

    /**
     * Gets if an input is down
     * @param input The input key or mouse button
     * Single keys must be upper case
     * Mouse buttons are `Mouse${ButtonNumber}`
     * @returns true if the bind is pressed
     */
    isInputDown(input: string): boolean {
        return this._inputsDown[input] ?? false;
    }

    constructor(game: Game) {
        this.game = game;

        window.addEventListener("keydown", this.handleInputEvent.bind(this, true));
        window.addEventListener("keyup", this.handleInputEvent.bind(this, false));
        window.addEventListener("pointerdown", this.handleInputEvent.bind(this, true));
        window.addEventListener("pointerup", this.handleInputEvent.bind(this, false));
        window.addEventListener("wheel", this.handleInputEvent.bind(this, true));

        window.addEventListener("mousemove", (e) => {
            const rotation = Math.atan2(
                window.innerHeight / 2 - e.clientY,
                window.innerWidth / 2 - e.clientX,
            )
                - Math.PI / 2;

            this.mouseDir = Vec2.new(Math.sin(rotation), -Math.cos(rotation));
        });
    }

    inputPacket = new InputPacket();
    ticker = 0;

    update(dt: number): void {
        this.ticker += dt;
        const inputPacket = new InputPacket();
        inputPacket.moveLeft = this.isInputDown("A");
        inputPacket.moveRight = this.isInputDown("D");
        inputPacket.moveDown = this.isInputDown("S");
        inputPacket.moveUp = this.isInputDown("W");

        inputPacket.mouseDown = this.isInputDown("Mouse0");

        inputPacket.weaponToSwitch = this.weaponToSwitch;

        for (const weapon of WeaponDefs) {
            const def = WeaponDefs.typeToDef(weapon);
            if (
                this.isInputDown(def.key)
                && weapon !== this.game.activePlayer?.activeWeapon
            ) {
                inputPacket.weaponToSwitch = weapon;
                break;
            }
        }

        inputPacket.direction = this.mouseDir;

        if (inputPacket.didChange(this.inputPacket) || this.ticker > 1) {
            this.ticker = 0;
            this.game.sendPacket(inputPacket);
        }

        this.inputPacket = inputPacket;
        this.weaponToSwitch = "" as WeaponDefKey;
    }

    private _mWheelStopTimer: number | undefined;

    handleInputEvent(
        down: boolean,
        event: KeyboardEvent | MouseEvent | WheelEvent,
    ): void {
        /*
            We don't want to allow keybinds to work with modifiers, because firstly,
            pressing ctrl + R to reload is dumb and secondly, doing that refreshes the page.
            In essence, we need to only process inputs which are a single modifier key or which are
            a normal key without modifiers.
            This only applies to keyboard events
        */
        if (event instanceof KeyboardEvent) {
            let modifierCount = 0;
            (
                ["altKey", "metaKey", "ctrlKey", "shiftKey"] as Array<keyof KeyboardEvent>
            ).forEach((modifier) => event[modifier] && modifierCount++);

            // As stated before, more than one modifier or a modifier alongside another key should invalidate an input
            if (
                (modifierCount > 1
                    || (modifierCount === 1
                        && !["Shift", "Control", "Alt", "Meta"].includes(event.key)))
                && down
                // …but it only invalidates pressing a key, not releasing it
            ) {
                return;
            }
        }

        const key = this.getKeyFromInputEvent(event);

        if (event instanceof WheelEvent) {
            // The browser doesn't emit mouse wheel "stop" events.
            // so instead, we set it to false after a timeout

            clearTimeout(this._mWheelStopTimer);
            this._mWheelStopTimer = window.setTimeout(() => {
                this._inputsDown[key] = false;
            }, 50);

            this._inputsDown[key] = true;

            return;
        }
        this._inputsDown[key] = event.type === "keydown" || event.type === "pointerdown";

        if (event.type === "keydown" && key === "Home") {
            this.game.ui.debugUi.toggle();
        }
    }

    getKeyFromInputEvent(event: KeyboardEvent | MouseEvent | WheelEvent): string {
        let key = "";
        if (event instanceof KeyboardEvent) {
            key = event.key.length > 1 ? event.key : event.key.toUpperCase();
            if (key === " ") {
                key = "Space";
            }
        }

        if (event instanceof WheelEvent) {
            switch (true) {
                case event.deltaX > 0: {
                    key = "MWheelRight";
                    break;
                }
                case event.deltaX < 0: {
                    key = "MWheelLeft";
                    break;
                }
                case event.deltaY > 0: {
                    key = "MWheelDown";
                    break;
                }
                case event.deltaY < 0: {
                    key = "MWheelUp";
                    break;
                }
                case event.deltaZ > 0: {
                    key = "MWheelForwards";
                    break;
                }
                case event.deltaZ < 0: {
                    key = "MWheelBackwards";
                    break;
                }
            }
            if (key === "") {
                console.error("An unrecognized scroll wheel event was received: ", event);
            }
            return key;
        }

        if (event instanceof MouseEvent) {
            key = `Mouse${event.button}`;
        }

        return key;
    }
}
