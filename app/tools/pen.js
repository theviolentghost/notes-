class Pen extends Tool {
    name = "pen";
    lastPosition = null;
    isDown = false;
    thickness = 5;
    color = "rgba(255,0,0,1)";
    points = [];

    constructor() {
        super();
        this.listen();
    }

    shouldPreventDefault(event) {
        if(this.isMobile && event?.touches) {
            return event.touches.length == 1;
        }
    }

    down(event) {
        if(!this.preventDefault(event)) return;

        this.isDown = true;
        this.getCurrentPageContextByTarget(event.target);
        const point = this.getPosition(event);
        this.setBufferCanvasSize();
        this.revealBufferCanvas();
        this.points = [point];
        this.lastPosition = point;
    }

    move(event) {
        if (!this.isDown) return;
        if(!this.preventDefault(event)) {
            this.clearBufferCanvas();
            this.hideBufferCanvas();
            this.up();
            return;
        }

        const point = this.getPosition(event);
        this.points.push(point);
        this.drawToBuffer();
        this.lastPosition = point;
    }

    up(event) {
        if(!this.isDown) return;
        this.isDown = false;
        this.lastPosition = null;
        this.drawToBuffer();
        this.bufferToNoteCanvas();
        this.points = [];
    }

    drawToBuffer(normalizedToBuffer = true) {
        if (!Tool.bufferCtx) return;

        Tool.bufferCtx.clearRect(0, 0, Tool.bufferCanvas.width, Tool.bufferCanvas.height);

        if (this.points.length < 2) return;

        const yOffset = normalizedToBuffer && pdfHandler && pdfHandler.target ? -pdfHandler.target.scrollTop : 0;

        Tool.bufferCtx.strokeStyle = this.color;
        Tool.bufferCtx.lineWidth = this.thickness;
        Tool.bufferCtx.lineCap = 'round';
        Tool.bufferCtx.lineJoin = 'round';

        Tool.bufferCtx.beginPath();
        Tool.bufferCtx.moveTo(this.points[0].x, this.points[0].y + yOffset);

        for (let i = 1; i < this.points.length - 2; i++) {
            const xc = (this.points[i].x + this.points[i + 1].x) / 2;
            const yc = (this.points[i].y + this.points[i + 1].y) / 2 + yOffset;
            Tool.bufferCtx.quadraticCurveTo(this.points[i].x, this.points[i].y + yOffset, xc, yc);
        }

        // For the last two points
        if (this.points.length > 2) {
            const lastPoint = this.points[this.points.length - 1];
            const secondLastPoint = this.points[this.points.length - 2];
            Tool.bufferCtx.quadraticCurveTo(
                secondLastPoint.x, 
                secondLastPoint.y + yOffset, 
                lastPoint.x, 
                lastPoint.y + yOffset
            );
        }

        Tool.bufferCtx.stroke();
    }

    bufferToNoteCanvas() {
        if(!this.ctx || !pdfHandler || !pdfHandler.target) return;
        this.ctx.drawImage(Tool.bufferCanvas, 0, pdfHandler.target.scrollTop);
        this.clearBufferCanvas();
        this.hideBufferCanvas();
    }
}