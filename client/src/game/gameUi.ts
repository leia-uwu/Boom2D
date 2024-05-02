import { WeaponDefKey, WeaponDefs } from "../../../common/src/defs/weaponDefs";
import { type GameOverPacket } from "../../../common/src/packets/gameOverPacket";
import { UpdatePacket } from "../../../common/src/packets/updatePacket";
import { getElem } from "../utils";
import { type Game } from "./game";

export class GameUi {
    constructor(public game: Game) { }

    health = 0;
    healthDisplay = getElem("#player-health");

    armor = 0;
    armorDisplay = getElem("#player-armor");

    weapons = {} as Record<WeaponDefKey, boolean>;
    weaponsContainer = getElem("#weapons-container");

    playAgainButton = getElem("#play-again-btn");
    gameOverScreen = getElem("#game-over-screen");
    gameOverKills = getElem("#game-over-kill-count");

    setupUi() {
        this.playAgainButton.addEventListener("click", () => {
            this.game.endGame();
            this.gameOverScreen.style.display = "none";
        });

        getElem("#game-ui").addEventListener("contextmenu", e => {
            e.preventDefault();
        });
    }

    updateUi(data: UpdatePacket["playerData"], dirty: UpdatePacket["playerDataDirty"]): void {
        if (dirty.health) {
            this.health = data.health;
            this.healthDisplay.innerText = `Health: ${this.health}%`;
        }
        if (dirty.armor) {
            this.armor = data.armor;
            this.armorDisplay.innerText = `Armor: ${this.armor}%`;
        }

        if (dirty.weapons) {
            this.weapons = data.weapons;
            this.updateWeaponsUi();
        }
    }

    updateWeaponsUi(): void {
        this.weaponsContainer.innerHTML = "";

        const activeWeapon = this.game.activePlayer?.activeWeapon;

        for (const weapon in this.weapons) {
            if (!this.weapons[weapon]) return;
            const def = WeaponDefs.typeToDef(weapon);

            this.weaponsContainer.innerHTML += `
            <div class="inventory-weapon${activeWeapon === weapon ? " active" : ""}">
                ${def.key}
                <img src="${def.inventoryImg.src}" height="50"></img>
                ${weapon}
            </div>
            `;
        }
    }

    showGameOverScreen(packet: GameOverPacket): void {
        this.gameOverScreen.style.display = "block";
        this.gameOverKills.innerText = `Kills: ${packet.kills}`;
    }
}
