class SelectionManager {
    constructor() {
        this.listen();
    }
    isMobile = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    pegs = {
        start: {
            x: 0,
            y: 0,
            height: 3,
            element: document.createElement("div"),
            targetElement: null,
            targetOffset: 0,
            active: false,
        },
        end: {
            x: 0,
            y: 0,
            height: 3,
            element: document.createElement("div"),
            targetElement: null,
            targetOffset: 0,
            active: false,
        }
    };
    pegSelectionRadius = 8;
    highlightDelay = 100; //temp num
    highlightStartRadius = 8; //how far touches can diviate before not highlighting
    container = viewport.container;
    selection = null;
    spanElementList = [];
    listen() {
        if(this.isMobile) {
            this.container.addEventListener('touchstart', this.handleTouchStart.bind(this));
            this.container.addEventListener('touchmove', this.handleTouchMove.bind(this));
            this.container.addEventListener('touchend', this.handleTouchEnd.bind(this));
        } else {
            this.container.addEventListener('mousedown', this.handleTouchStart.bind(this));
            this.container.addEventListener('mousemove', this.handleTouchMove.bind(this));
            this.container.addEventListener('mouseup', this.handleTouchEnd.bind(this));
        }
        this.container.addEventListener("scroll", this.handleScroll.bind(this));
    }
    stopListening() {
        if(this.isMobile) {
            this.container.removeEventListener('touchstart', this.handleTouchStart.bind(this));
            this.container.removeEventListener('touchmove', this.handleTouchMove.bind(this));
            this.container.removeEventListener('touchend', this.handleTouchEnd.bind(this));
        } else {
            this.container.removeEventListener('mousedown', this.handleTouchStart.bind(this));
            this.container.removeEventListener('mousemove', this.handleTouchMove.bind(this));
            this.container.removeEventListener('mouseup', this.handleTouchEnd.bind(this));
        }
        this.container.removeEventListener("scroll", this.handleScroll.bind(this));
    }
    getPosition(e) {
        const touch = e.touches ? e.touches[0] : e;
        //const rect = this.container.getBoundingClientRect();
        return {
            x: touch.clientX,
            y: touch.clientY //+ this.container.scrollTop
        };
    }
    handleTouchStart(event) {
        this.position = this.getPosition(event); 
        this.initialTouch = {...this.position};

        setTimeout(function () {
            if(this.shouldStartHighlighting()) {
                this.startHighlight();
            }
        }.bind(this), this.highlightDelay);
    }
    handleTouchMove(event) {
        this.position = this.getPosition(event); 
        this.updateHighlight();
    }
    handleTouchEnd(event) {
        this.stopHighlight();
    }
    shouldStartHighlighting() {
        return Math.sqrt(Math.pow(this.initialTouch.x - this.position.x, 2) + Math.pow(this.initialTouch.y - this.position.y, 2)) < this.highlightStartRadius;
    }
    sanitizeText(text) {
        // Regular expression to allow only keyboard characters (alphanumeric and basic punctuation)
        return text.replace(/[^a-zA-Z0-9 .,!?'"@#%^&*()\-_=+[\]{};:<>\\/|`~\n]/g, '');
    }
    getAllTextLayerRects() {
        const rects = [];
        const spans = this.container.querySelectorAll('.text-layer > span');

        spans.forEach(span => {
            const boundingRect = span.getBoundingClientRect();
            //translates it backt origin
            //boundingRect.y += this.container.scrollTop;
            //boundingRect.x += this.container.scrollLeft;
            
            rects.push({ element: span, rect: boundingRect, text: this.sanitizeText(span.textContent) });
        });

        return rects;
    }
    findNearestTextLayerRect(point = { x: 0, y: 0 }, spans = this.spanElementList) {
        const rects = spans.map((span) => ({
            rect: span.rect,
            spanElement: span.element
        }));

        const binarySearchY = (rects, point) => {
            let left = 0;
            let right = rects.length - 1;
            while (left <= right) {
                const mid = Math.floor((left + right) / 2);
                const midRect = rects[mid];
                if (midRect.rect.y + midRect.rect.height < point.y) {
                    left = mid + 1; // move down
                } else if (midRect.rect.y > point.y) {
                    right = mid - 1; // move up
                } else {
                    return mid; // exact match found
                }
            }
            return left; // Return the insertion point
        };

        const closestYIndex = binarySearchY(rects, point);

        console.log(closestYIndex)

        // Search for the nearest rectangle considering both x and y coordinates
        let nearestRect = null;
        let minDistance = Infinity;

        // Check rectangles around the closest y-coordinate
        for (let i = Math.max(0, closestYIndex - 5); i < Math.min(rects.length, closestYIndex + 6); i++) {
            const rect = rects[i];
            const dx = Math.max(rect.rect.left - point.x, 0, point.x - (rect.rect.left + rect.rect.width));
            const dy = Math.max(rect.rect.top - point.y, 0, point.y - (rect.rect.top + rect.rect.height));
            const distance = Math.sqrt(dx * dx + dy * dy);

            if (distance < minDistance) {
                minDistance = distance;
                nearestRect = rect;
            }
        }

        return nearestRect ? nearestRect.spanElement : null;
    }

    orderSpanElementList(rects = this.spanElementList) {
        //sorts the rects by their top position
        return rects.sort((a, b) => {
            return a.rect.top - b.rect.top;
        });
    }
    getRelevantTextData(elementReference, point, maxDistance = 10) {
        if (!elementReference || !point) return null;

        const range = document.createRange();
        range.selectNodeContents(elementReference);

        const textContent = elementReference.textContent;
        const words = textContent.split(/\s+/);
        let currentOffset = 0;
        let closestWord = null;
        let minDistance = Infinity;

        function findCharacterOffsetAtPoint(element, x) {
            const range = document.createRange();
            const textNode = element.firstChild;

            if (!textNode || textNode.nodeType !== Node.TEXT_NODE) {
                return 0;
            }

            const textContent = textNode.textContent;
            let left = 0;
            let right = textContent.length;
            let mid;

            // Binary search to find the closest character
            while (left < right) {
                mid = Math.floor((left + right) / 2);
                range.setStart(textNode, 0);
                range.setEnd(textNode, mid);
                const rect = range.getBoundingClientRect();

                if (x > rect.right) {
                    left = mid + 1;
                } else {
                    right = mid;
                }
            }

            return left;
        }

        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            const wordStart = currentOffset;
            const wordEnd = wordStart + word.length;

            range.setStart(elementReference.firstChild, wordStart);
            range.setEnd(elementReference.firstChild, wordEnd);

            const rect = range.getBoundingClientRect();

            // Check if point is inside the rect
            if (point.x >= rect.left && point.x <= rect.right &&
                point.y >= rect.top && point.y <= rect.bottom) {
                return {
                    word: word,
                    startOffset: wordStart,
                    endOffset: wordEnd,
                    selectOffset: findCharacterOffsetAtPoint(elementReference, point.x)
                };
            }

            // Calculate distance to rect
            const dx = Math.max(rect.left - point.x, 0, point.x - rect.right);
            const dy = Math.max(rect.top - point.y, 0, point.y - rect.bottom);
            const distance = Math.sqrt(dx * dx + dy * dy);

            // Update closest word if this word is closer
            if (distance < minDistance) {
                minDistance = distance;
                closestWord = {
                    word: word,
                    startOffset: wordStart,
                    endOffset: wordEnd,
                    distance: distance,
                };
            }

            currentOffset = wordEnd + 1; // +1 for the space
        }

        // Return the closest word if it's within the maxDistance
        if (closestWord && closestWord.distance <= maxDistance) {
            return {
                word: closestWord.word,
                startOffset: closestWord.startOffset,
                endOffset: closestWord.endOffset,
                selectOffset: findCharacterOffsetAtPoint(elementReference, point.x)
            };
        }

        return null; // No word found within the maxDistance
    }

    findCharacterOffset(element, charIndex) {
        if (!element || charIndex < 0 || charIndex >= element.textContent.length + 1) {
            return null;
        }

        const range = document.createRange();
        const textNode = element.firstChild;

        if (textNode.nodeType !== Node.TEXT_NODE) {
            console.error('The first child of the element is not a text node');
            return null;
        }

        range.setStart(textNode, 0);
        range.setEnd(textNode, charIndex);

        const rect = range.getBoundingClientRect();
        const elementRect = element.getBoundingClientRect();

        return rect.right - elementRect.left;
    }

    setRangeEnd(element, offset) {
        offset = Math.max(0, offset);
        let currentOffset = 0;
        let node = element.firstChild;

        while (node) {
            if (node.nodeType === Node.TEXT_NODE) {
                if (currentOffset + node.length >= offset) {
                    this.selection.setEnd(node, offset - currentOffset);
                    return;
                }
                currentOffset += node.length;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                currentOffset += node.textContent.length;
            }
            node = node.nextSibling;
        }
        const lastTextNode = this.getLastTextNode(element);
        if (lastTextNode) {
            this.selection.setEnd(lastTextNode, lastTextNode.length);
        }
    }
    setRangeStart(element, offset) {
        offset = Math.max(0, offset);
        let currentOffset = 0;
        let node = element.firstChild;

        while (node) {
            if (node.nodeType === Node.TEXT_NODE) {
                if (currentOffset + node.length >= offset) {
                    this.selection.setStart(node, offset - currentOffset);
                    return;
                }
                currentOffset += node.length;
            } else if (node.nodeType === Node.ELEMENT_NODE) {
                currentOffset += node.textContent.length;
            }
            node = node.nextSibling;
        }

        const lastTextNode = this.getLastTextNode(element);
        if (lastTextNode) {
            this.selection.setEnd(lastTextNode, lastTextNode.length);
        }
    }
    getLastTextNode(element) {
        if (element.nodeType === Node.TEXT_NODE) return element;
        const children = element.childNodes;
        for (let i = children.length - 1; i >= 0; i--) {
            const lastTextNode = this.getLastTextNode(children[i]);
            if (lastTextNode) return lastTextNode;
        }
        return null;
    }

    setInitialPegPositions(elementReference, point = this.position) {
        if (!elementReference || !point) return;

        const rect = elementReference.getBoundingClientRect();
        const relevantTextData = this.getRelevantTextData(elementReference, point);

        if (relevantTextData) {
            this.pegs.start.x = rect.left + this.findCharacterOffset(elementReference, this.isMobile ? relevantTextData.startOffset - 1 : relevantTextData.selectOffset);
            this.pegs.start.y = rect.top;
            this.pegs.start.height = rect.height;
            this.pegs.start.targetElement = elementReference;
            this.pegs.start.targetOffset = this.isMobile ? relevantTextData.startOffset - 1 : relevantTextData.selectOffset;
            this.setRangeStart(this.pegs.start.targetElement, this.pegs.start.targetOffset);

            this.pegs.end.x = rect.left + this.findCharacterOffset(elementReference, this.isMobile ? relevantTextData.endOffset - 1 : relevantTextData.selectOffset);
            this.pegs.end.y = rect.top;
            this.pegs.end.height = rect.height;
            this.pegs.end.targetElement = elementReference;
            this.pegs.end.targetOffset = this.isMobile ? relevantTextData.startOffset - 1 : relevantTextData.selectOffset;
            this.pegs.end.active = true;
            this.setRangeEnd(this.pegs.end.targetElement, this.pegs.end.targetOffset );
        }
    }
    
    startHighlight() {
        this.selection = document.createRange();
        this.initialScroll = {
            x: this.container.scrollLeft,
            y: this.container.scrollTop,
    
        }

        //temporary, make it so it only changes on pdf change
        this.spanElementList = this.getAllTextLayerRects();
        this.orderSpanElementList();

        console.log(this.position, [...this.spanElementList])

        const initialElementTouched = this.findNearestTextLayerRect(this.initialTouch);
        this.setInitialPegPositions(initialElementTouched);

        this.renderHighlight();
    };
    
    updateHighlight() {
        const activePeg = [this.pegs.start, this.pegs.end].find(peg => peg.active);

        if(!activePeg) return;
        
        activePeg.x = this.position.x;
        activePeg.y = this.position.y;
        
        const activePegElement = this.findNearestTextLayerRect({
            x: activePeg.x,
            y: activePeg.y
        });

        const rect = activePegElement.getBoundingClientRect();
        const relevantTextData = this.getRelevantTextData(activePegElement, {
             x: activePeg.x,
             y: activePeg.y
         });

        if(!relevantTextData) return;

        activePeg.x = rect.left + this.findCharacterOffset(activePegElement, relevantTextData.selectOffset);
        activePeg.y = rect.top;
        activePeg.height = rect.height;
        activePeg.targetElement = activePegElement;
        activePeg.targetOffset = relevantTextData.selectOffset;
        this.setRangeEnd(activePeg.targetElement, activePeg.targetOffset);

        this.renderHighlight();
    }

    stopHighlight() {
        this.pegs.start.active = false;
        this.pegs.end.active = false;
    }
    clearHighlight() {
        this.selection.removeAllRanges();
        this.renderHighlight();
    }

    getSpansInSelection(selectionRange) {
        const list = this.spanElementList.map((span) => span.element);
        const startNode = selectionRange.startContainer;
        const endNode = selectionRange.endContainer;

        // Find the index of the first and last span in the selection
        const startIndex = this.binarySearch(startNode);
        const endIndex = this.binarySearch(endNode, startIndex);

        // Get all spans between start and end
        const spansInSelection = list.slice(startIndex, endIndex + 1);

        // Filter spans to ensure they're actually in the selection
        return spansInSelection.filter(span => selectionRange.intersectsNode(span));
    }

    binarySearch(node, startFrom = 0) {
        let low = startFrom;
        let high = this.spanElementList.length - 1;

        while (low <= high) {
            const mid = Math.floor((low + high) / 2);
            const midSpan = this.spanElementList[mid];

            if (midSpan.element.contains(node)) {
                return mid;
            }

            const comparison = this.compareNodePosition(midSpan.element, node);
            if (comparison < 0) {
                low = mid + 1;
            } else {
                high = mid - 1;
            }
        }

        return low; // Return insertion point if not found
    }

    compareNodePosition(nodeA, nodeB) {
        const position = nodeA.compareDocumentPosition(nodeB);
        if (position & Node.DOCUMENT_POSITION_FOLLOWING) return -1;
        if (position & Node.DOCUMENT_POSITION_PRECEDING) return 1;
        return 0;
    }
    
    getRects(selectionRange) {
        const spansInSelection = this.getSpansInSelection(selectionRange);

        return spansInSelection.flatMap(span => {
            const spanRange = document.createRange();
            spanRange.selectNodeContents(span);

            if (span === selectionRange.startContainer.parentNode) {
                spanRange.setStart(selectionRange.startContainer, selectionRange.startOffset);
            }
            if (span === selectionRange.endContainer.parentNode) {
                spanRange.setEnd(selectionRange.endContainer, selectionRange.endOffset);
            }

            return this.mergeRects(Array.from(spanRange.getClientRects()));
        });
    }
    
    mergeRects(rects) {
        if (!rects.length) return [];

        let merged = [...rects];
        let changed;

        do {
            changed = false;
            const newMerged = [];

            for (let i = 0; i < merged.length; i++) {
                let current = merged[i];

                for (let j = i + 1; j < merged.length; j++) {
                    if (this.rectsOverlapOrTouch(current, merged[j])) {
                        current = this.mergeTwoRects(current, merged[j]);
                        merged.splice(j, 1);
                        j--;
                        changed = true;
                    }
                }

                newMerged.push(current);
            }

            merged = newMerged;
        } while (changed);

        return merged;
    }

    rectsOverlapOrTouch(rect1, rect2) {
        return !(
            rect2.left > rect1.right + this.highlightTolerance.x ||
            rect2.right < rect1.left - this.highlightTolerance.x ||
            rect2.top > rect1.bottom + this.highlightTolerance.y ||
            rect2.bottom < rect1.top - this.highlightTolerance.y
        );
    }

    mergeTwoRects(rect1, rect2) {
        return {
            left: Math.min(rect1.left, rect2.left),
            top: Math.min(rect1.top, rect2.top),
            right: Math.max(rect1.right, rect2.right),
            bottom: Math.max(rect1.bottom, rect2.bottom),
            width: Math.max(rect1.right, rect2.right) - Math.min(rect1.left, rect2.left),
            height: Math.max(rect1.bottom, rect2.bottom) - Math.min(rect1.top, rect2.top)
        };
    }

    handleScroll(event) {
        const selectionOverlay = this.container.querySelector('.selection-overlay');

        if(!selectionOverlay) return;

        const children = selectionOverlay.children;

        for(let child of children) {
            child.style.transform = `translate(${-this.container.scrollLeft+this.initialScroll.x}px, ${-this.container.scrollTop+this.initialScroll.y}px)`;
        }
    }
    
    renderHighlight() {
        if(!this.selection) return;

        const rectsInSelection = this.getRects(this.selection);

        let selectionOverlay = this.container.querySelector('.selection-overlay');
        if(!selectionOverlay) {
            selectionOverlay = document.createElement('div');
            selectionOverlay.classList.add('selection-overlay');
            this.container.appendChild(selectionOverlay);
        }
        
        selectionOverlay.innerHTML = '';

        for(let rect of rectsInSelection) {
            const highlight = document.createElement('div');
            highlight.classList.add('highlight');
            highlight.style.left = `${rect.left}px`;
            highlight.style.top = `${rect.top}px`;
            highlight.style.width = `${rect.width}px`;
            highlight.style.height = `${rect.height}px`;
            selectionOverlay.appendChild(highlight);
        }

        this.renderPegs(selectionOverlay);
        
    }
    renderPegs(container) {
        if(!container) return;

        this.pegs.start.element.className = "peg-selection start";
        this.pegs.end.element.className = "peg-selection end";

        this.pegs.start.element.style.left = `${this.pegs.start.x}px`;
        this.pegs.start.element.style.top = `${this.pegs.start.y}px`;
        this.pegs.start.element.style.height = `${this.pegs.start.height}px`;
        
        this.pegs.end.element.style.left = `${this.pegs.end.x}px`;
        this.pegs.end.element.style.top = `${this.pegs.end.y}px`;
        this.pegs.end.element.style.height = `${this.pegs.end.height}px`;

        container.appendChild(this.pegs.start.element);
        container.appendChild(this.pegs.end.element);

        this.handleScroll();
    }
}

const selectionManager = new SelectionManager();