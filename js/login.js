// js/login.js

// SOSTITUISCI CON L'URL DEL TUO BACKEND RENDER
const BACKEND_BASE_URL = 'https://google-api-backend-biu7.onrender.com';

// Variabili globali per elementi UI
const resultDiv = document.getElementById('result');
const themeToggleButton = document.getElementById('theme-toggle'); // Pulsante per il toggle del tema

// Nuovi riferimenti per lo spinner e il messaggio di attesa
const backendLoadingSpinner = document.getElementById('backend-loading-spinner');
const waitingForBackendMessage = document.getElementById('waiting-for-backend-message');
const googleAuthButtonWrapper = document.getElementById('google-auth-button-wrapper'); // Wrapper del pulsante Google
const serverStatusMessage = document.getElementById('server-status-message'); // Riferimento al messaggio di stato del server

// Elementi per la simulazione del login/logout (se presenti nell'HTML)
const simulateLoginButton = document.getElementById('simulate-login-button');
const simulateLogoutButton = document.getElementById('simulate-logout-button');

// Variabili per gli elementi della navbar che verranno inizializzati dopo il suo caricamento dinamico
let mainNavbar;
let navbarUserInfo;
let logoutLink;
let hamburgerIcon;
let menuOverlay;
let uploadLink;

// Stato per la visibilità del menu overlay
let isMenuOverlayOpen = false;
// Variabile per tenere traccia dello stato del backend
let isBackendReady = false;

// Funzione per "svegliare" il backend all'avvio della pagina
// Utile per servizi gratuiti che vanno in "sleep"
function wakeUpBackend() {
    const startTime = performance.now();
    // Mostra spinner e messaggio di risveglio, nasconde il pulsante Google
    if (waitingForBackendMessage) waitingForBackendMessage.classList.remove('hidden');
    if (backendLoadingSpinner) backendLoadingSpinner.classList.remove('hidden');
    if (googleAuthButtonWrapper) googleAuthButtonWrapper.classList.add('hidden');
    if (serverStatusMessage) serverStatusMessage.innerHTML = 'Waiting for server response...'; // Initial message

    console.log('Backend starting...');

    fetch(BACKEND_BASE_URL)
        .then(response => {
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
                isBackendReady = false; // Server responded but status is not OK, treat as not ready for login
            }
        })
        .catch(error => {
            const endTime = performance.now();
            const duration = endTime - startTime;
            console.error('Error during backend wakeup call:', error);
            console.log(`Call took: ${duration.toFixed(2)} ms (with network error)`);
            if (serverStatusMessage) serverStatusMessage.innerHTML = `<span class="text-red-600">Server unavailable: ${error.message || 'Network error'} - please try again later.</span>`;
            isBackendReady = false; // Network error, backend is unreachable
        })
        .finally(() => {
            if (backendLoadingSpinner) backendLoadingSpinner.classList.add('hidden'); // Always hide the loading spinner

            if (isBackendReady) {
                // If backend is ready, hide status message and show Google button
                if (waitingForBackendMessage) waitingForBackendMessage.classList.add('hidden');
                if (googleAuthButtonWrapper) googleAuthButtonWrapper.classList.remove('hidden');
                console.log('Backend status update complete. Google button shown.');
                // Clear "Backend ready!" message after a short period
                setTimeout(() => {
                    if (serverStatusMessage) serverStatusMessage.innerHTML = '';
                    if (waitingForBackendMessage) waitingForBackendMessage.classList.add('hidden'); // Completely hide the message container
                }, 5000);
            } else {
                // If backend is NOT ready (error or non-OK status), keep status message visible
                // and Google button hidden.
                if (waitingForBackendMessage) waitingForBackendMessage.classList.remove('hidden');
                if (googleAuthButtonWrapper) googleAuthButtonWrapper.classList.add('hidden');
                console.log('Backend status update complete. Google button kept hidden (server not available).');
                // The "Server unavailable" message remains persistent
            }
        });
}

