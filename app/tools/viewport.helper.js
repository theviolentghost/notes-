class ViewportManager {
    container = null;
    constructor(container = window) {
        this.container = container;
    }
}

const viewport = new ViewportManager(document.getElementById("pdf-viewer"));