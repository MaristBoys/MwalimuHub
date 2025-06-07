// js/utils.js

// Costante per la durata di validità del cache in localStorage (24 ore in millisecondi)
export const CACHE_DURATION_MS = 24 * 60 * 60 * 1000;

// Riferimenti agli elementi UI che sono VERAMENTE GLOBALI o parte della navbar universale
export const themeToggleButton = document.getElementById('theme-toggle');

// Elementi legati allo stato del backend/autenticazione che possono essere su più pagine
export const backendLoadingSpinner = document.getElementById('backend-loading-spinner');
export const waitingForBackendMessage = document.getElementById('waiting-for-backend-message');
export const googleAuthButtonWrapper = document.getElementById('google-auth-button-wrapper');
export const serverStatusMessage = document.getElementById('server-status-message');

// Variabili per gli elementi della navbar che verranno inizializzati dopo il suo caricamento dinamico
export let mainNavbar;
export let navbarUserInfo;
export let logoutLink;
export let hamburgerIcon;
export let menuOverlay;
export let uploadLink;

// Stato per la visibilità del menu overlay
export let isMenuOverlayOpen = false;

/**
 * Inizializza tutti gli event listener relativi alla navbar.
 * Deve essere chiamata dopo che la navbar è stata caricata nel DOM.
 * @param {boolean} [forceOpaque=false] - Se true, la navbar sarà forzata ad essere opaca e non reagirà all'hover.
 */
export function initializeNavbarListeners(forceOpaque = false) {
    // Inizializzazione degli elementi della navbar dopo che è stata caricata
    mainNavbar = document.getElementById('main-navbar');
    navbarUserInfo = document.getElementById('navbar-user-info');
    hamburgerIcon = document.getElementById('hamburger-icon');
    menuOverlay = document.getElementById('menu-overlay');
    logoutLink = document.getElementById('logout-link');
    uploadLink = document.getElementById('upload-link');

    if (mainNavbar) {
        if (forceOpaque) {
            // Rimuovi le classi di trasparenza e aggiungi quelle di opacità
            mainNavbar.classList.remove('bg-transparent');
            mainNavbar.classList.add('bg-gray-800', 'bg-opacity-90');
            // Rimuovi i listener per l'hover se la navbar deve essere sempre opaca
            mainNavbar.removeEventListener('mouseenter', mainNavbarMouseEnterHandler);
            mainNavbar.removeEventListener('mouseleave', mainNavbarMouseLeaveHandler);
        } else {
            // Aggiungi i listener solo se la navbar non è forzata ad essere opaca
            mainNavbar.addEventListener('mouseenter', mainNavbarMouseEnterHandler);
            mainNavbar.addEventListener('mouseleave', mainNavbarMouseLeaveHandler);
        }
    }

    // Listener per l'apertura/chiusura del menu universale (dropdown)
    if (hamburgerIcon) {
        hamburgerIcon.addEventListener('click', (event) => {
            event.stopPropagation(); // Impedisce la propagazione al document
            if (menuOverlay) {
                menuOverlay.classList.toggle('hidden');
                isMenuOverlayOpen = !menuOverlay.classList.contains('hidden'); // Aggiorna lo stato del menu

                if (isMenuOverlayOpen) {
                    // Se il menu è aperto, forza la navbar ad essere opaca
                    if (mainNavbar) {
                        mainNavbar.classList.remove('bg-transparent');
                        mainNavbar.classList.add('bg-gray-800', 'bg-opacity-90');
                    }
                }
            }
        });
    }

    // Chiudi il dropdown se si clicca fuori
    document.addEventListener('click', (event) => {
        // Assicurati che menuOverlay e hamburgerIcon esistano e non siano nascosti
        if (menuOverlay && hamburgerIcon && !menuOverlay.classList.contains('hidden')) {
            if (!menuOverlay.contains(event.target) && !hamburgerIcon.contains(event.target)) {
                menuOverlay.classList.add('hidden');
                isMenuOverlayOpen = false; // Aggiorna lo stato del menu

                // Quando il menu viene chiuso cliccando fuori, riporta la navbar trasparente
                // solo se il mouse non è attualmente sulla navbar (per evitare lampeggiamenti)
                // Questo timeout è ancora necessario per la transizione fluida,
                // ma il comportamento di trasparenza è soggetto a 'forceOpaque'
                setTimeout(() => {
                    if (mainNavbar && !mainNavbar.matches(':hover') && !forceOpaque) {
                        mainNavbar.classList.remove('bg-gray-800', 'bg-opacity-90');
                        mainNavbar.classList.add('bg-transparent');
                    }
                }, 50); // Piccolo ritardo per permettere al browser di aggiornare lo stato hover
            }
        }
    });
}

