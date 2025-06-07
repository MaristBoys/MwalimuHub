// js/login.js
import {
    backendLoadingSpinner,
    waitingForBackendMessage,
    googleAuthButtonWrapper,
    serverStatusMessage,
    updateUIForLoginState,
    menuOverlay,
    // mainNavbar, // Non più necessario importare mainNavbar qui, viene passato da triggerNavbarPulse
    triggerNavbarPulse // Importa la nuova funzione
} from '/js/utils.js';
import { fetchAndCacheDropdownData, fetchAndCacheNewData } from '/js/prefetch.js';

// Variabili per gli elementi DOM specifici della pagina che verranno passati da index.js
// Queste variabili mantengono i riferimenti DOM tra le chiamate delle funzioni di login.js
let googleLoginSectionForUIUpdate = null;
let resultDivForUIUpdate = null;

function displayResult(messageHtml, type = 'info') {
    if (resultDivForUIUpdate) {
        resultDivForUIUpdate.innerHTML = messageHtml;
        resultDivForUIUpdate.classList.remove('hidden'); // Rimuove la classe hidden
        // Pulisci le classi di stato precedenti
        resultDivForUIUpdate.classList.remove('text-green-600', 'text-red-600', 'text-gray-600');
        // Aggiungi le classi appropriate
        if (type === 'success') {
            resultDivForUIUpdate.classList.add('text-green-600');
        } else if (type === 'error') {
            resultDivForUIUpdate.classList.add('text-red-600');
        } else {
            resultDivForUIUpdate.classList.add('text-gray-600');
        }
        // Assicurati che il div sia sempre visibile quando ha contenuto
        if (resultDivForUIUpdate.innerHTML.trim() !== '') {
            resultDivForUIUpdate.classList.remove('hidden');
        }
    }
}

/**
 * Funzione di callback per Google Identity Services. Gestisce la risposta dopo il login di Google.
 * @param {Object} response - L'oggetto risposta delle credenziali da Google.
 */
