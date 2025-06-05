// js/login.js

// SOSTITUISCI CON L'URL DEL TUO BACKEND RENDER
const BACKEND_BASE_URL = 'https://google-api-backend-biu7.onrender.com';

// Variabili globali per elementi UI (alcuni saranno inizializzati dopo il caricamento dinamico della navbar)
const spinner = document.getElementById('spinner');
const resultDiv = document.getElementById('result');
const themeToggleButton = document.getElementById('theme-toggle'); // Pulsante per il toggle del tema

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

// Stato per la visibilità del menu overlay (nuovo per gestire l'opacità della navbar)
let isMenuOverlayOpen = false;

// Funzione per "svegliare" il backend all'avvio della pagina
// Utile per servizi gratuiti che vanno in "sleep"
function wakeUpBackend() {
    const startTime = performance.now();
    fetch(BACKEND_BASE_URL)
        .then(response => {
            const endTime = performance.now();
            const duration = endTime - startTime;
            if (response.ok) {
                console.log('Backend svegliato con successo!');
                console.log(`Tempo di risposta del backend: ${duration.toFixed(2)} ms`);
            } else {
                console.warn('Chiamata di risveglio del backend non ha ricevuto una risposta OK:', response.status);
                console.log(`La chiamata ha impiegato: ${duration.toFixed(2)} ms (con risposta non OK)`);
            }
        })
        .catch(error => {
            const endTime = performance.now();
            const duration = endTime - startTime;
            console.error('Errore durante la chiamata di risveglio del backend:', error);
            console.log(`La chiamata ha impiegato: ${duration.toFixed(2)} ms (con errore di rete)`);
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
    // Il setTimeout ricorsivo è una buona pratica per elementi caricati dinamicamente
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
        } else {
            googleLoginSection.classList.remove('hidden');
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

    // Nasconde lo spinner
    if (spinner) spinner.style.display = 'none';
}

// Funzione di callback per Google Identity Services
async function handleCredentialResponse(response) {
    const idToken = response.credential;
    console.log("Received idToken from Google:", idToken);
    if (resultDiv) resultDiv.innerHTML = `<p class="text-gray-600">Received ID Token from Google: ${idToken.substring(0, 20)}...</p>`;

    if (spinner) spinner.style.display = 'block';
    // if (resultDiv) resultDiv.innerHTML = ''; // Lasciamo il messaggio "Received ID Token" un momento

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
        if (spinner) spinner.style.display = 'none';
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

            const googleButtonContainer = document.querySelector('.g_id_signin');
            if (googleButtonContainer) {
                googleButtonContainer.innerHTML = '';
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
                if (resultDiv) resultDiv.innerHTML += `<p class="text-gray-600">Google button re-render richiesto.</p>`;
            }
        }
        // Reindirizza alla pagina index.html dopo tutte le operazioni di logout
        window.location.replace('/index.html');
    }
}

// Funzione per simulare il login (se presente nella pagina)
function simulateLogin() {
    const message = "Simulando login...";
    console.log(message);
    if (resultDiv) resultDiv.innerHTML = `<p class="text-gray-600">${message}</p>`;

    const mockUserData = {
        name: "Simulato Utente",
        profile: "Teachers",
        googleName: "Simulato Google Name",
        googlePicture: "https://placehold.co/100x100/aabbcc/ffffff?text=SU",
        email: "simulato.utente@example.com"
    };
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userData', JSON.stringify(mockUserData));
    const successMessage = `<p class="text-green-600 font-semibold">Simulazione di Accesso Riuscita!</p>`;
    if (resultDiv) resultDiv.innerHTML += successMessage;
    console.log(successMessage);
    updateUIForLoginState(true, mockUserData);
}

// Funzione per simulare il logout (se presente nella pagina)
function simulateLogout() {
    const message = "Simulando logout...";
    console.log(message);
    if (resultDiv) resultDiv.innerHTML = `<p class="text-gray-600">${message}</p>`;

    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userData');
    const successMessage = `<p class="text-gray-600 font-semibold">Simulazione di Logout Riuscita!</p>`;
    if (resultDiv) resultDiv.innerHTML += successMessage;
    console.log(successMessage);
    updateUIForLoginState(false);
}

// Funzione per caricare la navbar dinamicamente
async function loadNavbar() {
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
                if (resultDiv) resultDiv.innerHTML += `<p style="color:red;">Errore nel parsing di userData da localStorage: ${e.message || e}</p>`;
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('userData');
                isLoggedIn = false;
            }
        }
        updateUIForLoginState(isLoggedIn, userData);

    } catch (error) {
        console.error("Errore nel caricamento della navbar:", error);
        if (resultDiv) resultDiv.innerHTML += `<p style="color:red;">Errore nel caricamento della navbar: ${error.message || error}</p>`;
        const navbarPlaceholder = document.getElementById('navbar-placeholder');
        if (navbarPlaceholder) {
            navbarPlaceholder.innerHTML = '<nav id="main-navbar" class="bg-red-800 text-white p-4 fixed w-full top-0 z-50">Errore nel caricamento della Navbar</nav>';
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