// Handler separati per gli eventi mouseenter e mouseleave della navbar
function mainNavbarMouseEnterHandler() {
    if (mainNavbar.classList.contains('bg-transparent')) {
        mainNavbar.classList.remove('bg-transparent');
        mainNavbar.classList.add('bg-gray-800', 'bg-opacity-90');
    }
}

function mainNavbarMouseLeaveHandler() {
    if (!isMenuOverlayOpen) {
        if (mainNavbar.classList.contains('bg-gray-800')) {
            mainNavbar.classList.remove('bg-gray-800', 'bg-opacity-90');
            mainNavbar.classList.add('bg-transparent');
        }
    }
}


/**
 * Inizializza l'event listener per il pulsante di toggle del tema.
 * Questa funzione dovrebbe essere chiamata una volta che il pulsante del tema è disponibile nel DOM.
 */
export function initializeThemeToggle() {
    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', () => {
            document.documentElement.classList.toggle('dark');
            // Puoi aggiungere qui la logica per salvare la preferenza del tema in localStorage
            // o per cambiare l'icona del pulsante se vuoi.
        });
    }
}

/**
 * Aggiorna la UI in base allo stato di login.
 * Riceve riferimenti DOM specifici della pagina come parametri.
 *
 * @param {boolean} isLoggedIn - Indica se l'utente è loggato.
 * @param {Object|null} userData - Dati dell'utente loggato.
 * @param {HTMLElement|null} [pageSpecificGoogleLoginSection=null] - Sezione HTML del login di Google, specifica della pagina.
 */
export function updateUIForLoginState(isLoggedIn, userData = null, pageSpecificGoogleLoginSection = null) {
    // Re-ottieni i riferimenti della navbar (potrebbero non essere stati inizializzati se la navbar non è ancora caricata)
    mainNavbar = document.getElementById('main-navbar');
    navbarUserInfo = document.getElementById('navbar-user-info');
    hamburgerIcon = document.getElementById('hamburger-icon');
    logoutLink = document.getElementById('logout-link');
    uploadLink = document.getElementById('upload-link');

    // Gestione della sezione Google Login (se fornita e esiste)
    if (pageSpecificGoogleLoginSection) {
        if (isLoggedIn) {
            pageSpecificGoogleLoginSection.classList.add('hidden');
            if (googleAuthButtonWrapper) googleAuthButtonWrapper.classList.add('hidden');
            if (waitingForBackendMessage) waitingForBackendMessage.classList.add('hidden');
        } else {
            pageSpecificGoogleLoginSection.classList.remove('hidden');
        }
    }

    // Gestione dell'icona hamburger (parte della navbar universale)
    if (hamburgerIcon) {
        if (isLoggedIn) {
            hamburgerIcon.classList.remove('hidden');
        } else {
            hamburgerIcon.classList.add('hidden');
        }
    }

    // Aggiorna info utente desktop (parte della navbar universale)
    if (navbarUserInfo) {
        if (isLoggedIn && userData) {
            navbarUserInfo.innerHTML = `
                <img src="${userData.googlePicture}" alt="Profile" class="inline-block h-8 w-8 rounded-full mr-2 border border-gray-300">
                <span>${userData.googleName} (${userData.profile})</span>
            `;
            navbarUserInfo.classList.remove('invisible-content');
        } else {
            navbarUserInfo.innerHTML = '';
            navbarUserInfo.classList.add('invisible-content');
        }
    }

    // Gestione del link di logout nel menu overlay (parte della navbar universale)
    if (logoutLink) {
        if (isLoggedIn) {
            logoutLink.classList.remove('hidden');
        } else {
            logoutLink.classList.add('hidden');
        }
    }

    // Il link di upload è sempre visibile nel menu mobile (parte della navbar universale)
    if (uploadLink) {
        uploadLink.classList.remove('hidden');
    }
}