// Funzione per inizializzare tutti gli event listener relativi alla navbar e al tema
function initializeNavbarListeners() {
    // Inizializzazione degli elementi della navbar dopo che è stata caricata
    mainNavbar = document.getElementById('main-navbar');
    navbarUserInfo = document.getElementById('navbar-user-info');
    hamburgerIcon = document.getElementById('hamburger-icon');
    menuOverlay = document.getElementById('menu-overlay');
    logoutLink = document.getElementById('logout-link');
    uploadLink = document.getElementById('upload-link');

    // Associa l'evento al bottone di logout nel menu overlay
    if (logoutLink) {
        logoutLink.addEventListener('click', (event) => {
            event.preventDefault(); // Impedisce il comportamento predefinito del link
            event.stopPropagation(); // Impedisce la propagazione al document
            logout(); // Chiama la funzione di logout
            // Il resto della chiusura del menu e aggiornamento stato è in logout()
        });
    }

    // Gestione della trasparenza/opacità della navbar al passaggio del mouse
    if (mainNavbar) {
        mainNavbar.addEventListener('mouseenter', () => {
            // La navbar diventa sempre opaca quando il mouse entra
            if (mainNavbar.classList.contains('bg-transparent')) {
                mainNavbar.classList.remove('bg-transparent');
                mainNavbar.classList.add('bg-gray-800', 'bg-opacity-90');
            }
        });

        mainNavbar.addEventListener('mouseleave', () => {
            // La navbar torna trasparente solo se il menu overlay NON è aperto
            if (!isMenuOverlayOpen) {
                if (mainNavbar.classList.contains('bg-gray-800')) {
                    mainNavbar.classList.remove('bg-gray-800', 'bg-opacity-90');
                    mainNavbar.classList.add('bg-transparent');
                }
            }
        });
    }

    // Listener per i pulsanti di simulazione (se presenti nella pagina)
    if (simulateLoginButton) simulateLoginButton.addEventListener('click', simulateLogin);
    if (simulateLogoutButton) simulateLogoutButton.addEventListener('click', simulateLogout);

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
                setTimeout(() => {
                    if (mainNavbar && !mainNavbar.matches(':hover')) {
                        mainNavbar.classList.remove('bg-gray-800', 'bg-opacity-90');
                        mainNavbar.classList.add('bg-transparent');
                    }
                }, 50); // Piccolo ritardo per permettere al browser di aggiornare lo stato hover
            }
        }
    });

    // Gestione del toggle del tema (integrata qui da theme.js)
    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', () => {
            document.documentElement.classList.toggle('dark');
            // Puoi aggiungere qui la logica per cambiare l'icona del pulsante se vuoi
            // Ad esempio:
            // if (document.documentElement.classList.contains('dark')) {
            //     themeToggleButton.innerHTML = '🌞 / 🌙';
            // } else {
            //     themeToggleButton.innerHTML = '🌙 / 🌞';
            // }
        });
    }
}

// Funzione per aggiornare la UI in base allo stato di login
function updateUIForLoginState(isLoggedIn, userData = null) {
    const googleLoginSection = document.getElementById('google-login-section');
    const authenticatedContent = document.getElementById('authenticated-content'); // Potrebbe non esistere in tutte le pagine

    // Controllo robusto degli elementi della navbar prima di manipolarli
    if (!mainNavbar || !navbarUserInfo || !hamburgerIcon || !logoutLink || !uploadLink) {
        console.warn("Elementi della Navbar non ancora disponibili. Riprovo l'aggiornamento UI...");
        if (resultDiv) resultDiv.innerHTML += `<p class="text-yellow-600">Elementi UI non pronti, riprovo...</p>`;
        setTimeout(() => updateUIForLoginState(isLoggedIn, userData), 100);
        return;
    }

    // Gestione della sezione Google Login
    if (googleLoginSection) {
        if (isLoggedIn) {
            googleLoginSection.classList.add('hidden');
            // Nasconde anche il pulsante Google e il messaggio di attesa
            if (googleAuthButtonWrapper) googleAuthButtonWrapper.classList.add('hidden');
            if (waitingForBackendMessage) waitingForBackendMessage.classList.add('hidden');
        } else {
            googleLoginSection.classList.remove('hidden');
            // Quando non è loggato, lo stato iniziale (spinner o pulsante)
            // è gestito da wakeUpBackend() o da handleCredentialResponse() in caso di errore.
            // Non forziamo qui la visibilità per evitare conflitti.
        }
    }

    // Gestione del contenuto autenticato (presente solo in index.html)
    if (authenticatedContent) {
        if (isLoggedIn) {
            authenticatedContent.style.display = 'block';
        } else {
            authenticatedContent.style.display = 'none';
        }
    }

    // Gestione dell'icona hamburger
    if (hamburgerIcon) {
        if (isLoggedIn) {
            hamburgerIcon.classList.remove('hidden');
        } else {
            hamburgerIcon.classList.add('hidden');
        }
    }

    // Aggiorna info utente desktop
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

    // Gestione del link di logout nel menu overlay
    if (logoutLink) {
        if (isLoggedIn) {
            logoutLink.classList.remove('hidden');
        } else {
            logoutLink.classList.add('hidden');
        }
    }

    // Il link di upload è sempre visibile nel menu mobile
    if (uploadLink) {
        uploadLink.classList.remove('hidden');
    }
}

