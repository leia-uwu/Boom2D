import { GameConstants } from "../../common/src/constants";
import { ClientConfig } from "./config";
import { Helpers } from "./helpers";
import { type App } from "./main";
import { settings } from "./settings";

export class UiManager {
    playButton = Helpers.getElem<HTMLButtonElement>("#play-btn");
    nameInput = Helpers.getElem<HTMLInputElement>("#name-input");
    serverSelect = Helpers.getElem<HTMLSelectElement>("#server-selector");
    homeDiv = Helpers.getElem<HTMLDivElement>("#home");
    gameDiv = Helpers.getElem<HTMLDivElement>("#game");

    constructor(readonly app: App) {
        this.setupMainMenu();
    }

    setupMainMenu(): void {
        this.nameInput.maxLength = GameConstants.player.nameMaxLength;

        this.nameInput.value = settings.get("name");
        this.nameInput.addEventListener("input", () => {
            settings.set("name", this.nameInput.value);
        });

        this.playButton.disabled = true;
        this.playButton.addEventListener("click", () => {
            if (this.playButton.disabled) return;
            const server = ClientConfig.servers[this.serverSelect.value];
            this.app.game.connect(`ws${server.https ? "s" : ""}://${server.address}/play`);
        });

        this.loadServerInfo();

        this.serverSelect.value = settings.get("server");
        this.serverSelect.addEventListener("change", () => {
            settings.set("server", this.serverSelect.value);
        });
    }

    /**
     * Load server selector menu
     */
    loadServerInfo(): void {
        this.serverSelect.innerHTML = "";

        for (const serverId in ClientConfig.servers) {
            const server = ClientConfig.servers[serverId];
            const option = document.createElement("option");
            this.serverSelect.appendChild(option);
            option.value = serverId;
            option.innerText = server.name;

            fetch(`http${server.https ? "s" : ""}://${server.address}/server_info`).then(async res => {
                const data = await res.json();
                option.innerText = `${server.name} - ${data.playerCount} Players`;
            }).catch(err => {
                console.error(`Failed to fetch server info for region ${server.name}: ${err}`);
            });
        }
    }
}
