class Tool {
    isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    name = "#-tool-";
    ctx = null;
    currentCanvas = null;
    static bufferCanvas = document.createElement("canvas");
    static bufferCtx = Tool.bufferCanvas.getContext("2d");
    relevantPages = [];
    highlightTolerance = {
        x: 12,
        y: -3.5,
    };
    history = [];
    historyIndex = -1;
    constructor() {
        Tool.bufferCanvas.style.visibility = "hidden";
        this.setBufferCanvasSize();
    }

    calculateRelevantPages() {
        this.relevantPages = [];
        if(!pdfHandler || !pdfHandler.target) return [];

        const height = pdfHandler.target.clientHeight;

        for(let i = 0; i < pdfHandler.data.pages.length; i++) {
            const page = pdfHandler.data.pages[i];
            const pageRect = page.drawingCanvas.getBoundingClientRect();
            const pageTop = pageRect.top;
            const pageBottom = pageRect.bottom;
            page.rect = pageRect;

            if(
                (pageTop >= 0 && pageTop <= height) || 
                (pageBottom >= 0 && pageBottom <= height) ||
                (pageTop <= 0 && pageBottom >= height)
            ) {
                this.relevantPages.push(page);
            }
            else if(pageTop > height) break;
        }
        
        return this.relevantPages;
    }

    setBufferCanvasSize(width, height) {
        if((!pdfHandler || !pdfHandler.target) || (width && height)) return;

        this.calculateRelevantPages();
        
        const maxRelevantPageWidth = Math.min(pdfHandler.target.clientWidth, Math.max(...this.relevantPages.map((page) => page.rect.width)));
        const maxRelevantPageHeight = Math.min(pdfHandler.target.clientHeight,this.relevantPages.reduce((sum, page) => sum + page.rect.height, 0));
        height = height || maxRelevantPageHeight;
        width = width || maxRelevantPageWidth;

        Tool.bufferCanvas.width = width;
        Tool.bufferCanvas.height = height;
    }
    revealBufferCanvas() {
        if(!pdfHandler || !pdfHandler.target) return;

        if (Tool.bufferCanvas.parentElement) {
            Tool.bufferCanvas.parentElement.removeChild(Tool.bufferCanvas);
        }
        
        const rect = pdfHandler.target.getBoundingClientRect();
        Tool.bufferCanvas.style.visibility = "visible";
        Tool.bufferCanvas.style.position = "fixed";
        Tool.bufferCanvas.style.zIndex = "999999999";
        Tool.bufferCanvas.style.top = `${rect.top}px`;
        Tool.bufferCanvas.style.justifySelf = "center";
        Tool.bufferCanvas.style.alignSelf = "center";

        pdfHandler.target.appendChild(Tool.bufferCanvas);
    }
    clearBufferCanvas() {
        Tool.bufferCtx.clearRect(0, 0, Tool.bufferCanvas.width, Tool.bufferCanvas.height);
    }
    hideBufferCanvas() {
        if(!pdfHandler || !pdfHandler.target) return;

        if (Tool.bufferCanvas.parentElement) {
            Tool.bufferCanvas.parentElement.removeChild(Tool.bufferCanvas);
        }

        Tool.bufferCanvas.style.visibility = "hidden";
    }

    getPosition(event) {
        if(!this.currentCanvas) return {x: -1, y: -1};
        const rect = this.currentCanvas.getBoundingClientRect();
        if (event.touches && event.touches.length > 0) {
            const touch = event.touches[0];
            return { x: touch.clientX - rect.left, y: touch.clientY - rect.top };
        } else {
            return { x: event.clientX - rect.left, y: event.clientY - rect.top };
        }
    }

    down(event) {}
    move(event) {}
    up(event) {}

    listen(target = (viewport.container || window)) {
        if (!target) return;

        const optionsPassive = { passive: true };
        const optionsNonPassive = { passive: false };

        if (this.isMobile) {
            target.addEventListener('touchstart', this.down.bind(this), optionsPassive);
            target.addEventListener('touchmove', this.move.bind(this), optionsNonPassive);
            target.addEventListener('touchend', this.up.bind(this), optionsPassive);
            target.addEventListener("touchcancel", this.up.bind(this), optionsPassive);
        } else {
            target.addEventListener('mousedown', this.down.bind(this), optionsPassive);
            target.addEventListener('mousemove', this.move.bind(this), optionsNonPassive);
            target.addEventListener('mouseup', this.up.bind(this), optionsPassive);
        }
    }

    stopListening(target = window) {
        if (!target) return;

        if (this.isMobile) {
            target.removeEventListener('touchstart', this.down.bind(this));
            target.removeEventListener('touchmove', this.move.bind(this));
            target.removeEventListener('touchend', this.up.bind(this));
            target.removeEventListener("touchcancel", this.up.bind(this));
        } else {
            target.removeEventListener("mousedown", this.down.bind(this));
            target.removeEventListener("mousemove", this.move.bind(this));
            target.removeEventListener("mouseup", this.up.bind(this));
        }
    }

    select() {}
    diselect() {}
    draw() {}
    undo() {}
    redo() {}
    underline() { return 0; } //returns 0 if it should display as normal highlight, 1 if nothing should be displayed
    underlineConfirm() { return 0; } //returns 0 if highlight should remain selected, 1 for instant highlight cancel

    getCurrentPageContextByPage(pageNumber) {
        // to implement
    }

    getCurrentPageContextByTarget(eventTarget, override = true) {
        if (!eventTarget) return;
        let depth = 16;
        while (eventTarget && eventTarget?.className !== "PDF" && depth > 0) {
            depth--;
            eventTarget = eventTarget.parentElement;
        }
        if (!eventTarget) return;

        this.currentCanvas = eventTarget.querySelector(".drawing-canvas");
        return this.getContext(this.currentCanvas, override);
    }

    getContext(canvas, override = true) {
        if (!canvas || canvas.nodeName.toLowerCase() !== "canvas") return null;
        const context = canvas.getContext("2d");
        if (override) this.ctx = context;
        return context;
    }
    shouldPreventDefault(event) {
        return false;
    }
    preventDefault(event) {
        if(this.shouldPreventDefault(event)) {
            event.preventDefault();
            return true;
        }
        return false;
    }
}