// Funzione di callback per Google Identity Services
async function handleCredentialResponse(response) {
    const idToken = response.credential;
    console.log("Received idToken from Google:", idToken);
    if (resultDiv) resultDiv.innerHTML = `<p class="text-gray-600">Received ID Token from Google: ${idToken.substring(0, 20)}...</p>`;

    // Mostra spinner di caricamento e nasconde il pulsante Google durante il login
    if (backendLoadingSpinner) backendLoadingSpinner.classList.remove('hidden');
    if (waitingForBackendMessage) waitingForBackendMessage.classList.remove('hidden'); // Mostra il contenitore del messaggio/spinner
    if (serverStatusMessage) serverStatusMessage.innerHTML = 'Logging in...'; // Messaggio di stato durante il login
    if (googleAuthButtonWrapper) googleAuthButtonWrapper.classList.add('hidden');

    try {
        const res = await fetch(`${BACKEND_BASE_URL}/api/google-login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`
            }
        });

        const data = await res.json();
        console.log('Backend response:', data);
        if (resultDiv) resultDiv.innerHTML += `<p class="text-gray-600">Backend response: ${JSON.stringify(data).substring(0, 50)}...</p>`;

        if (data.success) {
            const message = `<p class="text-green-600 font-semibold">Accesso riuscito! Benvenuto ${data.googleName}.</p>`;
            if (resultDiv) resultDiv.innerHTML = message;
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userData', JSON.stringify(data));
            updateUIForLoginState(true, data);
        } else {
            const message = `<p style="color:red;">Accesso negato: ${data.message}</p>`;
            if (resultDiv) resultDiv.innerHTML = message;
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('userData');
            updateUIForLoginState(false, null);
        }
    } catch (error) {
        console.error('Error contacting backend:', error);
        if (resultDiv) resultDiv.innerHTML = `<p style="color:red;">Error contacting backend: ${error.message || error}</p>`;
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userData');
        updateUIForLoginState(false, null);
    } finally {
        // Nasconde lo spinner e il messaggio, mostra il pulsante Google se il login non è riuscito
        if (backendLoadingSpinner) backendLoadingSpinner.classList.add('hidden');
        if (waitingForBackendMessage) waitingForBackendMessage.classList.add('hidden');
        if (!localStorage.getItem('isLoggedIn') && googleAuthButtonWrapper) {
            googleAuthButtonWrapper.classList.remove('hidden');
        }
    }
}