/**
 * Tenta di "svegliare" il backend inviando una richiesta alla sua base URL.
 * Utile per servizi gratuiti che possono andare in "sleep".
 * @param {HTMLElement|null} [pageSpecificResultDiv=null] - Div per i messaggi di risultato, specifico della pagina, usato per errori critici.
 * @returns {Promise<boolean>} - True se il backend è pronto, false altrimenti.
 */
export async function wakeUpBackend(pageSpecificResultDiv = null) {
    const startTime = performance.now();
    if (waitingForBackendMessage) waitingForBackendMessage.classList.remove('hidden');
    if (backendLoadingSpinner) backendLoadingSpinner.classList.remove('hidden');
    if (googleAuthButtonWrapper) googleAuthButtonWrapper.classList.add('hidden');
    if (serverStatusMessage) serverStatusMessage.innerHTML = 'Waiting for server response...';

    console.log('Backend starting...');
    let isBackendReady = false;

    try {
        // Usa window.BACKEND_BASE_URL definito in config.js
        const response = await fetch(window.BACKEND_BASE_URL);
        const endTime = performance.now();
        const duration = endTime - startTime;

        if (response.ok) {
            console.log('Backend successfully awakened!');
            console.log(`Backend response time: ${duration.toFixed(2)} ms`);
            if (serverStatusMessage) serverStatusMessage.innerHTML = `<span class="text-green-600">Backend ready! (${duration.toFixed(2)} ms)</span>`;
            isBackendReady = true;
        } else {
            console.warn('Backend wakeup call did not receive an OK response:', response.status);
            console.log(`Call took: ${duration.toFixed(2)} ms (with non-OK response)`);
            if (serverStatusMessage) serverStatusMessage.innerHTML = `<span class="text-yellow-600">Backend awakened, but with status: ${response.status} (${duration.toFixed(2)} ms)</span>`;
        }
    } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;
        console.error('Error during backend wakeup call:', error);
        console.log(`Call took: ${duration.toFixed(2)} ms (with network error)`);
        if (serverStatusMessage) serverStatusMessage.innerHTML = `<span class="text-red-600">Server unavailable: ${error.message || 'Network error'} - please try again later.</span>`;
        if (pageSpecificResultDiv) { // Scrive in resultDiv solo se fornito
            pageSpecificResultDiv.innerHTML = `<p style="color:red;">Error contacting backend: ${error.message || error}</p>`;
        }
    } finally {
        if (backendLoadingSpinner) backendLoadingSpinner.classList.add('hidden');

        if (isBackendReady) {
            if (waitingForBackendMessage) waitingForBackendMessage.classList.add('hidden');
            if (googleAuthButtonWrapper) googleAuthButtonWrapper.classList.remove('hidden');
            console.log('Backend status update complete.');
            setTimeout(() => {
                if (serverStatusMessage) serverStatusMessage.innerHTML = '';
                if (waitingForBackendMessage) waitingForBackendMessage.classList.add('hidden');
            }, 5000);
        } else {
            if (waitingForBackendMessage) waitingForBackendMessage.classList.remove('hidden');
            if (googleAuthButtonWrapper) googleAuthButtonWrapper.classList.add('hidden');
            console.log('Backend status update complete. Google button kept hidden (server not available).');
        }
        return isBackendReady;
    }
}

