// js/archive.js
import { loadNavbar, initializeThemeToggle, updateUIForLoginState } from '/js/utils.js';
import { fetchAndCacheArchivedFiles } from '/js/prefetch.js';
import { logout } from '/js/login.js';

// Riferimenti agli elementi DOM
const filterAuthorInput = document.getElementById('filter-author');
const applyFilterButton = document.getElementById('apply-filter-button');
const resetFilterButton = document.getElementById('reset-filter-button');
const refreshDataButton = document.getElementById('refresh-data-button');

// Variabile globale per la tabella DataTables
let documentsDataTable = null;
let userData = null; // Variabile per memorizzare i dati dell'utente loggato

document.addEventListener('DOMContentLoaded', async () => {
    console.log('ARCHIVE.JS: DOMContentLoaded event fired. Starting initialization.');

    // Carica la navbar
    try {
        await loadNavbar({ forceNavbarOpaque: true });
        const logoutLink = document.getElementById('logout-link');
        if (logoutLink) {
            logoutLink.addEventListener('click', (event) => {
                event.preventDefault();
                event.stopPropagation();
                logout();
            });
        }
    } catch (error) {
        console.error('ARCHIVE.JS: Error loading navbar:', error);
        return;
    }

    initializeThemeToggle();

    // Controllo login e popolamento userData
    const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
    try {
        const storedUserData = localStorage.getItem('userData');
        if (storedUserData) {
            userData = JSON.parse(storedUserData); // Popola la variabile globale userData
        }
    } catch (e) {
        console.error("ARCHIVE.JS: Error parsing userData from localStorage:", e);
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userData');
        userData = null; // Assicurati che sia null in caso di errore
    }

    if (!isLoggedIn || !userData || !userData.email) {
        console.warn('ARCHIVE.JS: User not logged in or invalid user data. Redirecting to login page.');
        setTimeout(() => {
            window.location.href = "/index.html";
        }, 3000);
        return;
    }
    updateUIForLoginState(isLoggedIn, userData, null);

    // Configura lo stato iniziale del campo di filtro e dei pulsanti in base al profilo utente
    if (userData.profile === 'Teacher') {
        filterAuthorInput.value = userData.googleName || ''; // Pre-popola con il nome del docente
        filterAuthorInput.readOnly = true; // Non modificabile
        applyFilterButton.disabled = true; // Disabilita i pulsanti di filtro manuale
        resetFilterButton.disabled = true;
        console.log('ARCHIVE.JS: Profile is Teacher. Filter set to own name, controls disabled.');
    } else if (['Admin', 'Headmaster', 'Deputy'].includes(userData.profile)) {
        filterAuthorInput.value = ''; // Inizia senza filtro per questi profili
        filterAuthorInput.readOnly = false; // Modificabile
        applyFilterButton.disabled = false;
        resetFilterButton.disabled = false;
        console.log(`ARCHIVE.JS: Profile is ${userData.profile}. Manual filtering enabled.`);
    } else {
        // Profilo sconosciuto o non autorizzato: disabilita tutto e non mostra file
        filterAuthorInput.value = 'Unauthorized Access';
        filterAuthorInput.readOnly = true;
        applyFilterButton.disabled = true;
        resetFilterButton.disabled = true;
        refreshDataButton.disabled = true; // Anche il refresh disabilitato
        console.warn('ARCHIVE.JS: Unauthorized profile. Filtering and data display disabled.');
        documentsDataTable.clear().draw(); // Pulisci subito la tabella
        return; // Termina l'esecuzione se non autorizzato
    }


    // Inizializza DataTables
    documentsDataTable = $('#documentsTable').DataTable({
        responsive: true,
        paging: true,
        searching: true,
        ordering: true,
        info: true,
        columns: [
            { data: 'name', title: 'File Name' },
            { data: 'properties.author', title: 'Author', defaultContent: 'N/A' },
            { data: 'properties.subject', title: 'Subject', defaultContent: 'N/A' },
            { data: 'properties.form', title: 'Form', defaultContent: 'N/A' },
            { data: 'properties.room', title: 'Room', defaultContent: 'N/A' },
            { data: 'properties.documentType', title: 'Type', defaultContent: 'N/A' },
            { 
                data: 'createdTime', 
                title: 'Uploaded',
                render: function(data) {
                    return new Date(data).toLocaleDateString();
                }
            },
            {
                data: null,
                title: 'Actions',
                orderable: false,
                render: function(data, type, row) {
                    const viewLink = row.webViewLink ? `<a href="${row.webViewLink}" target="_blank" class="bg-green-500 hover:bg-green-600 text-white text-xs font-bold py-1 px-2 rounded mr-1">View</a>` : '';
                    const downloadLink = row.webContentLink ? `<a href="${row.webContentLink}" target="_blank" class="bg-blue-500 hover:bg-blue-600 text-white text-xs font-bold py-1 px-2 rounded mr-1">Download</a>` : '';
                    const deleteButton = `<button class="bg-red-500 hover:bg-red-600 text-white text-xs font-bold py-1 px-2 rounded" onclick="deleteFile('${row.id}')">Delete</button>`;
                    return `<div class="flex justify-center">${viewLink}${downloadLink}${deleteButton}</div>`;
                }
            }
        ],
        language: {
            search: "Search:",
            lengthMenu: "Show _MENU_ entries",
            info: "Showing _START_ to _END_ of _TOTAL_ entries",
            paginate: {
                first: "First",
                last: "Last",
                next: "Next",
                previous: "Previous"
            }
        },
        dom: '<"flex justify-between items-center mb-4"lf><"overflow-x-auto"t><"flex justify-between items-center mt-4"ip>',
    });

    // Listener per i pulsanti di filtro e refresh
    if (applyFilterButton) {
        applyFilterButton.addEventListener('click', () => {
            // Per Admin/Headmaster/Deputy, usa il valore del campo input
            // Per Teacher, questa parte di codice sarà disabilitata ma, se per errore attivata,
            // loadArchivedFiles userà comunque il loro googleName.
            const author = filterAuthorInput.value.trim();
            loadArchivedFiles(author);
        });
    }

    if (resetFilterButton) {
        resetFilterButton.addEventListener('click', () => {
            if (userData.profile === 'Teacher') {
                filterAuthorInput.value = userData.googleName || ''; // Reset al proprio nome
            } else {
                filterAuthorInput.value = ''; // Reset a vuoto per Admin/Headmaster/Deputy
            }
            // Chiama loadArchivedFiles con il valore resettato (vuoto o il nome del docente)
            loadArchivedFiles(filterAuthorInput.value.trim());
        });
    }

    if (refreshDataButton) {
        refreshDataButton.addEventListener('click', () => {
            // Ottiene il filtro corrente visualizzato nel campo input
            const currentAuthorFilter = filterAuthorInput.value.trim();
            // Forza la pulizia della cache per il filtro corrente
            localStorage.removeItem(`archivedFiles-${currentAuthorFilter || 'all'}`);
            localStorage.removeItem(`${`archivedFiles-${currentAuthorFilter || 'all'}`}Timestamp`);
            // Ricarica i dati con il filtro corrente, forzando una nuova fetch
            loadArchivedFiles(currentAuthorFilter);
        });
    }

    // Carica la lista dei file all'avvio della pagina
    // Usa il valore iniziale del campo di filtro, che è stato configurato in base al profilo
    await loadArchivedFiles(filterAuthorInput.value.trim());
});

