import { Container } from "pixi.js";
import type { AmmoDefKey } from "../../../../common/src/defs/ammoDefs";
import { WeaponDefs } from "../../../../common/src/defs/weaponDefs";
import type { GameOverPacket } from "../../../../common/src/packets/gameOverPacket";
import type { UpdatePacket } from "../../../../common/src/packets/updatePacket";
import { Helpers } from "../../helpers";
import type { Game } from ".././game";
import { AmmoUi } from "./ammoUi";
import { StatusUi } from "./statusUi";
import { WeaponsUi } from "./weaponsUi";

export class GameUi {
    container = new Container();

    statusUi = new StatusUi();
    weaponsUi = new WeaponsUi();
    ammoUi = new AmmoUi();

    playAgainButton = Helpers.getElem("#play-again-btn");
    gameOverScreen = Helpers.getElem("#game-over-screen");
    gameOverKills = Helpers.getElem("#game-over-kill-count");
    gameOverDamageDone = Helpers.getElem("#game-over-damage-done");
    gameOverDamageTaken = Helpers.getElem("#game-over-damage-taken");

    ammo = {} as Record<AmmoDefKey, number>;

    constructor(readonly game: Game) {}

    init() {
        this.playAgainButton.addEventListener("click", () => {
            this.game.endGame();
            this.gameOverScreen.style.display = "none";
        });

        Helpers.getElem("#game-ui").addEventListener("contextmenu", (e) => {
            e.preventDefault();
        });

        this.statusUi.init();
        this.weaponsUi.init(this.game.inputManager);
        this.ammoUi.init();

        this.container.addChild(this.statusUi, this.weaponsUi, this.ammoUi);
    }

    render(dt: number) {
        this.weaponsUi.render(dt);
    }

    resize(): void {
        const { width, height } = this.game.pixi.renderer;

        this.statusUi.resize(width, height);
        this.weaponsUi.resize(width, height);
        this.ammoUi.resize(width, height);
    }

    updateUi(
        data: UpdatePacket["playerData"],
        dirty: UpdatePacket["playerDataDirty"]
    ): void {
        this.statusUi.updateUi(data, dirty);

        if (dirty.weapons) {
            this.weaponsUi.updateUi(data.weapons);
            this.updateActiveWeapon();
        }

        if (dirty.ammo) {
            this.ammo = data.ammo;
            this.ammoUi.updateUi(data.ammo);
            this.updateActiveWeapon();
        }
    }

    updateActiveWeapon() {
        const activeWeapon = this.game.activePlayer!.activeWeapon;
        const def = WeaponDefs.typeToDef(activeWeapon);
        this.statusUi.updateActiveWeaponAmmo(def.ammo, this.ammo[def.ammo] ?? 0);
        this.weaponsUi.updateActiveWeapon(activeWeapon);
    }

    showGameOverScreen(packet: GameOverPacket): void {
        this.gameOverScreen.style.display = "block";
        this.gameOverKills.innerText = `${packet.kills}`;
        this.gameOverDamageDone.innerText = `${packet.damageDone}`;
        this.gameOverDamageTaken.innerText = `${packet.damageTaken}`;
    }
}
