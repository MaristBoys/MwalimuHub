// js/upload.js

// Assicurati che BACKEND_BASE_URL sia definito. Se non lo è, prendilo da login.js o definiscilo qui.
//const BACKEND_BASE_URL = window.BACKEND_BASE_URL;

// Riferimenti agli elementi del form e dello spinner
const uploadForm = document.getElementById('upload-form');
const uploadButton = document.getElementById('upload-button');
const uploadSpinner = document.getElementById('upload-spinner');
const uploadStatus = document.getElementById('upload-status'); // Per messaggi di stato

// --- MODIFICHE INIZIANO QUI ---

// Costante per la durata di validità del cache in localStorage (deve corrispondere a quella in login.js)
//const CACHE_DURATION_MS = 24 * 60 * 60 * 1000; // 24 ore

// --- MODIFICHE FINISCONO QUI ---

document.addEventListener('DOMContentLoaded', async () => {
    // Carica la navbar (riutilizzando la funzione da login.js)
    if (window.loadNavbar) {
        await window.loadNavbar();
    } else {
        console.error("loadNavbar function not found. Ensure login.js is loaded correctly.");
        const navbarPlaceholder = document.getElementById('navbar-placeholder');
        if (navbarPlaceholder) {
            navbarPlaceholder.innerHTML = '<nav id="main-navbar" class="bg-gray-800 text-white p-4 fixed w-full top-0 z-50">Loading Navbar...</nav>';
        }
    }

    // --- SNIPPET DI CONTROLLO LOGIN ---
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    const userData = JSON.parse(localStorage.getItem('userData'));

    if (!isLoggedIn || !userData || !userData.email) { 
        // Utente non loggato o dati utente mancanti/invalidi
        if (uploadForm) uploadForm.style.display = 'none'; // Nascondi il form
        if (uploadButton) uploadButton.disabled = true;
        if (uploadSpinner) {
            uploadSpinner.classList.add('hidden');
            uploadSpinner.style.display = 'none';
        }
        if (uploadStatus) {
            uploadStatus.textContent = 'Please log in to upload documents.';
            uploadStatus.className = 'ml-4 text-lg font-semibold text-red-600';
        }
        // Reindirizza alla pagina di login dopo un breve ritardo
        setTimeout(() => {
            window.location.href = "/index.html"; 
        }, 3000); 
        return; // Ferma l'esecuzione dello script qui
    }
    // --- FINE SNIPPET DI CONTROLLO LOGIN ---

    // Se l'utente è loggato, procedi con il caricamento dei dati del form
    if (uploadForm) uploadForm.disabled = true; // Disabilita mentre carica i dropdown
    if (uploadButton) uploadButton.disabled = true;
    if (uploadSpinner) {
        uploadSpinner.classList.remove('hidden');
        uploadSpinner.style.display = 'block';
    }
    if (uploadStatus) uploadStatus.textContent = 'Caricamento dati form...';
    
    prefillAuthor(); // Popola l'autore con i dati dell'utente loggato
    await populateDropdowns();

    // Una volta caricati i dropdown, riabilita il form e nascondi lo spinner
    if (uploadForm) uploadForm.disabled = false;
    if (uploadButton) uploadButton.disabled = false;
    if (uploadSpinner) {
        uploadSpinner.classList.add('hidden');
        uploadSpinner.style.display = 'none';
    }
    if (uploadStatus) uploadStatus.textContent = ''; 

    if (uploadForm) {
        uploadForm.addEventListener('submit', handleUpload);
    }
});

// Funzione per pre-riempire il campo Author
function prefillAuthor() {
    const authorInput = document.getElementById('author');
    const userData = JSON.parse(localStorage.getItem('userData'));
    if (authorInput && userData && userData.googleName) {
        authorInput.value = userData.googleName;
    } else {
        authorInput.value = 'Autore Sconosciuto'; // Fallback tradotto
    }
}

