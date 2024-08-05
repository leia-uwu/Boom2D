import type { KillPacket } from "../../../../common/src/packets/killPacket";
import { LeaderBoardUi } from "./leaderBoardUi";
import { MsgFeed } from "./msgFeed";
import { UiStyle } from "./uiHelpers";

export class KillFeedUi extends MsgFeed {
    init() {}

    resize(width: number, _height: number) {
        this.x =
            width -
            LeaderBoardUi.Width -
            UiStyle.margin * 2 -
            UiStyle.panels.strokeWidth * 2;
        this.y = UiStyle.margin;
    }

    addMsg(packet: KillPacket, nameCache: Map<number, string>, activePlayerId: number) {
        const killedName = nameCache.get(packet.killedId)!;
        const killerName = nameCache.get(packet.killerId)!;

        let color = 0x333333;
        if (packet.killerId === activePlayerId) {
            color = 0x00aaff;
        }
        if (packet.killedId === activePlayerId) {
            color = 0xff3131;
        }

        this._addMsg(`${killedName} was killed by ${killerName}`, color, true);
    }
}
