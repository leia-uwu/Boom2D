import type { ServerInfo } from "../../common/src/apiTypings";
import { GameConstants } from "../../common/src/constants";
import { ClientConfig } from "./config";
import { Helpers } from "./helpers";
import type { App } from "./main";
import { settings } from "./settings";
import { SettingsMenu } from "./settingsMenu";

export class UiManager {
    playButton = Helpers.getElem<HTMLButtonElement>("#play-btn");
    nameInput = Helpers.getElem<HTMLInputElement>("#name-input");
    serverSelect = Helpers.getElem<HTMLSelectElement>("#server-selector");
    homeDiv = Helpers.getElem<HTMLDivElement>("#home");

    settingsMenu: SettingsMenu;

    constructor(readonly app: App) {
        this.setupMainMenu();
        this.settingsMenu = new SettingsMenu(app);
    }

    setupMainMenu(): void {
        this.nameInput.maxLength = GameConstants.player.nameMaxLength;

        this.nameInput.value = settings.get("name");
        this.nameInput.addEventListener("input", () => {
            settings.set("name", this.nameInput.value);
        });

        this.playButton.addEventListener("click", () => {
            this.app.game.join();
        });

        this.loadServerInfo();

        this.serverSelect.value = settings.get("server");
        this.serverSelect.addEventListener("change", () => {
            settings.set("server", this.serverSelect.value);
            this.app.game.connect();
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

            fetch(`http${server.https ? "s" : ""}://${server.address}/server_info`)
                .then(async (res) => {
                    const data = (await res.json()) as ServerInfo;
                    option.innerText = `${server.name} - ${data.playerCount} Players`;
                })
                .catch((err) => {
                    console.error(
                        `Failed to fetch server info for region ${server.name}: ${err}`
                    );
                });
        }
    }
}
