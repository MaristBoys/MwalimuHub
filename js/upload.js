// js/upload.js
import { CACHE_DURATION_MS, loadNavbar, initializeThemeToggle, updateUIForLoginState } from '/MwalimuHub/js/utils.js'; // Importa updateUIForLoginState
import { fetchAndCacheDropdownData } from '/MwalimuHub/js/prefetch.js';
import { logout } from '/MwalimuHub/js/login.js'; // Importa la funzione logout

// Riferimenti agli elementi del form e dello spinner, specifici di upload.html
const uploadForm = document.getElementById('upload-form');
const uploadButton = document.getElementById('upload-button');
const uploadSpinner = document.getElementById('upload-spinner');
const uploadStatus = document.getElementById('upload-status'); // Equivalente di resultDiv per questa pagina

// Variabile globale per conservare i dati originali delle room
let allRoomsData = [];

document.addEventListener('DOMContentLoaded', async () => {
    console.log('UPLOAD.JS: DOMContentLoaded event fired. Starting initialization.');

    // Carica la navbar. Passiamo forceOpaque: true per renderla sempre opaca.
    try {
        console.log('UPLOAD.JS: Attempting to load navbar...');
        await loadNavbar({ forceNavbarOpaque: true });
        console.log('UPLOAD.JS: Navbar loaded successfully.');

        // AGGIUNTA: Attacca l'evento al bottone di logout nel menu overlay, ora che la navbar è caricata
        const logoutLink = document.getElementById('logout-link');
        if (logoutLink) {
            logoutLink.addEventListener('click', (event) => {
                event.preventDefault(); // Impedisce il comportamento predefinito del link
                event.stopPropagation(); // Impedisce la propagazione al document
                logout(); // Chiama la funzione di logout importata da login.js
            });
            console.log('UPLOAD.JS: Logout listener attached to navbar logout link.');
        }

    } catch (error) {
        console.error('UPLOAD.JS: Error loading navbar:', error);
        if (uploadStatus) uploadStatus.textContent = `Error loading navbar: ${error.message}`;
        if (uploadForm) uploadForm.style.display = 'none'; // Nasconde il form se la navbar non carica
        return; // Ferma l'esecuzione se la navbar non carica
    }

    // Inizializza il toggle del tema, ora che il pulsante dovrebbe essere nel DOM
    initializeThemeToggle();
    console.log('UPLOAD.JS: Theme toggle initialized.');

    // SNIPPET DI CONTROLLO LOGIN:
    console.log('UPLOAD.JS: Checking login status...');
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    let userData = null; // Inizializza userData a null
    try {
        const storedUserData = localStorage.getItem('userData');
        if (storedUserData) {
            userData = JSON.parse(storedUserData);
        }
    } catch (e) {
        console.error("UPLOAD.JS: Error parsing userData from localStorage:", e);
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userData');
        isLoggedIn = false; // Forza il logout se i dati sono corrotti
        userData = null;
    }

    console.log('UPLOAD.JS: isLoggedIn:', isLoggedIn, 'userData:', userData);

    if (!isLoggedIn || !userData || !userData.email) {
        console.warn('UPLOAD.JS: User not logged in or invalid user data. Redirecting to login page.');
        // Utente non loggato o dati utente mancanti/invalidi: nascondi il form e reindirizza.
        if (uploadForm) uploadForm.style.display = 'none'; // Nascondi il form
        if (uploadButton) uploadButton.disabled = true; // Disabilita il pulsante di upload
        if (uploadSpinner) {
            uploadSpinner.classList.add('hidden');
            uploadSpinner.style.display = 'none';
        }
        if (uploadStatus) {
            uploadStatus.textContent = 'Please log in to upload documents.'; // Messaggio di stato
            uploadStatus.className = 'ml-4 text-lg font-semibold text-red-600';
        }
        // Reindirizza alla pagina di login dopo un breve ritardo
        setTimeout(() => {
            window.location.href = "/MwalimuHub/index.html";
        }, 3000);
        return; // Ferma l'esecuzione dello script qui
    }
    // FINE SNIPPET DI CONTROLLO LOGIN

    console.log('UPLOAD.JS: User is logged in. Proceeding with form initialization.');

    // AGGIUNTA: Aggiorna la navbar con i dati dell'utente loggato.
    // Non abbiamo elementi specifici della pagina come googleLoginSection qui, quindi passiamo null.
    updateUIForLoginState(isLoggedIn, userData, null);
    console.log('UPLOAD.JS: updateUIForLoginState called for navbar elements.');

    // Se l'utente è loggato, procedi con il caricamento dei dati del form
    if (uploadForm) uploadForm.disabled = true; // Disabilita il form mentre carica i dropdown
    if (uploadButton) uploadButton.disabled = true; // Disabilita il pulsante di upload
    if (uploadSpinner) {
        uploadSpinner.classList.remove('hidden');
        uploadSpinner.style.display = 'block';
    }
    if (uploadStatus) uploadStatus.textContent = 'Loading form data...'; // Messaggio di caricamento
    console.log('UPLOAD.JS: Form disabled, spinner shown, status updated.');

    prefillAuthor(); // Pre-riempi il campo autore con i dati dell'utente loggato
    console.log('UPLOAD.JS: Author prefill attempted.');

    try {
        console.log('UPLOAD.JS: Attempting to populate dropdowns...');
        await populateDropdowns(); // Popola i menu a tendina
        console.log('UPLOAD.JS: Dropdowns populated successfully.');
    } catch (error) {
        console.error('UPLOAD.JS: Error populating dropdowns:', error);
        if (uploadStatus) uploadStatus.textContent = `Error populating form fields: ${error.message}`;
        if (uploadForm) uploadForm.style.display = 'none'; // Nasconde il form se i dropdown non caricano
        return;
    }

    // Aggiungi l'event listener per il cambiamento del dropdown 'form'
    // quando cambia form, filtra le room disponibili
    const formSelect = document.getElementById('form');
    if (formSelect) {
        formSelect.addEventListener('change', filterRoomsByForm);
        console.log('UPLOAD.JS: Event listener added to formSelect for room filtering.');
    }
    
    
    
    
    
    // Esempio di utilizzo del nuovo prefetch se necessario in upload.js
    // Potresti voler pre-caricare altri dati specifici della pagina di upload qui:
    // console.log('UPLOAD.JS: Attempting to fetch other data...');
    // await fetchAndCacheNewData('myOtherDataForUpload', 'some/other/endpoint/for/upload');
    // console.log('UPLOAD.JS: Other data fetch attempted.');


    // Una volta caricati i dropdown, riabilita il form e nascondi lo spinner
    if (uploadForm) uploadForm.disabled = false;
    if (uploadButton) uploadButton.disabled = false;
    if (uploadSpinner) {
        uploadSpinner.classList.add('hidden');
        uploadSpinner.style.display = 'none';
    }
    if (uploadStatus) uploadStatus.textContent = ''; // Pulisci il messaggio di stato
    console.log('UPLOAD.JS: Form re-enabled, spinner hidden, status cleared.');

    // Attacca il listener per la sottomissione del form
    if (uploadForm) {
        uploadForm.addEventListener('submit', handleUpload);
        console.log('UPLOAD.JS: Form submit listener attached.');
    }
});

