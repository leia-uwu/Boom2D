import { HitData } from "../../common/src/packets/updatePacket";
import { Vec2 } from "../../common/src/utils/vector";

interface Hit extends HitData {
    active: boolean;
    time: number;
}

export class HitManager {
    // maximum accumulation time
    // used for damage accumulation into the same particle on the first loop
    static AccTimeMax = 0.1;

    hits: Hit[] = [];

    addHit(hit: HitData) {
        for (let i = 0; i < this.hits.length; i++) {
            const existing = this.hits[i];

            // first loop:
            // try finding existing hit particles belonging to a player
            // and increment their damage
            // this makes shotguns look nicer because they wont spawn multiple
            // particles in the client
            if (
                existing.active
                && existing.targetId === hit.targetId
                && existing.sourceId === hit.sourceId
                && Vec2.distanceSqrt(existing.position, hit.position) <= 4
            ) {
                existing.amount += hit.amount;

                return;
            }
        }

        // second loop: find an existing disabled one in the pool
        for (let i = 0; i < this.hits.length; i++) {
            const existing = this.hits[i];
            if (!existing.active) {
                Object.assign(existing, hit);
                existing.active = true;
                existing.time = 0;

                return;
            }
        }

        this.hits.push({
            ...hit,
            active: true,
            time: 0,
        });
    }

    update(dt: number) {
        for (let i = 0; i < this.hits.length; i++) {
            this.hits[i].time += dt;
        }
    }

    flush() {
        for (let i = 0; i < this.hits.length; i++) {
            // deactivate hits that cant be accumulated anymore
            if (this.hits[i].time > HitManager.AccTimeMax) {
                this.hits[i].active = false;
            }
        }
    }
}
