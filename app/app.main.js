window.onload = () => {
    document.querySelector('.loading.full').classList.add('done');
};

const app = {
    domain: "https://1f216d81-fc74-4cab-a139-9511d4de6959-00-25jisvkkl6kdo.worf.replit.dev",
    version: "0.0.0",
    versionHandling: "dynamic",
    isOnline: navigator.onLine,
    eventListenerInternetStatus: function() {
        this.isOnline = navigator.onLine;
        //alert("Network status changed!");
    },

    initializeListeners: function() {
        window.addEventListener('online', this.eventListenerInternetStatus.bind(this));
        window.addEventListener('offline', this.eventListenerInternetStatus.bind(this));
    },

    register: function() {
        if ('serviceWorker' in navigator) {
            navigator.serviceWorker.register(`/app/worker.${app.versionHandling}.js`)
                .then(registration => {
                    console.log('Service Worker registered');
                    console.log('Service Worker registered with scope:', registration.scope);
                    this.serviceWorker = registration;
                })
                .catch(error => console.log('Service Worker registration failed:', error));
        }
    },

    initialize: function() {
        this.initializeListeners();
        this.register();
    }
};
let pdfHandler = null;
const tools = [new Pen()];
let selectedTool = tools[0];

function selectTool(name) {
    for (let i = 0; i < tools.length; i++) {
        if (tools[i].name == name) {
            selectedTool = tools[i];
            break;
        }
    }
}

app.initialize();