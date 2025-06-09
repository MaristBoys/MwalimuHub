// js/prefetch.js
import { CACHE_DURATION_MS } from '/MwalimuHub/js/utils.js';

const activeFetches = new Map(); // Mappa per tenere traccia delle fetch attive, per le richieste di file archiviati

/**
 * Recupera e cache i dati dei dropdown dal backend.
 * I dati vengono memorizzati in localStorage.
 * @returns {Promise<Object|null>} L'oggetto dati recuperato, o null se si è verificato un errore.
 */
export async function fetchAndCacheDropdownData() {
    console.log('Inizio fetching dati dropdown per localStorage...');
    const fetchStartTime = performance.now();

    const endpoints = {
        years: 'drive/years',
        subjects: 'sheets/subjects',
        forms: 'sheets/forms',
        rooms: 'sheets/rooms',
        documentTypes: 'sheets/types'
    };

    const fetchPromises = [];
    const fetchedData = {};

    for (const key in endpoints) {
        // Usa window.BACKEND_BASE_URL definito in config.js
        const endpointUrl = `${window.BACKEND_BASE_URL}/api/${endpoints[key]}`;
        const itemFetchStartTime = performance.now();

        const promise = fetch(endpointUrl)
            .then(response => {
                if (!response.ok) {
                    throw new Error(`HTTP error! status: ${response.status}`);
                }
                return response.json();
            })
            .then(data => {
                fetchedData[key] = data;
                console.log(`Dati per ${key} pre-caricati con successo in ${(performance.now() - itemFetchStartTime).toFixed(2)} ms.`);
            })
            .catch(error => {
                console.error(`Errore durante il pre-fetching di ${key} da ${endpointUrl}:`, error);
                fetchedData[key] = null;
            });
        fetchPromises.push(promise);
    }

    try {
        await Promise.all(fetchPromises);
        localStorage.setItem('dropdownData', JSON.stringify(fetchedData));
        localStorage.setItem('dropdownDataTimestamp', Date.now().toString());
        const fetchEndTime = performance.now();
        console.log(`Pre-fetching di TUTTI i dati dropdown completato e salvato in localStorage in ${(fetchEndTime - fetchStartTime).toFixed(2)} ms.`);
        return fetchedData;
    } catch (error) {
        console.error('Errore critico durante il pre-fetching complessivo dei dati dropdown:', error);
        return null;
    }
}

/**
 * Recupera e cache i dati dei file archiviati dal backend, supportando richieste POST con un body.
 * @param {string} dataKey - La chiave con cui i dati verranno memorizzati in localStorage.
 * @param {string} endpointPath - Il percorso dell'endpoint API (es. 'drive/list').
 * @param {object} [postBody=null] - Oggetto JavaScript da inviare come corpo della richiesta POST. Se null, la richiesta è GET.
 * @param {number} [ttl=CACHE_DURATION_MS] - Tempo di vita per la cache in millisecondi.
 * @returns {Promise<Object|Array|null>} I dati recuperati, o null se si è verificato un errore o la cache non è valida.
 */
export async function fetchAndCacheArchivedFiles(dataKey, endpointPath, postBody = null, ttl = CACHE_DURATION_MS) { // <--- RINOMINATA QUI
    console.log(`Inizio fetching e caching per ${dataKey} (Archived Files)...`); //
    const fetchStartTime = performance.now(); //
    const endpointUrl = `${window.BACKEND_BASE_URL}/api/${endpointPath}`; //

    // 1. Controlla se c'è già una fetch attiva per questa chiave
    if (activeFetches.has(dataKey)) {
        console.log(`Fetch per ${dataKey} già in corso. Restituisco la Promise esistente.`);
        return activeFetches.get(dataKey);
    }

    const storedData = localStorage.getItem(dataKey); //
    const storedTimestamp = localStorage.getItem(`${dataKey}Timestamp`); //

    console.log(`Dati memorizzati - lista: ${storedData}`);
    console.log(`Timestamp memorizzato - lista: ${storedTimestamp}`);


    if (storedData && storedTimestamp) { //
        const cacheTimestamp = parseInt(storedTimestamp, 10); //
        const now = Date.now(); //
        if (now - cacheTimestamp < ttl) { //
            console.log(`Dati per ${dataKey} trovati in localStorage e validi. Tempo di verifica cache: ${(performance.now() - fetchStartTime).toFixed(2)} ms.`); //
            return JSON.parse(storedData); //
        } else {
            console.log(`Dati per ${dataKey} in localStorage scaduti, necessaria nuova fetch.`); //
            localStorage.removeItem(dataKey); //
            localStorage.removeItem(`${dataKey}Timestamp`); //
        }
    } else {
        console.log(`Nessun dato per ${dataKey} trovato in localStorage, necessaria nuova fetch.`); //
    }

     // 2. Avvia la fetch effettiva e memorizza la sua Promise
    const fetchPromise = (async () => { //
        console.log(`Avvio fetch per ${dataKey} da ${endpointUrl}...`); //
        try { //
            const fetchOptions = { //
                method: postBody ? 'POST' : 'GET', // Determina il metodo: POST se c'è un body, altrimenti GET
                headers: {} //
            }; //

            if (postBody) { //
                fetchOptions.headers['Content-Type'] = 'application/json'; // Imposta l'header per il JSON
                fetchOptions.body = JSON.stringify(postBody); // Stringify il corpo della richiesta
            } //

            const response = await fetch(endpointUrl, fetchOptions); //
            if (!response.ok) { //
                throw new Error(`HTTP error! status: ${response.status}`); //
            } //
            const data = await response.json(); //
            localStorage.setItem(dataKey, JSON.stringify(data)); //
            localStorage.setItem(`${dataKey}Timestamp`, Date.now().toString()); //
            console.log(`Dati per ${dataKey} pre-caricati con successo in ${(performance.now() - fetchStartTime).toFixed(2)} ms.`); //
            return data; //
        } catch (error) { //
            console.error(`Errore durante il pre-fetching di ${dataKey} da ${endpointUrl}:`, error); //
            return null; //
        } finally { // Assicurati di rimuovere la Promise dalla cache
            // 3. Rimuovi la Promise dalla mappa quando l'operazione è completata (successo o errore)
            activeFetches.delete(dataKey);
        }
    })();

    activeFetches.set(dataKey, fetchPromise);
    return fetchPromise;

  
}