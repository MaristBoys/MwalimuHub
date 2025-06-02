// js/login.js

// SOSTITUISCI CON L'URL DEL TUO BACKEND RENDER
const BACKEND_BASE_URL = 'https://google-api-backend-biu7.onrender.com';

// Definisci il percorso base in modo dinamico in base all'hostname.
// Se l'hostname include 'github.io', si tratta di un deployment su GitHub Pages, quindi includi il nome del repository.
// Altrimenti (es. per Live Server locale), usa una stringa vuota come percorso base.
//const BASE_PATH = window.location.hostname.includes('github.io') ? '/MwalimuHub' : '';

// Elementi UI (alcuni verranno cercati dopo il caricamento della navbar)
const googleSignInButton = document.querySelector('.g_id_signin');
const spinner = document.getElementById('spinner');
const resultDiv = document.getElementById('result');
const welcomeMessageDiv = document.getElementById('welcome-message');
const authenticatedContent = document.getElementById('authenticated-content');
const themeToggleButton = document.getElementById('theme-toggle');

// Nuovi elementi per la simulazione
const simulateLoginButton = document.getElementById('simulate-login-button');
const simulateLogoutButton = document.getElementById('simulate-logout-button');

// Variabili per gli elementi della navbar che verranno inizializzati dopo il caricamento
let mainNavbar;
let navbarUserInfo; // Info utente desktop (rimane per la parte centrale della navbar)
let mobileLogoutLink; // Bottone logout mobile
let navbarSpacer; // Mantenuto per riferimento, ma l'altezza è fissa in CSS
let hamburgerIcon; // Aggiunto per il menu mobile

// Elementi specifici del menu mobile (integrati da navbar.html)
let mobileMenuOverlay;
let uploadLinkMobile; // Keep this if the link is always visible, but remove profile check
// let dynamicMenuLinksContainer; // REMOVED
// let dynamicLinksSeparator;     // REMOVED


// Funzione per inizializzare gli event listener della navbar
function initializeNavbarListeners() {
    mainNavbar = document.getElementById('main-navbar');
    navbarUserInfo = document.getElementById('navbar-user-info');
    navbarSpacer = document.getElementById('navbar-spacer');
    hamburgerIcon = document.getElementById('hamburger-icon'); // Inizializza hamburgerIcon

    // Elementi del menu universale (dropdown)
    mobileMenuOverlay = document.getElementById('mobile-menu-overlay');
    mobileLogoutLink = document.getElementById('mobile-logout-link'); // Questo è l'unico bottone di logout
    uploadLinkMobile = document.getElementById('upload-link-mobile'); // Link upload mobile
    // dynamicMenuLinksContainer = document.getElementById('dynamic-menu-links'); // REMOVED
    // dynamicLinksSeparator = document.getElementById('dynamic-links-separator'); // REMOVED


    // Associa l'evento al bottone di logout (unico)
    if (mobileLogoutLink) {
        mobileLogoutLink.addEventListener('click', () => {
            logout(); // Chiama la funzione logout globale
            if (mobileMenuOverlay) {
                mobileMenuOverlay.classList.add('hidden'); // Chiudi il menu dopo il logout
            }
        });
    }

    // Gestione dello sfondo della navbar al passaggio del mouse
    if (mainNavbar) {
        mainNavbar.addEventListener('mouseenter', () => {
            if (mainNavbar.classList.contains('bg-transparent')) {
                mainNavbar.classList.remove('bg-transparent');
                mainNavbar.classList.add('bg-gray-800', 'bg-opacity-90');
            }
        });

        mainNavbar.addEventListener('mouseleave', () => {
            if (mainNavbar.classList.contains('bg-gray-800')) {
                mainNavbar.classList.remove('bg-gray-800', 'bg-opacity-90');
                mainNavbar.classList.add('bg-transparent');
            }
        });
    }

    // Listener per i pulsanti di simulazione (se presenti nella pagina)
    if (simulateLoginButton) simulateLoginButton.addEventListener('click', simulateLogin);
    if (simulateLogoutButton) simulateLogoutButton.addEventListener('click', simulateLogout);

    // Listener per l'apertura/chiusura del menu universale (dropdown)
    if (hamburgerIcon) {
        hamburgerIcon.addEventListener('click', (event) => {
            event.stopPropagation(); // Impedisce che il click si propaghi al document
            if (mobileMenuOverlay) {
                mobileMenuOverlay.classList.toggle('hidden'); // Toggle la visibilità
            }
        });
    }

    // Chiudi il dropdown se si clicca fuori
    document.addEventListener('click', (event) => {
        if (mobileMenuOverlay && !mobileMenuOverlay.contains(event.target) && !hamburgerIcon.contains(event.target)) {
            mobileMenuOverlay.classList.add('hidden');
        }
    });
}

