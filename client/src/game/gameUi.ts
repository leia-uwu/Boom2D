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
    }

    showGameOverScreen(packet: GameOverPacket): void {
        this.gameOverScreen.style.display = "block";
        this.gameOverKills.innerText = `Kills: ${packet.kills}`;
    }
}
