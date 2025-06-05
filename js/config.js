// config.js

// Definizione della base URL del backend, disponibile globalmente
window.BACKEND_BASE_URL = 'https://google-api-backend-biu7.onrender.com';

// Inizializzazione della cache globale per le Promise attive di prefetching
// Viene creata solo se non esiste già, prevenendo sovrascritture accidentali.
if (!window.activePrefetchPromises) {
    window.activePrefetchPromises = {};
}

// Puoi aggiungere altre variabili globali qui se necessario
// window.API_VERSION = 'v1';