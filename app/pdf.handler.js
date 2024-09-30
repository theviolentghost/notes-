pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/2.9.359/pdf.worker.min.js';

document.getElementById("file-input").addEventListener('change', async (event) => {
    const file = event.target.files[0];
    if (file.type !== 'application/pdf') {
        console.error('Not a PDF file!');
        return;
    }

    pdfHandler = new PDFHandler(file);
    await pdfHandler.read();
    pdfHandler.display();
});


class PDFHandler {
    file = null;
    data = null; //data of pdf
    target = document.getElementById("pdf-viewer");
    constructor(file) {
        this.file = file;
    }
    async read() {
        try {
            const arrayBuffer = await this.file.arrayBuffer();
            const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
            this.data = {
                pdf,
                pages: [],
            };
        } catch (error) {
            console.error('Error loading PDF:', error);
            throw error;
        }
    }
    async display(target = this.target) {
        if (!this.data || !this.data.pdf) {
            throw new Error('PDF not loaded. Call load() first.');
        }
        if (!target) {
            throw new Error(`no target`);
        }

        target.innerHTML = '';

        for (let pageNum = 1; pageNum <= this.data.pdf.numPages; pageNum++) {
            const page = await this.data.pdf.getPage(pageNum);
            const scale = 1.5;
            const viewport = page.getViewport({ scale });

            const pageDiv = document.createElement('div');
            pageDiv.className = 'PDF';
            pageDiv.style.width = `${viewport.width}px`;
            pageDiv.style.height = `${viewport.height}px`;

            const canvas = document.createElement('canvas');
            canvas.className = "PDF-canvas";
            const context = canvas.getContext('2d');
            canvas.height = viewport.height;
            canvas.width = viewport.width;

            const drawingCanvas = document.createElement('canvas');
            drawingCanvas.className = 'drawing-canvas';
            drawingCanvas.height = viewport.height;
            drawingCanvas.width = viewport.width;

            const renderContext = {
                canvasContext: context,
                viewport: viewport
            };

            await page.render(renderContext);

            const textLayer = document.createElement('div');
            textLayer.className = 'text-layer';

            const textContent = await page.getTextContent();
            pdfjsLib.renderTextLayer({
                textContent: textContent,
                container: textLayer,
                viewport: viewport,
                textDivs: []
            });

            pageDiv.appendChild(canvas);
            pageDiv.appendChild(drawingCanvas);
            pageDiv.appendChild(textLayer);
            target.appendChild(pageDiv);

            this.data.pages.push({
                pageNum,
                pageDiv,
                canvas,
                drawingCanvas,
                textLayer,
                viewport,
                textContent
            })
        }
    }
    getPageData(pageNum) {
        return this.data.pages.find(page => page.pageNum === pageNum);
    }
}