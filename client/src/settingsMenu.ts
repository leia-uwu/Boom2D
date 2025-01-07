import { Helpers } from "./helpers";
import type { App } from "./main";
import { type SettingKey, settings } from "./settings";
import { PopUpModal } from "./uiHelpers";

enum SettingType {
    Slider,
    CheckBox,
}

interface SliderOptions {
    type: SettingType.Slider;
    min: number;
    max: number;
    step: number;
}

interface CheckBoxOptions {
    type: SettingType.CheckBox;
}

type SettingOption = SliderOptions | CheckBoxOptions;

type SettingData = {
    label: string;
    settingKey: SettingKey;
    type: SettingType;
} & SettingOption;

const SettingsData: Array<SettingData> = [
    {
        label: "Global Volume",
        settingKey: "globalVolume",
        type: SettingType.Slider,
        min: 0,
        max: 1,
        step: 0.1,
    },
    {
        label: "Show FPS",
        settingKey: "showFPS",
        type: SettingType.CheckBox,
    },
    {
        label: "Show Ping",
        settingKey: "showPing",
        type: SettingType.CheckBox,
    },
];

export class SettingsMenu extends PopUpModal {
    constructor(public app: App) {
        super("settings-menu");

        Helpers.getElem<HTMLButtonElement>("#settings-btn").addEventListener(
            "click",
            () => {
                this.open();
            },
        );

        for (const settingData of SettingsData) {
            const container = this.createSetting(settingData);
            this.content.appendChild(container);
        }
    }

    createSetting(data: SettingData) {
        const container = document.createElement("div");
        container.classList.add("setting-item");

        const label = document.createElement("span");
        label.innerHTML = data.label;
        label.classList.add("setting-label");

        container.appendChild(label);
        const inputContainer = document.createElement("span");
        inputContainer.classList.add("setting-input");
        container.appendChild(inputContainer);

        let settingDom: HTMLElement | undefined = undefined;
        switch (data.type) {
            case SettingType.Slider:
                settingDom = this.createSlider(
                    data.settingKey,
                    data.min,
                    data.max,
                    data.step,
                );
                break;
            case SettingType.CheckBox:
                settingDom = this.createCheckBox(data.settingKey);
                break;
        }
        if (settingDom) {
            inputContainer.appendChild(settingDom);
        }

        return container;
    }

    createSlider(settingKey: SettingKey, min: number, max: number, step: number) {
        const container = document.createElement("span");

        const label = document.createElement("span");
        container.appendChild(label);
        label.classList.add("range-input-label");

        const slider = document.createElement("input");
        container.appendChild(slider);
        slider.type = "range";
        slider.min = min.toString();
        slider.max = max.toString();
        slider.step = step.toString();

        const value = settings.get(settingKey).toString();
        slider.value = value;
        label.innerText = value;

        slider.addEventListener("input", () => {
            settings.set(settingKey, parseFloat(slider.value));
            label.innerText = slider.value;
        });

        settings.addListener(settingKey, (value) => {
            slider.value = value.toString();
            label.innerText = value.toString();
        });

        return container;
    }

    createCheckBox(settingKey: SettingKey) {
        const container = document.createElement("span");

        const checkBox = document.createElement("input");
        container.appendChild(checkBox);
        checkBox.type = "checkbox";

        const value = settings.get(settingKey) as boolean;
        checkBox.checked = value;

        checkBox.addEventListener("input", () => {
            settings.set(settingKey, checkBox.checked);
        });

        settings.addListener(settingKey, (value) => {
            checkBox.checked = value as boolean;
        });

        return container;
    }
}