// Funzione per aggiornare la UI in base allo stato di login
function updateUIForLoginState(isLoggedIn, userData = null, clearResult = true) {
    // Assicurati che gli elementi della navbar e lo spinner siano disponibili
    // Nota: googleSignInButton e authenticatedContent potrebbero non esistere in upload.html, quindi controlliamo la loro esistenza.
    const currentGoogleSignInButton = document.querySelector('.g_id_signin');
    const currentAuthenticatedContent = document.getElementById('authenticated-content');

    // Assicurati che gli elementi della navbar siano disponibili prima di manipolarli
    // Aggiunto un setTimeout per riprovare se gli elementi non sono ancora nel DOM
    // Removed checks for dynamicMenuLinksContainer and dynamicLinksSeparator
    if (!mainNavbar || !navbarUserInfo || !mobileLogoutLink || !hamburgerIcon || !uploadLinkMobile) {
        console.warn("Elementi della Navbar o dello Spinner non ancora disponibili. Riprovo l'aggiornamento UI...");
        setTimeout(() => updateUIForLoginState(isLoggedIn, userData, clearResult), 100);
        return;
    }

    // Gestione del pulsante Google Sign-In (presente solo in index.html)
    if (currentGoogleSignInButton) {
        if (isLoggedIn) {
            currentGoogleSignInButton.classList.add('hidden');
        } else {
            currentGoogleSignInButton.classList.remove('hidden');
        }
    }

    // Gestione del contenuto autenticato (presente solo in index.html)
    if (currentAuthenticatedContent) {
        if (isLoggedIn) {
            currentAuthenticatedContent.style.display = 'block';
        } else {
            currentAuthenticatedContent.style.display = 'none';
        }
    }

    // Gestione dell'icona hamburger (presente in navbar.html)
    if (hamburgerIcon) {
        if (isLoggedIn) {
            hamburgerIcon.classList.remove('hidden'); // Mostra l'icona hamburger
        } else {
            hamburgerIcon.classList.add('hidden'); // Nasconde l'icona hamburger
        }
    }

    // Aggiorna info utente desktop (parte centrale della navbar)
    if (navbarUserInfo) {
        if (isLoggedIn && userData) {
            navbarUserInfo.innerHTML = `
                <img src="${userData.googlePicture}" alt="Profile" class="inline-block h-8 w-8 rounded-full mr-2 border border-gray-300">
                <span>${userData.googleName} (${userData.profile})</span>
            `;
            navbarUserInfo.classList.remove('invisible-content'); // Rimuovi la classe per renderlo visibile
        } else {
            navbarUserInfo.innerHTML = ''; // Pulisci il contenuto
            navbarUserInfo.classList.add('invisible-content'); // Aggiungi la classe per renderlo invisibile
        }
    }

    // Gestione del link di logout mobile (presente in navbar.html)
    if (mobileLogoutLink) {
        if (isLoggedIn) {
            mobileLogoutLink.classList.remove('hidden'); // Mostra il bottone logout nel menu
        } else {
            mobileLogoutLink.classList.add('hidden'); // Nasconde il bottone logout nel menu
        }
    }

    // The Upload link will always be visible in the mobile menu, no profile check
    if (uploadLinkMobile) {
        uploadLinkMobile.classList.remove('hidden'); 
    }

    // Removed dynamic link generation and separator logic
    // if (dynamicMenuLinksContainer) {
    //     generateDynamicLinks(userData);
    // }
    // if (dynamicLinksSeparator) {
    //     if (dynamicMenuLinksContainer && dynamicMenuLinksContainer.children.length > 0) {
    //         dynamicLinksSeparator.classList.remove('hidden');
    //     } else {
    //         dynamicLinksSeparator.classList.add('hidden');
    //     }
    // }
    
    // Messaggio di benvenuto (presente solo in index.html)
    if (welcomeMessageDiv) {
        if (isLoggedIn) {
            welcomeMessageDiv.textContent = 'Benvenuto! Sei loggato.';
        } else {
            welcomeMessageDiv.textContent = '';
        }
    }

    if (spinner) spinner.style.display = 'none';
}

// Function to generate dynamic links (example: for classes or subjects) - REMOVED
// function generateDynamicLinks(userData) {
//     if (dynamicMenuLinksContainer) {
//         dynamicMenuLinksContainer.innerHTML = '';
//         if (userData && userData.classes && userData.classes.length > 0) {
//             userData.classes.forEach(cls => {
//                 const link = document.createElement('a');
//                 link.href = `${BASE_PATH}/pages/class-detail.html?class=${encodeURIComponent(cls)}`;
//                 link.className = 'menu-link w-full text-left py-2 px-4 rounded';
//                 link.textContent = `Classe: ${cls}`;
//                 dynamicMenuLinksContainer.appendChild(link);
//             });
//         }
//     }
// }


