export class PopUpModal {
    container: HTMLDivElement;
    content: HTMLDivElement;

    constructor(id: string) {
        const container = document.getElementById(id) as HTMLDivElement;
        this.container = container;
        this.content = container.querySelector(".popup-inner-content") as HTMLDivElement;

        const closeBtn = container.querySelector(".close-popup-btn") as HTMLDivElement;
        closeBtn.addEventListener("click", () => {
            this.close();
        });
    }

    close() {
        this.container.style.display = "none";
    }

    open() {
        this.container.style.display = "block";
    }
}