/**
 * Carica e visualizza i file archiviati, utilizzando la cache o recuperandoli dal backend.
 * Applica una logica di filtro basata sul profilo utente.
 * @param {string} requestedAuthorFilter - Il valore dell'autore richiesto dall'input del filtro.
 */
async function loadArchivedFiles(requestedAuthorFilter = '') {
    console.log(`ARCHIVE.JS: Calling loadArchivedFiles with requested filter: "${requestedAuthorFilter}"`);

    let finalAuthorFilter = ''; // Questo sarà il filtro effettivamente inviato al backend
    let shouldFetch = true;     // Flag per decidere se effettuare la fetch

    // Determina il filtro finale basandosi sul profilo utente
    if (userData) { // Assicurati che userData sia disponibile
        if (userData.profile === 'Teacher') {
            finalAuthorFilter = userData.googleName || ''; // I docenti vedono SEMPRE solo i propri file
            console.log(`ARCHIVE.JS: Profile: Teacher. Actual filter applied: "${finalAuthorFilter}"`);
        } else if (['Admin', 'Headmaster', 'Deputy'].includes(userData.profile)) {
            // Admin, Preside, Vicepreside possono filtrare manualmente.
            // Se requestedAuthorFilter è vuoto, significa "tutti i file".
            finalAuthorFilter = requestedAuthorFilter;
            console.log(`ARCHIVE.JS: Profile: ${userData.profile}. Actual filter applied: "${finalAuthorFilter || 'All files'}"`);
        } else {
            // Profilo sconosciuto o non autorizzato: non estrarre nulla
            shouldFetch = false;
            console.warn(`ARCHIVE.JS: Profile: ${userData.profile || 'Unknown'}. No files will be extracted.`);
        }
    } else {
        // Questo caso idealmente non dovrebbe essere raggiunto se il controllo iniziale reindirizza
        shouldFetch = false;
        console.warn('ARCHIVE.JS: No user data available. No files will be extracted.');
    }

    if (!shouldFetch) {
        documentsDataTable.clear().draw(); // Pulisci la tabella se non si deve fare la fetch
        return; // Esci presto
    }

    // Costruisci il corpo della richiesta POST e la chiave della cache
    const postBody = finalAuthorFilter ? { author: finalAuthorFilter } : null;
    const cacheKey = `archivedFiles-${finalAuthorFilter || 'all'}`;

    try {
        // Usa fetchAndCacheArchivedFiles per recuperare i file
        const filesData = await fetchAndCacheArchivedFiles(cacheKey, 'drive/list', postBody);

        if (filesData && filesData.success && filesData.files) {
            documentsDataTable.clear().rows.add(filesData.files).draw();
            console.log(`ARCHIVE.JS: Displayed ${filesData.files.length} files in the table.`);
        } else {
            console.error('ARCHIVE.JS: Failed to load archived files:', filesData ? filesData.message : 'Unknown error');
            documentsDataTable.clear().draw(); // Pulisci la tabella
        }
    } catch (error) {
        console.error('ARCHIVE.JS: Error in loadArchivedFiles:', error);
        documentsDataTable.clear().draw(); // Pulisci la tabella
    }
}

// Funzione globale per il delete (richiamata da onclick)
async function deleteFile(fileId) {
    if (!confirm('Are you sure you want to delete this file?')) {
        return;
    }
    try {
        console.log(`ARCHIVE.JS: Deleting file with ID: ${fileId}`);
        const response = await fetch(`${window.BACKEND_BASE_URL}/api/drive/delete/${fileId}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        if (result.success) {
            alert('File deleted successfully!');
            // Dopo l'eliminazione, forza un refresh dei dati basato sul filtro corrente
            const currentAuthorFilter = filterAuthorInput.value.trim();
            localStorage.removeItem(`archivedFiles-${currentAuthorFilter || 'all'}`);
            localStorage.removeItem(`${`archivedFiles-${currentAuthorFilter || 'all'}`}Timestamp`);
            await loadArchivedFiles(currentAuthorFilter);
        } else {
            alert(`Failed to delete file: ${result.message}`);
        }
    } catch (error) {
        console.error('ARCHIVE.JS: Error deleting file:', error);
        alert(`Error deleting file: ${error.message}`);
    }
}

// Rendi deleteFile disponibile globalmente se usi onclick nell'HTML
window.deleteFile = deleteFile;