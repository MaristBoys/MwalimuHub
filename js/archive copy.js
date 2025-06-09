// js/archive.js
import { loadNavbar, initializeThemeToggle, buildArchivedFilesRequestParams, updateUIForLoginState } from '/js/utils.js';
import { fetchAndCacheArchivedFiles } from '/js/prefetch.js';
import { logout } from '/js/login.js';

// Riferimenti agli elementi DOM
const filterAuthorSelect = document.getElementById('filter-author');
const filterYearSelect = document.getElementById('filter-year'); // NEW
const filterSubjectSelect = document.getElementById('filter-subject'); // NEW
const filterFormSelect = document.getElementById('filter-form'); // NEW
const filterRoomSelect = document.getElementById('filter-room'); // NEW
const filterTypeSelect = document.getElementById('filter-type'); // NEW
const resetFilterButton = document.getElementById('reset-filter-button');
const refreshDataButton = document.getElementById('refresh-data-button');
const loadingSpinner = document.getElementById('loadingSpinner'); // NEW: Reference to the spinner element

// NUOVI RIFERIMENTI PER LO STORAGE
const storageInfoSection = document.getElementById('storage-info-section');
const totalStorageSpan = document.getElementById('total-storage');
const usedStorageSpan = document.getElementById('used-storage');
const availableStorageSpan = document.getElementById('available-storage');
const trashStorageSpan = document.getElementById('trash-storage');
const storageErrorMessageDiv = document.getElementById('storage-error-message');