// Funzione per gestire il logout (reale)
async function logout() {
    if (resultDiv) resultDiv.innerHTML = `<p class="text-gray-600">Esecuzione logout in corso...</p>`;
    try {
        const res = await fetch(`${BACKEND_BASE_URL}/api/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        console.log('Backend logout response:', data);

        if (data.success) {
            const message = '<p class="text-green-600 font-semibold">Logout dal backend riuscito.</p>';
            if (resultDiv) resultDiv.innerHTML = message;
            console.log('Logout backend riuscito.');
        } else {
            const message = `<p style="color:red;">Errore nel logout backend: ${data.message}</p>`;
            if (resultDiv) resultDiv.innerHTML = message;
            console.error('Errore nel logout backend:', data.message);
        }
    } catch (error) {
        console.error('Errore durante la richiesta di logout al backend:', error);
        if (resultDiv) resultDiv.innerHTML = `<p style="color:red;">Errore durante la richiesta di logout al backend: ${error.message || error}</p>`;
    } finally {
        // Pulizia dello stato locale
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userData');
        // if (resultDiv) resultDiv.innerHTML = ''; // Rimosso per mantenere il messaggio di logout riuscito

        // Chiudi il menu universale e aggiorna lo stato
        if (menuOverlay) {
            menuOverlay.classList.add('hidden');
            isMenuOverlayOpen = false; // AGGIORNA LO STATO
        }
        updateUIForLoginState(false);

        // Gestione di Google Identity Services (se presente e abilitato)
        if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
            google.accounts.id.disableAutoSelect();
            console.log('Google auto-select disabilitato.');
            if (resultDiv) resultDiv.innerHTML += `<p class="text-gray-600">Google auto-select disabilitato.</p>`;

            const googleButtonContainer = document.querySelector('.g_id_signin'); // Questo dovrebbe essere 'google-auth-button-wrapper'
            if (googleButtonContainer) { // Qui si fa riferimento al div con classe g_id_signin, non al wrapper esterno
                // Dobbiamo re-renderizzare il solo bottone di Google se presente, non il wrapper esterno
                // La logica più pulita sarebbe re-renderizzare il pulsante g_id_signin all'interno del wrapper
                googleButtonContainer.innerHTML = ''; // Pulisce il contenuto interno del div g_id_signin
                google.accounts.id.renderButton(
                    googleButtonContainer, // Renderizza il pulsante nel div con classe g_id_signin
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
                if (resultDiv) resultDiv.innerHTML += `<p class="text-gray-600">Google button re-render richiesto.</p>`;
            }
        }
        // Reindirizza alla pagina index.html dopo tutte le operazioni di logout
        window.location.replace("/MwalimuHub/index.html');
    }
}

// Funzione per simulare il login (se presente nella pagina)
function simulateLogin() {
    const message = "Simulating login...";
    console.log(message);
    if (resultDiv) resultDiv.innerHTML = `<p class="text-gray-600">${message}</p>`;

    // Mostra spinner di login simulato
    if (backendLoadingSpinner) backendLoadingSpinner.classList.remove('hidden');
    if (waitingForBackendMessage) waitingForBackendMessage.classList.remove('hidden'); // Mostra contenitore
    if (serverStatusMessage) serverStatusMessage.innerHTML = 'Simulating login...';
    if (googleAuthButtonWrapper) googleAuthButtonWrapper.classList.add('hidden');


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
    if (resultDiv) resultDiv.innerHTML += successMessage;
    console.log(successMessage);
    updateUIForLoginState(true, mockUserData);

    // Nasconde spinner di login simulato e mostra pulsante
    if (backendLoadingSpinner) backendLoadingSpinner.classList.add('hidden');
    if (waitingForBackendMessage) waitingForBackendMessage.classList.add('hidden'); // Nasconde contenitore
    if (serverStatusMessage) serverStatusMessage.innerHTML = ''; // Pulisce messaggio
    if (googleAuthButtonWrapper) googleAuthButtonWrapper.classList.remove('hidden');
}

// Funzione per simulare il logout (se presente nella pagina)
function simulateLogout() {
    const message = "Simulating logout...";
    console.log(message);
    if (resultDiv) resultDiv.innerHTML = `<p class="text-gray-600">${message}</p>`;

    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userData');
    const successMessage = `<p class="text-gray-600 font-semibold">Simulated Logout Successful!</p>`;
    if (resultDiv) resultDiv.innerHTML += successMessage;
    console.log(successMessage);
    updateUIForLoginState(false);

    // Assicurati che il pulsante Google riappaia dopo simulazione logout
    // Vengono nascosti i messaggi di stato del server
    if (backendLoadingSpinner) backendLoadingSpinner.classList.add('hidden');
    if (waitingForBackendMessage) waitingForBackendMessage.classList.add('hidden');
    if (serverStatusMessage) serverStatusMessage.innerHTML = '';
    if (googleAuthButtonWrapper) googleAuthButtonWrapper.classList.remove('hidden');
}

// Funzione per caricare la navbar dinamicamente
async function loadNavbar() {
    try {
        const response = await fetch("/MwalimuHub/components/navbar.html");
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const navbarHtml = await response.text();
        const navbarPlaceholder = document.getElementById('navbar-placeholder');
        if (navbarPlaceholder) {
            navbarPlaceholder.innerHTML = navbarHtml;
            navbarPlaceholder.classList.remove('animate-pulse', 'bg-gray-800', 'h-[52px]');
        }

        // Una volta che la navbar è stata caricata nel DOM, inizializza i suoi listener
        initializeNavbarListeners();

        // Carica lo stato di login iniziale dopo che la navbar è stata caricata e inizializzata
        let isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';
        let userData = null;
        if (isLoggedIn) {
            try {
                userData = JSON.parse(localStorage.getItem('userData'));
            } catch (e) {
                console.error("Errore nel parsing di userData da localStorage:", e);
                if (resultDiv) resultDiv.innerHTML += `<p style="color:red;">Error parsing userData from localStorage: ${e.message || e}</p>`;
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('userData');
                isLoggedIn = false;
            }
        }
        updateUIForLoginState(isLoggedIn, userData);

    } catch (error) {
        console.error("Error loading navbar:", error);
        if (resultDiv) resultDiv.innerHTML += `<p style="color:red;">Error loading navbar: ${error.message || error}</p>`;
        const navbarPlaceholder = document.getElementById('navbar-placeholder');
        if (navbarPlaceholder) {
            navbarPlaceholder.innerHTML = '<nav id="main-navbar" class="bg-red-800 text-white p-4 fixed w-full top-0 z-50">Error loading Navbar</nav>';
            navbarPlaceholder.classList.remove('animate-pulse');
        }
    }
}

// Inizializzazione principale al caricamento del DOM
document.addEventListener('DOMContentLoaded', () => {
    // Carica la navbar all'avvio di OGNI pagina che include login.js
    loadNavbar();
    // Sveglia il backend all'avvio
    wakeUpBackend();
});

// Espone la funzione loadNavbar per l'inizializzazione esterna se necessaria (meno comune ora)
window.loadNavbar = loadNavbar;