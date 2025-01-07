import { ClientConfig } from "./config";

interface GameSettings {
    server: string;
    name: string;
    globalVolume: number;
    showFPS: boolean;
    showPing: boolean;
}

export type SettingKey = keyof GameSettings;

const defaultSettings: GameSettings = {
    server: ClientConfig.defaultServer,
    name: "",
    showFPS: false,
    showPing: false,
    globalVolume: 1,
};

class SettingsManager {
    readonly settingsKey = "boom2d_settings";
    readonly storedSettings: Partial<GameSettings>;

    readonly listeners: Partial<
        Record<SettingKey, Array<(value: GameSettings[SettingKey]) => void>>
    > = {};

    constructor() {
        this.storedSettings = JSON.parse(localStorage.getItem(this.settingsKey) ?? "{}");
    }

    writeToLocalStorage() {
        localStorage.setItem(this.settingsKey, JSON.stringify(this.storedSettings));
    }

    get<Key extends SettingKey>(key: Key): GameSettings[Key] {
        return this.storedSettings[key] ?? defaultSettings[key];
    }

    set<Key extends SettingKey>(key: Key, value: GameSettings[Key]) {
        if (value === this.storedSettings[key]) return;

        this.storedSettings[key] = value;
        this.writeToLocalStorage();

        const listeners = this.listeners[key];
        if (listeners) {
            for (let i = 0; i < listeners.length; i++) {
                listeners[i](value);
            }
        }
    }

    addListener<Key extends SettingKey>(
        key: Key,
        cb: (value: GameSettings[Key]) => void,
    ) {
        let arr: this["listeners"][Key] = this.listeners[key] ?? [];
        arr.push(cb as (value: GameSettings[SettingKey]) => void);
        this.listeners[key] = arr;
    }
}

export const settings = new SettingsManager();