// Variabile globale per la tabella DataTables
let documentsDataTable = null;
let userData = null; // Variabile per memorizzare i dati dell'utente loggato
let allFilesData = []; // NEW: Store the raw data for frontend filtering


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

     // Inizializza il toggle del tema, ora che il pulsante dovrebbe essere nel DOM
    initializeThemeToggle();
    console.log('ARCHIVE.JS: Navbar loaded and theme toggle initialized.');
    
    // Inizializza DataTables per la tabella dei documenti
    documentsDataTable = $('#documentsTable').DataTable({
        responsive: true,
        paging: true,
        searching: true,
        ordering: true,
        info: true,
        columns: [
            { data: 'properties.year', title: 'Year', defaultContent: 'N/A' }, // NEW LINE
            { data: 'name', title: 'File Name' },
            { data: 'properties.author', title: 'Author', defaultContent: 'N/A' },
            { data: 'properties.subject', title: 'Subject', defaultContent: 'N/A' },
            { data: 'properties.form', title: 'Form', defaultContent: 'N/A' },
            { data: 'properties.room', title: 'Room', defaultContent: 'N/A' },
            { data: 'properties.documentType', title: 'Type', defaultContent: 'N/A' },
            {
                data: 'createdTime',
                title: 'Uploaded',
                // Use 'type' to tell DataTables it's a date
                type: 'date', // NEW LINE
                render: function (data, type, row) {
                    if (type === 'sort' || type === 'type') {
                        // For sorting and filtering, return the raw timestamp or ISO string
                        return data;
                    }
                    // For display, return the formatted date
                    return new Date(data).toLocaleDateString();
                }
            },
            {
                data: null,
                title: 'Actions',
                orderable: false,
                render: function (data, type, row) {
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

    console.log('ARCHIVE.JS: User login state:', isLoggedIn, 'User data:', userData);
    if (!isLoggedIn || !userData || !userData.email) {
        console.warn('ARCHIVE.JS: User not logged in or invalid user data. Redirecting to login page.');
        documentsDataTable.clear().draw();
        setTimeout(() => {
            window.location.href = "/index.html";
        }, 3000);
        return;
    }
    console.log('ARCHIVE.JS: User is logged in. Proceeding to load archived files.');
    updateUIForLoginState(isLoggedIn, userData, null);
        
    // Aggiungi listener per tutti i nuovi filtri sulla Datatable
    filterYearSelect.addEventListener('change', applyFrontendFilters);
    filterSubjectSelect.addEventListener('change', applyFrontendFilters);
    filterFormSelect.addEventListener('change', applyFrontendFilters);
    filterRoomSelect.addEventListener('change', applyFrontendFilters);
    filterTypeSelect.addEventListener('change', applyFrontendFilters);
    filterAuthorSelect.addEventListener('change', applyFrontendFilters);


    // Listeners for filter and refresh buttons
    if (resetFilterButton) {
        resetFilterButton.addEventListener('click', () => {
            if (userData.profile === 'Teacher') {
                filterAuthorSelect.value = userData.googleName || ''; // Reset to own name
            } else {
                filterAuthorSelect.value = ''; // Reset to empty for Admin/Headmaster/Deputy/Staff
            }
            // Reset all new select filters
            filterYearSelect.value = '';
            filterSubjectSelect.value = '';
            filterFormSelect.value = '';
            filterRoomSelect.value = '';
            filterTypeSelect.value = '';
            filterAuthorSelect.value = '';
            applyFrontendFilters(); // Applica i filtri dopo il reset
        });
    }
    
    // Listener per il pulsante Refresh Data 
    if (refreshDataButton) {
        refreshDataButton.addEventListener('click', async () => {
            
             // Calcola la cacheKey corrente
            const { cacheKey } = buildArchivedFilesRequestParams(
                userData,
                filterAuthorSelect ? filterAuthorSelect.value : ''
            );
            
            // Rimuovi le chiavi di cache relative ai file archiviati
            localStorage.removeItem(cacheKey);
            localStorage.removeItem(`${cacheKey}Timestamp`);
            
            // Ricarica i file (ora la cache sarà vuota per quella chiave)
            await loadArchivedFiles();
            // Dopo il refresh, riapplica i filtri frontend per mantenere lo stato
            applyFrontendFilters();});
            // Richiama anche le info di storage per rinfrescarle
            fetchAndDisplayStorageInfo(); // 
    }
    // Ricarica i file (ora la cache sarà vuota per quella chiave)
    await loadArchivedFiles();

    // Fetch and display storage info on page load
    fetchAndDisplayStorageInfo(); 
});

/**
 * Shows the loading spinner.
 */
function showSpinner() {
    if (loadingSpinner) {
        loadingSpinner.classList.remove('hidden');
    }
}

/**
 * Hides the loading spinner.
 */
function hideSpinner() {
    if (loadingSpinner) {
        loadingSpinner.classList.add('hidden');
    }
}

// Funzione per recuperare e visualizzare le informazioni di storage di Google Drive
async function fetchAndDisplayStorageInfo() {
    if (!storageInfoSection || !totalStorageSpan || !usedStorageSpan || !availableStorageSpan || !trashStorageSpan || !storageErrorMessageDiv) {
        console.warn('One or more storage info elements not found. Skipping display.');
        return;
    }

    // Nascondi eventuali messaggi di errore precedenti
    storageErrorMessageDiv.classList.add('hidden');
    storageErrorMessageDiv.textContent = '';
    // Mostra la sezione info storage, anche se i dati non sono ancora stati caricati
    storageInfoSection.classList.remove('hidden');


    try {
        console.log('ARCHIVE.JS: Fetching storage information from backend...');
        const response = await fetch(`${window.BACKEND_BASE_URL}/api/drive/storage-info`);

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(`HTTP error! status: ${response.status}, message: ${errorData.message}`);
        }

        const data = await response.json();

        if (data.success) {
            totalStorageSpan.textContent = data.total;
            usedStorageSpan.textContent = data.used;
            availableStorageSpan.textContent = data.available;
            trashStorageSpan.textContent = data.trash;
            console.log('ARCHIVE.JS: Storage information loaded successfully:', data);
        } else {
            console.error('ARCHIVE.JS: Failed to retrieve storage information:', data.message);
            storageErrorMessageDiv.textContent = `Error: ${data.message}`;
            storageErrorMessageDiv.classList.remove('hidden');
        }
    } catch (error) {
        console.error('ARCHIVE.JS: Error fetching storage information:', error);
        storageErrorMessageDiv.textContent = `Error loading storage info: ${error.message}`;
        storageErrorMessageDiv.classList.remove('hidden');
    }
}



/**
 * Popola dinamicamente le opzioni dei filtri select con i valori unici presenti nei dati.
 * @param {Array} files - L'array di oggetti file.
 */
function populateFilterOptions(files) {
    //const getUniqueValues = (prop) => [...new Set(files.map(file => file.properties[prop]).filter(Boolean))].sort();

    const getUniqueValues = (prop) => {
        return [...new Set(files.map(file => {
            // Se 'properties' non esiste o la proprietà specifica non esiste, restituisci undefined per filtrarla
            return (file.properties && file.properties[prop]) ? file.properties[prop] : undefined;
        }).filter(Boolean))].sort(); // filter(Boolean) rimuoverà gli 'undefined' e altri valori falsy
    };

    const uniqueYears = getUniqueValues('year');
    const uniqueSubjects = getUniqueValues('subject');
    const uniqueForms = getUniqueValues('form');
    const uniqueRooms = getUniqueValues('room');
    const uniqueDocumentTypes = getUniqueValues('documentType');
    const uniqueAuthor = getUniqueValues('author');

    const populateSelect = (selectElement, values, defaultText) => {
        selectElement.innerHTML = `<option value="">${defaultText}</option>`;
        values.forEach(value => {
            const option = document.createElement('option');
            option.value = value;
            option.textContent = value;
            selectElement.appendChild(option);
        });
    };

    populateSelect(filterYearSelect, uniqueYears, 'Year');
    populateSelect(filterSubjectSelect, uniqueSubjects, 'Subject');
    populateSelect(filterFormSelect, uniqueForms, 'Form');
    populateSelect(filterRoomSelect, uniqueRooms, 'Room');
    populateSelect(filterTypeSelect, uniqueDocumentTypes, 'Type');
    populateSelect(filterAuthorSelect, uniqueAuthor, 'Author');
}

/**
 * Applica i filtri combinati a DataTables sul frontend.
 * Questa funzione non fa nuove richieste al backend, ma filtra i dati già caricati.
 */
function applyFrontendFilters() {
    console.log('ARCHIVE.JS: Applying frontend filters.');

    // Clear all existing column filters first to ensure "AND" logic for new filters
    documentsDataTable.columns().search('');

    const authorFilter = filterAuthorSelect.value.trim();
    const yearFilter = filterYearSelect.value.trim();
    const subjectFilter = filterSubjectSelect.value.trim();
    const formFilter = filterFormSelect.value.trim();
    const roomFilter = filterRoomSelect.value.trim();
    const typeFilter = filterTypeSelect.value.trim();

    // Apply Author filter only if user is Admin/Headmaster/Deputy/Staff and input is not empty
    // For Teacher, the author is already pre-filtered by the backend.
    if (authorFilter) {
        documentsDataTable.column(2).search(`^${authorFilter}$`, true, false); // Column index 2 for Author
    }
    if (yearFilter) {
        documentsDataTable.column(0).search(`^${yearFilter}$`, true, false); // Column index 0 for Year
    }
    if (subjectFilter) {
        documentsDataTable.column(3).search(`^${subjectFilter}$`, true, false); // Column index 3 for Subject
    }
    if (formFilter) {
        documentsDataTable.column(4).search(`^${formFilter}$`, true, false); // Column index 4 for Form
    }
    if (roomFilter) {
        documentsDataTable.column(5).search(`^${roomFilter}$`, true, false); // Column index 5 for Room
    }
    if (typeFilter) {
        documentsDataTable.column(6).search(`^${typeFilter}$`, true, false); // Column index 6 for Type
    }

    documentsDataTable.draw(); // Redraw the table with all applied filters
    console.log('ARCHIVE.JS: Frontend filters applied.');
}

/**
 * Carica e visualizza i file archiviati, recuperandoli dal backend con logica di filtro.
 */
async function loadArchivedFiles() {
    console.log(`ARCHIVE.JS: Calling loadArchivedFiles.`);

    if (!userData || !userData.profile) {
        console.warn('ARCHIVE.JS: No user data or profile available. Cannot load archived files.');
        documentsDataTable.clear().draw();
        return;
    }

    showSpinner(); // Show spinner when starting data fetch


    // Construct a cache key that includes profile and potentially googleName for Teachers
    const { cacheKey, postBody } = buildArchivedFilesRequestParams(userData, ''); // Passa 'data' come userData e una stringa vuota per il filtro manuale
    // Esegue la chiamata solo se la cacheKey è stata costruita (per prevenire chiamate con profili non validi)
    // La funzione buildArchivedFilesRequestParams già gestisce i casi di userData non valido.
    console.log("Cache Key:", cacheKey);
    console.log("Post Body:", postBody);
    //vecchia costruzione ora centralizzata in utils        
    //const cacheKey = `archivedFiles-${userData.profile}-${userData.profile === 'Teacher' ? (userData.googleName || '') : 'all'}`;

    try {
        const filesData = await fetchAndCacheArchivedFiles(cacheKey, 'drive/list', postBody);

        if (filesData && filesData.success && filesData.files) {
            allFilesData = filesData.files; // Store all files for frontend filtering
            documentsDataTable.clear().rows.add(allFilesData).draw();
            populateFilterOptions(allFilesData); // Populate filter dropdowns
            applyFrontendFilters(); // Apply any initial frontend filters
            console.log(`ARCHIVE.JS: Displayed ${allFilesData.length} files in the table.`);
        } else {
            console.error('ARCHIVE.JS: Failed to load archived files:', filesData ? filesData.message : 'Unknown error');
            documentsDataTable.clear().draw();
        }
    } catch (error) {
        console.error('ARCHIVE.JS: Error in loadArchivedFiles:', error);
        documentsDataTable.clear().draw();
    } finally {
        hideSpinner(); // Always hide spinner once the fetch (or error) is complete
    }
}

// Global function for delete (called from onclick)
async function deleteFile(fileId) {
    if (!confirm('Are you sure you want to delete this file?')) {
        return;
    }

    showSpinner(); // Show spinner for delete operation

    try {
        console.log(`ARCHIVE.JS: Deleting file with ID: ${fileId}`);
        const response = await fetch(`${window.BACKEND_BASE_URL}/api/drive/delete/${fileId}`, {
            method: 'DELETE'
        });
        const result = await response.json();
        if (result.success) {
            alert('File deleted successfully!');
            // After deletion, refresh the data.
            // Clear the relevant cache key to ensure a fresh fetch.
            const currentCacheKey = `archivedFiles-${userData.profile}-${userData.profile === 'Teacher' ? (userData.googleName || '') : (filterAuthorSelect.value.trim() || 'all')}`;
            localStorage.removeItem(currentCacheKey);
            localStorage.removeItem(`${currentCacheKey}Timestamp`);
            await loadArchivedFiles();
        } else {
            alert(`Failed to delete file: ${result.message}`);
        }
    } catch (error) {
        console.error('ARCHIVE.JS: Error deleting file:', error);
        alert(`Error deleting file: ${error.message}`);
    } finally {
        hideSpinner(); // Ensure spinner is hidden after delete attempt
    }
}

// Make deleteFile globally available if you use onclick in HTML
window.deleteFile = deleteFile;