/**
 * Carica dinamicamente il contenuto della navbar in un placeholder.
 * @param {Object} [options={}] - Opzioni di configurazione per la navbar.
 * @param {HTMLElement|null} [options.pageSpecificResultDiv=null] - Div per i messaggi di risultato, specifico della pagina, usato per errori di caricamento.
 * @param {boolean} [options.forceNavbarOpaque=false] - Se true, la navbar sarà forzata ad essere opaca.
 */
export async function loadNavbar(options = {}) {
    const { pageSpecificResultDiv = null, forceNavbarOpaque = false } = options;
    try {
        const response = await fetch("/components/navbar.html");
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const navbarHtml = await response.text();
        const navbarPlaceholder = document.getElementById('navbar-placeholder');
        if (navbarPlaceholder) {
            navbarPlaceholder.innerHTML = navbarHtml;
            navbarPlaceholder.classList.remove('animate-pulse', 'bg-gray-800', 'h-[52px]');
        }

        initializeNavbarListeners(forceNavbarOpaque); // Passa l'opzione alla funzione di inizializzazione dei listener

    } catch (error) {
        console.error("Error loading navbar:", error);
        if (pageSpecificResultDiv) pageSpecificResultDiv.innerHTML += `<p style="color:red;">Error loading navbar: ${error.message || error}</p>`;
        const navbarPlaceholder = document.getElementById('navbar-placeholder');
        if (navbarPlaceholder) {
            navbarPlaceholder.innerHTML = '<nav id="main-navbar" class="bg-red-800 text-white p-4 fixed w-full top-0 z-50">Error loading Navbar</nav>';
            navbarPlaceholder.classList.remove('animate-pulse');
        }
    }
}

/**
 * Attiva un'animazione "pulse" sulla navbar per un numero specifico di volte,
 * rendendola contemporaneamente grigia e opaca.
 * @param {number} [numberOfPulses=5] - Il numero di volte che la navbar deve pulsare.
 * @param {number} [pulseDurationMs=1000] - La durata di una singola animazione pulse in millisecondi (default Tailwind).
 */
export function triggerNavbarPulse(numberOfPulses = 5, pulseDurationMs = 1000) {
    if (mainNavbar) {
        // Assicurati che la navbar sia opaca e grigia subito
        mainNavbar.classList.remove('bg-transparent');
        mainNavbar.classList.add('bg-red-500', 'bg-opacity-100');

        // Applica l'animazione di pulse
        mainNavbar.classList.add('animate-pulse');

        // Rimuovi l'animazione 'animate-pulse' dopo il numero desiderato di pulsazioni,
        // E *poi* ripristina lo sfondo trasparente.
        setTimeout(() => {
            mainNavbar.classList.remove('animate-pulse');
            // Riabilita i listener per l'hover se la navbar non deve rimanere opaca forzatamente
            // (Assumendo che in questo contesto non sia forceOpaque, ma lo controlliamo per sicurezza)
            if (!mainNavbar.matches(':hover')) { // Solo se il mouse non è sopra la navbar
                mainNavbar.classList.remove('bg-red-500', 'bg-opacity-100');
                mainNavbar.classList.add('bg-transparent');
            }
            // Puoi aggiungere qui la logica per ripristinare il comportamento trasparente della navbar se desiderato
            // Ad esempio, ri-attaccando gli event listener mouseenter/mouseleave se non sono stati forzati a essere rimossi
            // tramite initializeNavbarListeners(true).
            // Per semplicità e robustezza, l'hover della navbar dovrebbe essere già gestito da initializeNavbarListeners
            // e qui ci preoccupiamo solo del background.
        }, numberOfPulses * pulseDurationMs);
    }
}
