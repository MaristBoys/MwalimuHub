// js/index.js
import { loadNavbar, updateUIForLoginState, wakeUpBackend, initializeThemeToggle } from '/MwalimuHub/js/utils.js';
import { logout, handleCredentialResponse, setPageSpecificUIElements, simulateLogin, simulateLogout } from '/MwalimuHub/js/login.js';

document.addEventListener('DOMContentLoaded', async () => {
    // Riferimenti DOM specifici di index.html
    const googleLoginSection = document.getElementById('google-login-section');
    const resultDiv = document.getElementById('result'); // Ottiene il riferimento a resultDiv qui!

    // NEW: Ottieni riferimenti per lo spinner di logout
    const logoutSpinner = document.getElementById('logout-spinner');

    // Passa questi riferimenti a login.js in modo che le sue funzioni possano usarli
    setPageSpecificUIElements(googleLoginSection, resultDiv, logoutSpinner);


    // Carica la navbar. Passa resultDiv per mostrare errori di caricamento navbar specifici della pagina.
    // Qui non forziamo l'opacità, quindi si mantiene il comportamento predefinito (trasparente con hover)
    await loadNavbar({ pageSpecificResultDiv: resultDiv });

    // Inizializza il toggle del tema, ora che il pulsante dovrebbe essere nel DOM
    initializeThemeToggle();

    // Attacca l'evento al bottone di logout nel menu overlay, ora che la navbar è caricata
    const logoutLink = document.getElementById('logout-link');
    if (logoutLink) {
        logoutLink.addEventListener('click', (event) => {
            event.preventDefault();
            event.stopPropagation();
            logout();
        });
    }

    // Inizializza lo stato di login dopo che la navbar è stata caricata
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
    // Passa gli elementi specifici della pagina (inclusi i riferimenti DOM) a updateUIForLoginState
    updateUIForLoginState(isLoggedIn, userData, googleLoginSection); 

    // Se il div result è vuoto dopo l'inizializzazione, assicurati che sia nascosto
    if (resultDiv && resultDiv.innerHTML.trim() === '') {
        resultDiv.classList.add('hidden');
    }


    // Sveglia il backend all'avvio della pagina index.html. Passa resultDiv per mostrare errori specifici.
    wakeUpBackend(resultDiv);

    ///COMMENTATI I LISTENER -- NON SERVONO, LI LASCIO PER IL FUTURO,
    /// le fuzioni simulateLogin e simulateLogout gestite in login.js non vengono più chaìamate (lasciate non commentate in login.js)
    // Attacca i listener per i pulsanti di simulazione direttamente in index.js
    ///const simulateLoginButton = document.getElementById('simulate-login-button');
    ///const simulateLogoutButton = document.getElementById('simulate-logout-button');

    ///if (simulateLoginButton) simulateLoginButton.addEventListener('click', simulateLogin);
    // Il logout simulato può usare la stessa funzione di logout "vera"
    //if (simulateLogoutButton) simulateLogoutButton.addEventListener('click', logout);
});

// Espone la funzione handleCredentialResponse globalmente per l'uso da parte della libreria Google Identity Services.
// Google Identity Services richiede una funzione globale per il callback.
window.handleCredentialResponse = handleCredentialResponse;
// Non è strettamente necessario esporre window.logout qui se tutti i listener sono attaccati in index.js,
// ma lo mantengo per retrocompatibilità e sicurezza se qualche parte del codice lo usa ancora globalmente.
window.logout = logout;