// Funzione di callback per Google Identity Services
async function handleCredentialResponse(response) {
    const idToken = response.credential;
    console.log("Received idToken from Google:", idToken);

    if (spinner) spinner.style.display = 'block';
    if (resultDiv) resultDiv.innerHTML = ''; // Puliamo il resultDiv qui all'inizio di ogni tentativo

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

        if (data.success) {
            if (resultDiv) resultDiv.innerHTML = `<p class="text-green-600 font-semibold">Accesso riuscito!</p>`;
            localStorage.setItem('isLoggedIn', 'true');
            localStorage.setItem('userData', JSON.stringify(data)); 
            updateUIForLoginState(true, data); 
        } else {
            if (resultDiv) resultDiv.innerHTML = `<p style="color:red;">Accesso negato: ${data.message}</p>`;
            localStorage.removeItem('isLoggedIn');
            localStorage.removeItem('userData');
            updateUIForLoginState(false, null, false); 
        }
    } catch (error) {
        console.error('Error contacting backend:', error);
        if (resultDiv) resultDiv.innerHTML = `<p style="color:red;">Errore nel contattare il backend</p>`;
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userData');
        updateUIForLoginState(false, null, false);
    } finally {
        if (spinner) spinner.style.display = 'none';
    }
}

// Funzione per gestire il logout (reale)
async function logout() {
    try {
        const res = await fetch(`${BACKEND_BASE_URL}/api/logout`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        const data = await res.json();
        console.log('Backend logout response:', data);

        if (data.success) {
            console.log('Logout backend riuscito.');
        } else {
            console.error('Errore nel logout backend:', data.message);
        }
    } catch (error) {
        console.error('Errore durante la richiesta di logout al backend:', error);
    } finally {
        localStorage.removeItem('isLoggedIn');
        localStorage.removeItem('userData');
        if (resultDiv) resultDiv.innerHTML = ''; 
        // Chiudi il menu universale se aperto al logout
        if (mobileMenuOverlay) {
            mobileMenuOverlay.classList.add('hidden');
        }
        updateUIForLoginState(false); // Questo rende il wrapper visibile

        if (typeof google !== 'undefined' && google.accounts && google.accounts.id) {
            google.accounts.id.disableAutoSelect();
            console.log('Google auto-select disabilitato.');

            // *** Forzare il re-rendering del pulsante Google (solo se presente nella pagina) ***
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
            }
        }
    }
}

// Funzione per simulare il login (se presente nella pagina)
function simulateLogin() {
    console.log("Simulating login...");
    const mockUserData = {
        name: "Simulato Utente",
        profile: "Teachers", // Keeping profile for navbarUserInfo display, but it won't affect menu links now
        googleName: "Simulato Google Name",
        googlePicture: "https://placehold.co/100x100/aabbcc/ffffff?text=SU",
        email: "simulato.utente@example.com"
    };
    localStorage.setItem('isLoggedIn', 'true');
    localStorage.setItem('userData', JSON.stringify(mockUserData));
    if (resultDiv) resultDiv.innerHTML = `<p class="text-green-600 font-semibold">Simulazione di Accesso Riuscita!</p>`;
    updateUIForLoginState(true, mockUserData);
}

// Funzione per simulare il logout (se presente nella pagina)
function simulateLogout() {
    console.log("Simulating logout...");
    localStorage.removeItem('isLoggedIn');
    localStorage.removeItem('userData');
    if (resultDiv) resultDiv.innerHTML = `<p class="text-gray-600 font-semibold">Simulazione di Logout Riuscita!</p>`;
    updateUIForLoginState(false);
}


// Funzione per caricare la navbar
async function loadNavbar() {
    try {
        // Carica la navbar da un file HTML esterno
        const response = await fetch(`/components/navbar.html`); 
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const navbarHtml = await response.text();
        const navbarPlaceholder = document.getElementById('navbar-placeholder');
        if (navbarPlaceholder) {
            navbarPlaceholder.innerHTML = navbarHtml;
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
                localStorage.removeItem('isLoggedIn');
                localStorage.removeItem('userData');
                isLoggedIn = false;
            }
        }
        updateUIForLoginState(isLoggedIn, userData);

    } catch (error) {
        console.error("Errore nel caricamento della navbar:", error);
        const navbarPlaceholder = document.getElementById('navbar-placeholder');
        if (navbarPlaceholder) {
            navbarPlaceholder.innerHTML = '<nav id="main-navbar" class="bg-red-800 text-white p-4 fixed w-full top-0 z-50">Errore nel caricamento della Navbar</nav>';
        }
    }
}

// Inizializzazione principale al caricamento del DOM
document.addEventListener('DOMContentLoaded', () => {
    // Carica la navbar all'avvio di OGNI pagina che include login.js
    loadNavbar();

    if (themeToggleButton) {
        themeToggleButton.addEventListener('click', () => {
            document.body.classList.toggle('dark-mode');
        });
    }
});

// Espone la funzione per l'inizializzazione esterna (se altri script volessero usarla, anche se ora è interna)
window.loadNavbar = loadNavbar;