/**
 * Pre-riempie il campo "Author" con il nome dell'utente loggato.
 */
function prefillAuthor() {
    const authorInput = document.getElementById('author');
    const userData = JSON.parse(localStorage.getItem('userData'));
    if (authorInput && userData && userData.googleName) {
        authorInput.value = userData.googleName;
        console.log('UPLOAD.JS: Author prefilled with:', userData.googleName);
    } else {
        authorInput.value = 'Unknown Author'; // Fallback
        console.warn('UPLOAD.JS: Could not prefill author. User data might be missing or incomplete.');
    }
}

/**
 * Popola tutti i menu a tendina del form di upload.
 * Utilizza i dati dalla cache di localStorage o li recupera dal backend.
 */
async function populateDropdowns() {
    console.log('UPLOAD.JS: Inside populateDropdowns function.');
    // Riferimenti agli elementi select
    const yearSelect = document.getElementById('year');
    const subjectSelect = document.getElementById('subject');
    const formSelect = document.getElementById('form');
    const roomSelect = document.getElementById('room');
    const documentTypeSelect = document.getElementById('documentType');

    let dataToPopulate = null;
    let loadFromCacheStartTime = performance.now();

    try {
        const storedData = localStorage.getItem('dropdownData');
        const storedTimestamp = localStorage.getItem('dropdownDataTimestamp');

        if (storedData && storedTimestamp) {
            const cacheTimestamp = parseInt(storedTimestamp, 10);
            const now = Date.now();
            // Controlla se la cache è valida usando CACHE_DURATION_MS da utils.js
            if (now - cacheTimestamp < CACHE_DURATION_MS) {
                dataToPopulate = JSON.parse(storedData);
                console.log(`UPLOAD.JS: Dropdown data found in localStorage and valid. Cache check time: ${(performance.now() - loadFromCacheStartTime).toFixed(2)} ms.`);
            } else {
                console.log('UPLOAD.JS: Dropdown data in localStorage expired, new fetch needed.');
                localStorage.removeItem('dropdownData'); // Pulisce i dati scaduti
                localStorage.removeItem('dropdownDataTimestamp'); // Pulisce il timestamp scaduto
            }
        } else {
            console.log('UPLOAD.JS: No dropdown data found in localStorage, new fetch needed.');
        }
    } catch (e) {
        console.error('UPLOAD.JS: Error parsing or accessing localStorage for dropdown data:', e);
        localStorage.removeItem('dropdownData'); // Pulizia dati corrotti
        localStorage.removeItem('dropdownDataTimestamp'); // Pulizia timestamp corrotti
        dataToPopulate = null; // Forza la nuova fetch
    }

    // Se i dati cachati non sono disponibili o non validi, recupera nuovi dati e cachali.
    if (!dataToPopulate) {
        console.log("UPLOAD.JS: Forcing re-fetching of dropdown data and cache update...");
        // Chiama la funzione centralizzata di prefetch
        try {
            dataToPopulate = await fetchAndCacheDropdownData();
            if (!dataToPopulate) {
                console.error("UPLOAD.JS: Could not retrieve dropdown data after fetch attempt.");
                throw new Error("Failed to fetch dropdown data."); // Rilancia l'errore per il try/catch esterno
            }
        } catch (error) {
            console.error("UPLOAD.JS: fetchAndCacheDropdownData failed:", error);
            uploadStatus.textContent = 'Error loading form data.';
            uploadStatus.className = 'ml-4 text-lg font-semibold text-red-600';
            throw error; // Rilancia l'errore per il try/catch nel DOMContentLoaded
        }
    }

    // Salva i dati originali delle room
    if (dataToPopulate && dataToPopulate.rooms) {
        allRoomsData = dataToPopulate.rooms;
        console.log('UPLOAD.JS: Original rooms data stored:', allRoomsData);
    }

    // Configurazione per popolare ogni dropdown
    const dropdownsConfig = [
        { selectElement: yearSelect, key: 'years', loadingText: 'Loading Years...', errorText: 'Error loading Years' }, // Tradotto
        { selectElement: subjectSelect, key: 'subjects', loadingText: 'Loading Subjects...', errorText: 'Error loading Subjects' }, // Tradotto
        { selectElement: formSelect, key: 'forms', loadingText: 'Loading Forms...', errorText: 'Error loading Forms' }, // Tradotto
        // Per le rooms, la popolaremo inizialmente con tutti i dati e poi la filtreremo
        { selectElement: roomSelect, key: 'rooms', loadingText: 'Loading Rooms...', errorText: 'Error loading Rooms' }, // Tradotto
        { selectElement: documentTypeSelect, key: 'documentTypes', loadingText: 'Loading Document Types...', errorText: 'Error loading Document Types' } // Tradotto
    ];

    // Itera sulla configurazione e popola i dropdown
    dropdownsConfig.forEach(config => {
        const { selectElement, key, loadingText, errorText } = config;
        // Verifica che l'elemento select esista prima di manipolarlo
        if (selectElement) {
            selectElement.innerHTML = `<option value="">${loadingText}</option>`; // Imposta lo stato di caricamento iniziale

            const items = dataToPopulate[key];
            if (items && Array.isArray(items) && items.length > 0) {
                selectElement.innerHTML = '<option value="">Select an option</option>'; // Tradotto
                items.forEach(item => {
                    const option = document.createElement('option');
                    option.value = item;
                    option.textContent = item;
                    selectElement.appendChild(option);
                });
                console.log(`UPLOAD.JS: Dropdown '${key}' populated with ${items.length} items.`);
            } else {
                selectElement.innerHTML = `<option value="">${errorText || 'No options available'}</option>`; // Tradotto
                console.warn(`UPLOAD.JS: Dropdown '${key}' could not be populated. No items found or data invalid.`);
            }
        } else {
            console.error(`UPLOAD.JS: Select element with ID for key '${key}' not found.`);
        }
    });

    console.log(`UPLOAD.JS: All dropdowns population process completed. Total population time: ${(performance.now() - loadFromCacheStartTime).toFixed(2)} ms.`);
}

