import { Container } from "pixi.js";
import type { AmmoDefKey } from "../../../../common/src/defs/ammoDefs";
import { WeaponDefs } from "../../../../common/src/defs/weaponDefs";
import type { UpdatePacket } from "../../../../common/src/packets/updatePacket";
import type { Game } from ".././game";
import { AmmoUi } from "./ammoUi";
import { DeathUi } from "./deathUi";
import { KillFeedUi } from "./killFeedUi";
import { LeaderBoardUi } from "./leaderBoardUi";
import { StatusUi } from "./statusUi";
import { WeaponsUi } from "./weaponsUi";

export class GameUi extends Container {
    statusUi = new StatusUi();
    weaponsUi = new WeaponsUi();
    ammoUi = new AmmoUi();
    leaderBoardUi = new LeaderBoardUi();
    killFeedUi = new KillFeedUi();
    deathUi = new DeathUi();

    ammo = {} as Record<AmmoDefKey, number>;

    constructor(readonly game: Game) {
        super({ visible: false });
    }

    init() {
        this.statusUi.init();
        this.weaponsUi.init(this.game.inputManager);
        this.ammoUi.init();
        this.deathUi.init(this.game);
        this.leaderBoardUi.init();

        this.addChild(
            this.statusUi,
            this.weaponsUi,
            this.ammoUi,
            this.killFeedUi,
            this.leaderBoardUi,
            this.deathUi
        );
    }

    render(dt: number) {
        this.weaponsUi.render(dt);
        this.deathUi.render(dt);
        this.killFeedUi.render(dt);
    }

    resize(): void {
        const width = this.game.pixi.renderer.width / this.scale.x;
        const height = this.game.pixi.renderer.height / this.scale.y;

        this.statusUi.resize(width, height);
        this.weaponsUi.resize(width, height);
        this.ammoUi.resize(width, height);
        this.leaderBoardUi.resize(width, height);
        this.killFeedUi.resize(width, height);
        this.deathUi.resize(width, height);
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

    clear() {
        this.deathUi.hide();
        this.killFeedUi.removeChildren();
    }
}
