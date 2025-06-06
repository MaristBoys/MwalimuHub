// prefetch.js

/**
 * Avvia le chiamate di pre-fetching per i dati specificati RISVEGLIO SERVER BACKEND
 * Utilizza la cache globale `window.activePrefetchPromises` (inizializzata in config.js)
 * per evitare richieste duplicate e memorizza i dati recuperati in `sessionStorage`.
 * Include la misurazione del tempo per ogni singola chiamata fetch.
 */
async function  DataForNextPages() {
    // Recupera la base URL del backend dalla variabile globale definita in config.js.
    // È garantito che sia disponibile se config.js è caricato prima di questo script.
    const BACKEND_BASE_URL = window.BACKEND_BASE_URL; 

    // Definisci tutti gli endpoint che desideri pre-caricare.
    // Ogni oggetto specifica l'endpoint API e la chiave per memorizzare i dati in sessionStorage.
    const endpointsToPrefetch = [
        // Dati per i dropdown del form
        { endpoint: 'drive/years', storageKey: 'prefetchedYears' },
        { endpoint: 'sheets/subjects', storageKey: 'prefetchedSubjects' },
        { endpoint: 'sheets/forms', storageKey: 'prefetchedForms' },
        { endpoint: 'sheets/rooms', storageKey: 'prefetchedRooms' },
        { endpoint: 'sheets/types', storageKey: 'prefetchedTypes' },
        // Dati per la lista di file
        { endpoint: 'drive/files-list', storageKey: 'prefetchedFilesList' } // Sostituisci 'drive/files-list' con il tuo endpoint reale
    ];

    // Itera su ogni endpoint per avviare la chiamata di pre-fetching
    endpointsToPrefetch.forEach(({ endpoint, storageKey }) => {
        const fullUrl = `${BACKEND_BASE_URL}/api/${endpoint}`;

        // Controlla se una Promise per questo endpoint è già in corso nella cache globale.
        // Se sì, salta per evitare richieste duplicate.
        if (window.activePrefetchPromises[storageKey]) {
            console.log(`[Prefetching - ${endpoint}] Richiesta già in corso o completata in questa sessione. Saltato.`);
            return;
        }

        const startTime = performance.now(); // Inizio misurazione tempo per questa fetch

        // Avvia la chiamata `fetch` e gestisci la Promise.
        const prefetchPromise = fetch(fullUrl)
            .then(response => {
                const endTime = performance.now(); // Fine misurazione tempo
                const duration = endTime - startTime;

                // Controlla se la risposta HTTP è OK (status 200-299).
                if (!response.ok) {
                    console.warn(`[Prefetching - ${endpoint}] Errore HTTP! Stato: ${response.status}. Tempo impiegato: ${duration.toFixed(2)} ms.`);
                    throw new Error(`[Prefetching] Errore HTTP per ${endpoint}! Stato: ${response.status}`);
                }
                // Parsa la risposta JSON.
                console.log(`[Prefetching - ${endpoint}] Successo! Tempo impiegato: ${duration.toFixed(2)} ms.`);
                return response.json();
            })
            .then(data => {
                // Se la Promise si risolve con successo, memorizza i dati in sessionStorage.
                sessionStorage.setItem(storageKey, JSON.stringify(data));
                console.log(`[Prefetching - ${endpoint}] Dati memorizzati in sessionStorage.`);
                return data; // Ritorna i dati risolti per chiunque attenda questa Promise.
            })
            .catch(error => {
                // Gestisce eventuali errori di rete o errori HTTP non-OK.
                // Il tempo di durata qui è già stato loggato nel blocco .then precedente se c'è stato un errore HTTP.
                // Se l'errore è di rete (es. fetch fallita prima della risposta), il tempo verrà calcolato qui.
                if (!error.message.includes('HTTP error')) { // Evita doppio log se errore HTTP
                    const endTime = performance.now(); // Fine misurazione tempo per errore di rete
                    const duration = endTime - startTime;
                    console.error(`[Prefetching - ${endpoint}] Errore di rete:`, error);
                    console.log(`[Prefetching - ${endpoint}] Chiamata fallita (errore di rete). Tempo impiegato: ${duration.toFixed(2)} ms.`);
                }
                throw error; // Rilancia l'errore per propagarlo se un altro script sta attendendo questa Promise.
            })
            .finally(() => {
                // Rimuove la Promise dalla cache globale una volta che è stata risolta o rigettata.
                delete window.activePrefetchPromises[storageKey];
            });

        // Memorizza la Promise nella cache globale. Questo è il cuore della deduplicazione.
        window.activePrefetchPromises[storageKey] = prefetchPromise;
    });
}

// Avvia la funzione di pre-fetching quando il DOM è completamente caricato.
// Un piccolo ritardo (es. 500ms) è utile per non interferire con il rendering iniziale della homepage.
document.addEventListener('DOMContentLoaded', () => {
    // Verifica che window.BACKEND_BASE_URL sia disponibile prima di avviare le chiamate.
    // Questo è un controllo di sicurezza, dato che config.js dovrebbe essere caricato prima.
    if (window.BACKEND_BASE_URL) {
        setTimeout(prefetchDataForNextPages, 500); 
    } else {
        console.error("ERRORE: window.BACKEND_BASE_URL non è definito. Assicurati che config.js sia caricato PRIMA di prefetch.js.");
    }
});