/**
 * Filtra le opzioni del dropdown "Room" in base all'ultimo carattere del valore selezionato nel dropdown "Form".
 * Resetta la selezione della Room ogni volta che il Form cambia.
 */
function filterRoomsByForm() {
    const formSelect = document.getElementById('form');
    const roomSelect = document.getElementById('room');

    if (!formSelect || !roomSelect || !allRoomsData.length) {
        console.warn('UPLOAD.JS: Cannot filter rooms. Missing select elements or original rooms data.');
        return;
    }

    const selectedFormValue = formSelect.value;
    console.log('UPLOAD.JS: Form selected:', selectedFormValue);

    // Resetta il dropdown "Room" e imposta l'opzione di default
    roomSelect.innerHTML = '<option value="">Select an option</option>';
    roomSelect.value = ''; // Deseleziona qualsiasi valore precedentemente scelto

    if (selectedFormValue) {
        // Estrai l'ultimo carattere del valore selezionato nel Form
        const lastCharOfForm = selectedFormValue.slice(-1);
        console.log('UPLOAD.JS: Last character of selected Form:', lastCharOfForm);

        const filteredRooms = allRoomsData.filter(room => {
            // Assicurati che 'room' sia una stringa e controlla se il primo carattere è uguale all'ultimo carattere del form
            return typeof room === 'string' && room.length > 0 && room.slice(-2, -1) === lastCharOfForm;
        });

        if (filteredRooms.length > 0) {
            filteredRooms.forEach(room => {
                const option = document.createElement('option');
                option.value = room;
                option.textContent = room;
                roomSelect.appendChild(option);
            });
            console.log(`UPLOAD.JS: Room dropdown filtered. Showing ${filteredRooms.length} rooms starting with '${lastCharOfForm}'.`);
        } else {
            roomSelect.innerHTML = '<option value="">No rooms found for this form</option>';
            console.log(`UPLOAD.JS: No rooms found matching form's last character: ${lastCharOfForm}`);
        }
    } else {
        // Se nessun form è selezionato, ripopola con tutte le rooms originali
        allRoomsData.forEach(room => {
            const option = document.createElement('option');
            option.value = room;
            option.textContent = room;
            roomSelect.appendChild(option);
        });
        console.log('UPLOAD.JS: No form selected, repopulated room dropdown with all original rooms.');
    }
}


