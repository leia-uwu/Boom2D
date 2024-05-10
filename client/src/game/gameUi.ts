import { GameConstants } from "../../../common/src/constants";
import { WeaponDefKey, WeaponDefs } from "../../../common/src/defs/weaponDefs";
import { type GameOverPacket } from "../../../common/src/packets/gameOverPacket";
import { UpdatePacket } from "../../../common/src/packets/updatePacket";
import { Helpers } from "../helpers";
import { type Game } from "./game";

export class GameUi {
    constructor(public game: Game) { }

    health = 0;
    healthDisplay = Helpers.getElem("#player-health");

    armor = 0;
    armorDisplay = Helpers.getElem("#player-armor");

    weapons = {} as Record<WeaponDefKey, boolean>;
    weaponsContainer = Helpers.getElem("#weapons-container");
    weaponsContainers = {} as Record<WeaponDefKey, HTMLDivElement>;

    playAgainButton = Helpers.getElem("#play-again-btn");
    gameOverScreen = Helpers.getElem("#game-over-screen");
    gameOverKills = Helpers.getElem("#game-over-kill-count");

    ammo = {} as Record<typeof GameConstants["ammoTypes"][number], number>;
    ammoContainer = Helpers.getElem("#ammo-container");
    ammoContainers = {} as Record<typeof GameConstants["ammoTypes"][number], HTMLDivElement>;

    setupUi() {
        this.playAgainButton.addEventListener("click", () => {
            this.game.endGame();
            this.gameOverScreen.style.display = "none";
        });

        Helpers.getElem("#game-ui").addEventListener("contextmenu", e => {
            e.preventDefault();
        });

        // setup weapon containers
        for (const weapon of WeaponDefs) {
            const container = document.createElement("div");
            container.classList.add("inventory-weapon");
            container.addEventListener("pointerdown", e => {
                this.game.inputManager.weaponToSwitch = weapon;
                e.stopPropagation();
            });

            const def = WeaponDefs.typeToDef(weapon);
            container.innerHTML += def.key;

            const img = document.createElement("img");
            img.draggable = false;
            img.src = this.game.resourceManager.getImage(def.inventoryImg.src);

            container.appendChild(img);
            this.weaponsContainers[weapon] = container;
            this.weaponsContainer.appendChild(container);
        }

        // setup ammo containers
        for (const ammo of GameConstants.ammoTypes) {
            const container = document.createElement("div");
            container.classList.add("ammo");

            const nameDiv = document.createElement("div");
            nameDiv.classList.add("ammo-name");
            nameDiv.innerText = `${ammo.charAt(0).toUpperCase() + ammo.slice(1, ammo.length)}: `;

            const amountDiv = document.createElement("div");
            amountDiv.classList.add("ammo-amount");

            this.ammoContainers[ammo] = amountDiv;

            container.appendChild(nameDiv);
            container.appendChild(amountDiv);
            this.ammoContainer.appendChild(container);
        }
    }

    updateUi(data: UpdatePacket["playerData"], dirty: UpdatePacket["playerDataDirty"]): void {
        if (dirty.health) {
            this.health = data.health;
            this.healthDisplay.innerText = `${this.health}%`;
        }
        if (dirty.armor) {
            this.armor = data.armor;
            this.armorDisplay.innerText = `${this.armor}%`;
        }

        if (dirty.weapons) {
            this.weapons = data.weapons;
            this.updateWeaponsUi();
        }

        if (dirty.ammo) {
            this.ammo = data.ammo;
            this.updateAmmoUi();
        }
    }

    updateWeaponsUi(): void {
        const activeWeapon = this.game.activePlayer?.activeWeapon;

        for (const weapon of WeaponDefs) {
            const container = this.weaponsContainers[weapon];
            container.classList.toggle("active", weapon === activeWeapon);
            container.style.display = this.weapons[weapon] ? "block" : "none";
        }
    }

    updateAmmoUi(): void {
        for (const ammo of GameConstants.ammoTypes) {
            this.ammoContainers[ammo].innerText = this.ammo[ammo].toString();
        }
    }

    showGameOverScreen(packet: GameOverPacket): void {
        this.gameOverScreen.style.display = "block";
        this.gameOverKills.innerText = `Kills: ${packet.kills}`;
    }
}