export async function handleCredentialResponse(response) {
    const idToken = response.credential;
    console.log("Received idToken from Google:", idToken.substring(0, 20));
    // messaggio non più utile in pagina resultDivForUIUpdate 
    // if (resultDivForUIUpdate) resultDivForUIUpdate.innerHTML = `<p class="text-gray-600">Received ID Token from Google: ${idToken.substring(0, 20)}...</p>`;

    if (backendLoadingSpinner) backendLoadingSpinner.classList.remove('hidden');
    if (waitingForBackendMessage) waitingForBackendMessage.classList.remove('hidden');
    if (serverStatusMessage) serverStatusMessage.innerHTML = 'Logging in...';
    if (googleAuthButtonWrapper) googleAuthButtonWrapper.classList.add('hidden');

    // Assicurati che il div result sia visibile durante il processo
    displayResult('<p class="text-gray-600">Received ID Token from Google. Logging in...</p>', 'info');

    try {
        // Usa window.BACKEND_BASE_URL definito in config.js
        const res = await fetch(`${window.BACKEND_BASE_URL}/api/google-login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            }
        });

        const data = await res.json();
        console.log('Backend response:', data);
       
        if (data.success) {
            displayResult(`<p class="font-semibold">Login successful! Welcome ${data.googleName}.</p>`, 'success');
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userData', JSON.stringify(data));
            // Passa gli elementi specifici della pagina come parametri alla funzione di utilità
            updateUIForLoginState(true, data, googleLoginSectionForUIUpdate);
            // TRIGGER NUOVA FUNZIONE: Attiva la pulsazione della navbar subito dopo il login
            triggerNavbarPulse();
            // Avvia il pre-fetching dei dati dopo un login riuscito (simultaneamente alla pulsazione)
            fetchAndCacheDropdownData();
            // Esempio per il nuovo prefetch
            fetchAndCacheNewData('myOtherData', 'my-new-endpoint');

        } else {
            displayResult(`<p>${data.message}</p>`, 'error');
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('userData');
            updateUIForLoginState(false, null, googleLoginSectionForUIUpdate);
        }
    } catch (error) {
        console.error('Error contacting backend:', error);
        displayResult(`<p>Error contacting Server: ${error.message || error}</p>`, 'error');  
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userData');
        updateUIForLoginState(false, null, googleLoginSectionForUIUpdate);
    } finally {
        if (backendLoadingSpinner) backendLoadingSpinner.classList.add('hidden');
        if (waitingForBackendMessage) waitingForBackendMessage.classList.add('hidden');
        // Non nascondere il bottone se il login non è riuscito
        if (!localStorage.getItem('isLoggedIn') && googleAuthButtonWrapper) {
            googleAuthButtonWrapper.classList.remove('hidden');
        }
        if (serverStatusMessage) serverStatusMessage.innerHTML = ''; // Pulisci il messaggio di stato del server   
    }
}

/**
 * Gestisce il processo di logout dell'utente.
 */
export async function logout() {
    displayResult('<p class="text-gray-600">Logging out...</p>', 'info'); // Mostra subito il messaggio di logout
    try {
        // Usa window.BACKEND_BASE_URL definito in config.js
        const res = await fetch(`${window.BACKEND_BASE_URL}/api/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        console.log('Backend logout response:', data);

        if (data.success) {
            displayResult('<p class="font-semibold">Server Logout Successful.</p>', 'success');
            console.log('Logout backend riuscito.');
        } else {
            displayResult(`<p>Server logout error: ${data.message}</p>`, 'error');
            console.error('Errore nel logout backend:', data.message);
        }
    } catch (error) {
        console.error('Errore durante la richiesta di logout al backend:', error);
        displayResult(`<p>Error while requesting logout to server: ${error.message || error}</p>`, 'error');
    } finally {
        // Pulizia dello stato locale e della cache
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userData');
        localStorage.removeItem('dropdownData');
        localStorage.removeItem('dropdownDataTimestamp');
        localStorage.removeItem('myOtherData'); // Rimuovi il nuovo prefetch
        localStorage.removeItem('myOtherDataTimestamp'); // Rimuovi il timestamp del nuovo prefetch

        // Chiudi il menu overlay se è aperto
        if (menuOverlay) {
            menuOverlay.classList.add('hidden');
        }
        // Aggiorna lo stato UI dopo il logout
        updateUIForLoginState(false, null, googleLoginSectionForUIUpdate);

        // Disabilita auto-select di Google Identity Services e re-renderizza il pulsante
        if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
            google.accounts.id.disableAutoSelect();
            console.log('Google auto-select disabilitato.');
            // Il messaggio qui verrà sovrascritto dal reindirizzamento
            // displayResult('Google auto-select disabilitato.', 'info'); 

            const googleButtonContainer = document.querySelector('.g_id_signin');
            if (googleButtonContainer) {
                google.accounts.id.renderButton(
                    googleButtonContainer,
                    {
                        type: "standard",
                        size: "large",
                        theme: "outline",
                        text: "sign_in_with",
                        shape: "rectangular",
                        logo_alignment: "left"
                    }
                );
                console.log('Google button re-render richiesto.');
                // Il messaggio qui verrà sovrascritto dal reindirizzamento
                // displayResult('Google button re-render richiesto.', 'info');
            }
        }
        // Reindirizza alla pagina index.html dopo un breve ritardo per permettere di vedere il messaggio di logout
        setTimeout(() => {
            window.location.replace("/MwalimuHub/index.html");
        }, 1500); // Ritardo di 1.5 secondi
    }
}

/**
 * Simula un login utente per scopi di test.
 */