/**
 * Gestisce l'invio del form di upload del file al backend.
 * @param {Event} event - L'evento di sottomissione del form.
 */
async function handleUpload(event) {
    event.preventDefault(); // Impedisce il submit standard del form
    console.log('UPLOAD.JS: Handling form submission.');

    // Disabilita il pulsante e mostra lo spinner per l'upload
    uploadButton.disabled = true;
    if (uploadSpinner) {
        uploadSpinner.classList.remove('hidden');
        uploadSpinner.style.display = 'block';
    }
    uploadStatus.textContent = 'Uploading...'; // Tradotto
    uploadStatus.className = 'ml-4 text-sm font-semibold text-blue-600';
    console.log('UPLOAD.JS: Upload initiated. Button disabled, spinner visible.');

    const formData = new FormData();
    const fileInput = document.getElementById('file');

    // Verifica se un file è stato selezionato
    if (!fileInput.files || fileInput.files.length === 0) {
        uploadStatus.textContent = 'Upload Failed: Please select a file.'; // Tradotto
        uploadStatus.className = 'ml-4 text-sm font-semibold text-red-600';
        uploadButton.disabled = false;
        if (uploadSpinner) {
            uploadSpinner.classList.add('hidden');
            uploadSpinner.style.display = 'none';
        }
        console.warn('UPLOAD.JS: Upload failed: No file selected.');
        return; // Esci dalla funzione
    }


    // AGGIUNGI IL FILE AL FORMDATA
    formData.append('file', fileInput.files[0]);
    console.log('UPLOAD.JS: File selected:', fileInput.files[0].name);

    // AGGIUNGI OGNI CAMPO DEI METADATI COME CAMPO SEPARATO NEL FORMDATA
    formData.append('year', document.getElementById('year')?.value || '');
    formData.append('author', document.getElementById('author')?.value || '');
    formData.append('subject', document.getElementById('subject')?.value || '');
    formData.append('form', document.getElementById('form')?.value || '');
    formData.append('room', document.getElementById('room')?.value || ''); // Campo facoltativo
    formData.append('documentType', document.getElementById('documentType')?.value || '');

    // AGGIUNGI il nome dell'utente custom property
    //Recupera da localstorage il name dell'utente loggato - quello proveniente da sheet
    const userData = JSON.parse(localStorage.getItem('userData'));
    if (userData && userData.name) {
        formData.append('name', userData.name);
        console.log('UPLOAD.JS: Appending userName to FormData:', userData.name);
    } else {
        formData.append('name', ''); // Aggiunge un campo vuoto
        console.warn('UPLOAD.JS: name non trovato in localstorage userData. È stato aggiunto un campo vuoto.');
    }

    // il metadato descrizione viene compilato in automatico dal backend
    // utilizza req.file.originalname per il nome del file originale
     console.log('UPLOAD.JS: FormData prepared.');

    try {
        // Usa window.BACKEND_BASE_URL definito in config.js
        console.log('UPLOAD.JS: Sending upload request to backend...');
        const response = await fetch(`${window.BACKEND_BASE_URL}/api/drive/upload`, {
            method: 'POST',
            body: formData // FormData viene gestito automaticamente con Content-Type: multipart/form-data
        });

        const result = await response.json();
        console.log('UPLOAD.JS: Backend response received:', result);

        if (response.ok && result.success) {
            uploadStatus.textContent = 'Upload Successful!'; // Tradotto
            uploadStatus.className = 'ml-4 text-sm font-semibold text-green-600';
            if (uploadForm) uploadForm.reset(); // Resetta il form
            prefillAuthor(); // Pre-riempi di nuovo l'autore dopo il reset
            console.log('UPLOAD.JS: Upload successful. Form reset, author prefilled.');
        } else {
            const errorMessage = result.message || 'An unknown error occurred.'; // Tradotto
            uploadStatus.textContent = `Upload failed:: ${errorMessage}`; // Tradotto
            uploadStatus.className = 'ml-4 text-sm font-semibold text-red-600';
            console.error('UPLOAD.JS: Upload failed:', errorMessage);
        }
    } catch (error) {
        console.error('UPLOAD.JS: Error during upload request:', error); // Tradotto
        uploadStatus.textContent = `Caricamento Fallito: ${error.message}`; // Tradotto
        uploadStatus.className = 'ml-4 text-sm font-semibold text-red-600';
    } finally {
        // Riabilita il pulsante e nascondi lo spinner
        uploadButton.disabled = false;
        if (uploadSpinner) {
            uploadSpinner.classList.add('hidden');
            uploadSpinner.style.display = 'none';
        }
        console.log('UPLOAD.JS: Upload process finished. Button re-enabled, spinner hidden.');
    }
}