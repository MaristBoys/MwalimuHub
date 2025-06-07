// js/prefetch.js
import { CACHE_DURATION_MS } from './utils.js';

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

/**             FUNZIONE DA SISTEMARE PER IL RECUPERO DELLA LISTA DOCUMENTI IN ARCHIVIO
 * Recupera e cache i dati GENERICIda un endpoint specificato.
 * @param {string} dataKey - La chiave con cui i dati verranno memorizzati in localStorage.
 * @param {string} endpointPath - Il percorso dell'endpoint API (es. 'users/list', 'products/all').
 * @param {number} [ttl=CACHE_DURATION_MS] - Tempo di vita per la cache in millisecondi.
 * @returns {Promise<Object|Array|null>} I dati recuperati, o null se si è verificato un errore o la cache non è valida.
 */
export async function fetchAndCacheNewData(dataKey, endpointPath, ttl = CACHE_DURATION_MS) {
    console.log(`Inizio fetching e caching per ${dataKey}...`);
    const fetchStartTime = performance.now();
    // Usa window.BACKEND_BASE_URL definito in config.js
    const endpointUrl = `${window.BACKEND_BASE_URL}/api/${endpointPath}`;

    const storedData = localStorage.getItem(dataKey);
    const storedTimestamp = localStorage.getItem(`${dataKey}Timestamp`);

    if (storedData && storedTimestamp) {
        const cacheTimestamp = parseInt(storedTimestamp, 10);
        const now = Date.now();
        if (now - cacheTimestamp < ttl) {
            console.log(`Dati per ${dataKey} trovati in localStorage e validi. Tempo di verifica cache: ${(performance.now() - fetchStartTime).toFixed(2)} ms.`);
            return JSON.parse(storedData);
        } else {
            console.log(`Dati per ${dataKey} in localStorage scaduti, necessaria nuova fetch.`);
            localStorage.removeItem(dataKey);
            localStorage.removeItem(`${dataKey}Timestamp`);
        }
    } else {
        console.log(`Nessun dato per ${dataKey} trovato in localStorage, necessaria nuova fetch.`);
    }

    try {
        const response = await fetch(endpointUrl);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const data = await response.json();
        localStorage.setItem(dataKey, JSON.stringify(data));
        localStorage.setItem(`${dataKey}Timestamp`, Date.now().toString());
        console.log(`Dati per ${dataKey} pre-caricati con successo in ${(performance.now() - fetchStartTime).toFixed(2)} ms.`);
        return data;
    } catch (error) {
        console.error(`Errore durante il pre-fetching di ${dataKey} da ${endpointUrl}:`, error);
        return null;
    }
}