// --- MODIFICHE INIZIANO QUI: FUNZIONE populateDropdowns() ---
// Funzione per popolare tutti i menu a tendina
async function populateDropdowns() {
    const yearSelect = document.getElementById('year');
    const subjectSelect = document.getElementById('subject');
    const formSelect = document.getElementById('form');
    const roomSelect = document.getElementById('room');
    const documentTypeSelect = document.getElementById('documentType');

    let cachedData = null;
    let cacheTimestamp = null;
    const loadFromCacheStartTime = performance.now(); // Inizio misurazione tempo complessivo caricamento dropdown

    try {
        const storedData = localStorage.getItem('dropdownData');
        const storedTimestamp = localStorage.getItem('dropdownDataTimestamp');

        if (storedData && storedTimestamp) {
            cacheTimestamp = parseInt(storedTimestamp, 10);
            const now = Date.now();
            if (now - cacheTimestamp < CACHE_DURATION_MS) {
                cachedData = JSON.parse(storedData);
                console.log(`Dati dropdown trovati in localStorage e validi. Tempo di verifica cache: ${(performance.now() - loadFromCacheStartTime).toFixed(2)} ms.`);
                // console.log('Dati da cache:', cachedData); // Puoi decommentare per vedere i dati della cache
            } else {
                console.log('Dati dropdown in localStorage scaduti, necessaria nuova fetch.');
                localStorage.removeItem('dropdownData'); // Pulisce i dati scaduti
                localStorage.removeItem('dropdownDataTimestamp'); // Pulisce il timestamp scaduto
            }
        } else {
            console.log('Nessun dato dropdown trovato in localStorage, necessaria nuova fetch.');
        }
    } catch (e) {
        console.error('Errore nel parsing o accesso a localStorage:', e);
        localStorage.removeItem('dropdownData'); // Pulizia dati corrotti
        localStorage.removeItem('dropdownDataTimestamp'); // Pulizia timestamp corrotti
        cachedData = null; // Forza la nuova fetch
    }

    const dropdownsConfig = [
        { selectElement: yearSelect, endpoint: 'drive/years', loadingText: 'Caricamento Anni...', errorText: 'Errore nel caricamento degli Anni', key: 'years' },
        { selectElement: subjectSelect, endpoint: 'sheets/subjects', loadingText: 'Caricamento Materie...', errorText: 'Errore nel caricamento delle Materie', key: 'subjects' },
        { selectElement: formSelect, endpoint: 'sheets/forms', loadingText: 'Caricamento Classi...', errorText: 'Errore nel caricamento delle Classi', key: 'forms' },
        { selectElement: roomSelect, endpoint: 'sheets/rooms', loadingText: 'Caricamento Stanze...', errorText: 'Errore nel caricamento delle Stanze', key: 'rooms' },
        { selectElement: documentTypeSelect, endpoint: 'sheets/types', loadingText: 'Caricamento Tipi di Documento...', errorText: 'Errore nel caricamento dei Tipi di Documento', key: 'documentTypes' }
    ];

    const populatePromises = dropdownsConfig.map(async config => {
        const { selectElement, endpoint, loadingText, errorText, key } = config;
        selectElement.innerHTML = `<option value="">${loadingText}</option>`; // Imposta lo stato di caricamento iniziale per ogni dropdown

        const itemStartTime = performance.now(); // Inizio misurazione per singolo item
        let dataToUse = null;

        if (cachedData && cachedData[key]) {
            dataToUse = cachedData[key];
            console.log(`Dropdown ${key}: Dati caricati da localStorage in ${(performance.now() - itemStartTime).toFixed(2)} ms.`);
        } else {
            // Se non c'è cachedData o il dato specifico è null (es. errore pre-fetching), esegui la fetch
            console.log(`Dropdown ${key}: Esecuzione nuova fetch da backend.`);
            try {
                // Assicurati che BACKEND_BASE_URL sia disponibile globalmente (come esposto in login.js)
                const response = await fetch(`${window.BACKEND_BASE_URL}/api/${endpoint}`);
                if (!response.ok) {
                    throw new Error(`Errore HTTP! status: ${response.status}`);
                }
                dataToUse = await response.json();
                console.log(`Dropdown ${key}: Dati caricati da backend in ${(performance.now() - itemStartTime).toFixed(2)} ms.`);
            } catch (error) {
                console.error(`Errore nel recupero ${endpoint} per dropdown ${key}:`, error);
                selectElement.innerHTML = `<option value="">${errorText}</option>`;
                return; // Esce da questo map item, non popola
            }
        }

        // Popola il dropdown con i dati ottenuti
        selectElement.innerHTML = '<option value="">Seleziona un\'opzione</option>'; // Tradotto
        if (dataToUse && Array.isArray(dataToUse) && dataToUse.length > 0) { // Aggiunto controllo Array.isArray
            dataToUse.forEach(item => {
                const option = document.createElement('option');
                option.value = item;
                option.textContent = item;
                selectElement.appendChild(option);
            });
        } else {
            selectElement.innerHTML = `<option value="">Nessuna opzione disponibile</option>`; // Tradotto
        }
    });

    await Promise.all(populatePromises); // Attendi che tutti i dropdown siano popolati
    console.log(`Tutti i dropdown sono stati popolati. Tempo totale di popolamento: ${(performance.now() - loadFromCacheStartTime).toFixed(2)} ms.`);
}