export function simulateLogin() {
    const message = "Simulating login...";
    console.log(message);
    
    if (backendLoadingSpinner) backendLoadingSpinner.classList.remove('hidden');
    if (waitingForBackendMessage) waitingForBackendMessage.classList.remove('hidden');
    if (serverStatusMessage) serverStatusMessage.innerHTML = 'Simulating login...';
    if (googleAuthButtonWrapper) googleAuthButtonWrapper.classList.add('hidden');

    displayResult(`<p class="text-gray-600">Simulating login...</p>`, 'info');

    const mockUserData = {
        name: "Simulated User",
        profile: "Teachers",
        googleName: "Simulated Google Name",
        googlePicture: "https://placehold.co/100x100/aabbcc/ffffff?text=SU",
        email: "simulated.user@example.com"
    };
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userData', JSON.stringify(mockUserData));
    const successMessage = `<p class="text-green-600 font-semibold">Simulated Login Successful!</p>`;
    displayResult(`<p class="font-semibold">Simulated Login Successful!</p>`, 'success');
    console.log(successMessage);
    // Passa gli elementi specifici della pagina come parametri alla funzione di utilità
    updateUIForLoginState(true, mockUserData, googleLoginSectionForUIUpdate);

    // TRIGGER NUOVA FUNZIONE: Attiva la pulsazione della navbar subito dopo il login simulato
    triggerNavbarPulse();

    // Avvia il pre-fetching dei dati dopo un login simulato (simultaneamente alla pulsazione)
    fetchAndCacheDropdownData();
    fetchAndCacheNewData('myOtherData', 'my-new-endpoint');

    if (backendLoadingSpinner) backendLoadingSpinner.classList.add('hidden');
    if (waitingForBackendMessage) waitingForBackendMessage.classList.add('hidden');
    if (serverStatusMessage) serverStatusMessage.innerHTML = '';
    if (googleAuthButtonWrapper) googleAuthButtonWrapper.classList.remove('hidden');
}

/**
 * Simula un logout utente per scopi di test.
 */
export function simulateLogout() {
    const message = "Simulating logout...";
    console.log(message);
    displayResult(`<p class="text-gray-600">Simulating logout...</p>`, 'info');

    // Pulisci lo stato locale e la cache
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userData');
    localStorage.removeItem('dropdownData');
    localStorage.removeItem('dropdownDataTimestamp');
    localStorage.removeItem('myOtherData');
    localStorage.removeItem('myOtherDataTimestamp');

    displayResult(`<p class="font-semibold">Simulated Logout Successful!</p>`, 'success');
    console.log(successMessage);
    // Aggiorna lo stato UI dopo il logout simulato
    updateUIForLoginState(false, null, googleLoginSectionForUIUpdate);

    if (backendLoadingSpinner) backendLoadingSpinner.classList.add('hidden');
    if (waitingForBackendMessage) waitingForBackendMessage.classList.add('hidden');
    if (serverStatusMessage) serverStatusMessage.innerHTML = '';
    if (googleAuthButtonWrapper) googleAuthButtonWrapper.classList.remove('hidden');
}

/**
 * Imposta i riferimenti DOM specifici della pagina che le funzioni di login.js useranno.
 * Deve essere chiamata dallo script della pagina (es. index.js) all'inizializzazione.
 * @param {HTMLElement} googleLoginSection - Riferimento alla sezione di login di Google.
 * @param {HTMLElement} resultDiv - Riferimento al div per i messaggi di risultato.
 */
export function setPageSpecificUIElements(googleLoginSection, resultDiv) {
    googleLoginSectionForUIUpdate = googleLoginSection;
    resultDivForUIUpdate = resultDiv;
}

// TOGLIAMO I LISTENER DI SIMULAZIONE PERCHE NON UTILIZZATI PIU
/// Attacca i listener per i pulsanti di simulazione (se presenti nell'HTML di login.html).
/// Idealmente, questi listener dovrebbero essere gestiti dallo script principale della pagina (index.js).
/// Li manteniamo qui per retrocompatibilità se login.js venisse usato in una pagina che li definisce direttamente.
//document.addEventListener('DOMContentLoaded', () => {
//    const simulateLoginButton = document.getElementById('simulate-login-button');
//    const simulateLogoutButton = document.getElementById('simulate-logout-button');

//    if (simulateLoginButton) simulateLoginButton.addEventListener('click', simulateLogin);
//    if (simulateLogoutButton) simulateLogoutButton.addEventListener('click', logout); // Il logout simulato usa la funzione di logout vera
//});

// Espone le funzioni di login e logout globalmente per l'uso con Google Identity Services
// e per retrocompatibilità con eventuali handler onclick nell'HTML.
window.handleCredentialResponse = handleCredentialResponse;
window.logout = logout;