// --- MODIFICHE FINISCONO QUI ---


// Funzione per gestire l'upload del file
async function handleUpload(event) {
    event.preventDefault(); // Impedisce il submit standard del form

    // Disabilita il pulsante e mostra lo spinner per l'upload
    uploadButton.disabled = true;
    uploadSpinner.classList.remove('hidden');
    uploadSpinner.style.display = 'block';
    uploadStatus.textContent = 'Caricamento in corso...'; // Tradotto
    uploadStatus.className = 'ml-4 text-sm font-semibold text-blue-600';

    const formData = new FormData();
    const fileInput = document.getElementById('file');

    // Verifica se un file è stato selezionato
    if (!fileInput.files || fileInput.files.length === 0) {
        uploadStatus.textContent = 'Caricamento Fallito: Seleziona un file.'; // Tradotto
        uploadStatus.className = 'ml-4 text-sm font-semibold text-red-600';
        uploadButton.disabled = false;
        uploadSpinner.classList.add('hidden');
        uploadSpinner.style.display = 'none';
        return; // Esci dalla funzione
    }

    // Raccogli tutti i dati del form per la descrizione
    const metadata = {
        year: document.getElementById('year').value,
        author: document.getElementById('author').value,
        subject: document.getElementById('subject').value,
        form: document.getElementById('form').value,
        room: document.getElementById('room').value,
        documentType: document.getElementById('documentType').value
    };

    // Aggiungi il file e la descrizione come stringa JSON
    formData.append('file', fileInput.files[0]);
    formData.append('description', JSON.stringify(metadata)); // Invia i metadati come stringa JSON nella descrizione

    try {
        const response = await fetch(`${window.BACKEND_BASE_URL}/api/upload`, {
            method: 'POST',
            body: formData // FormData viene gestito automaticamente con Content-Type: multipart/form-data
        });

        const result = await response.json();

        if (response.ok && result.success) {
            uploadStatus.textContent = 'Caricamento Riuscito!'; // Tradotto
            uploadStatus.className = 'ml-4 text-sm font-semibold text-green-600';
            document.getElementById('upload-form').reset(); // Resetta il form
            prefillAuthor(); // Pre-riempi di nuovo l'autore dopo il reset
        } else {
            const errorMessage = result.message || 'Si è verificato un errore sconosciuto.'; // Tradotto
            uploadStatus.textContent = `Caricamento Fallito: ${errorMessage}`; // Tradotto
            uploadStatus.className = 'ml-4 text-sm font-semibold text-red-600';
        }
    } catch (error) {
        console.error('Errore durante il caricamento:', error); // Tradotto
        uploadStatus.textContent = `Caricamento Fallito: ${error.message}`; // Tradotto
        uploadStatus.className = 'ml-4 text-sm font-semibold text-red-600';
    } finally {
        uploadButton.disabled = false;
        uploadSpinner.classList.add('hidden');
        uploadSpinner.style.display = 'none';
    }
}