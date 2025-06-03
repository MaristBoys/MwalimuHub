const fs = require("fs");
const path = require("path");

// Nome del repository GitHub Pages
const repoName = "MwalimuHub";  // <-- Modifica con il nome corretto!

// Avvia la scansione dalla cartella principale e tutte le sottocartelle
const rootFolder = __dirname;

// Memorizza i file già processati per evitare duplicazioni
const processedFiles = new Set();

// Funzione ricorsiva per processare file in tutte le sottocartelle
const processFiles = (dirPath) => {
    fs.readdirSync(dirPath).forEach((file) => {
        const filePath = path.join(dirPath, file);
        
        if (fs.statSync(filePath).isDirectory()) {
            processFiles(filePath); // Se è una cartella, continua la scansione
        } else if (!processedFiles.has(filePath)) {
            processedFiles.add(filePath); // Registra il file per evitare doppia modifica
            let content = fs.readFileSync(filePath, "utf8");

            // 🔹 **Gestione file HTML** (senza `fetch`)
            if (file.endsWith(".html")) {
                content = content.replace(/(src|href)=["']\/(?!${repoName})/g, `$1="/${repoName}/`);
            }

            // 🔹 **Gestione file CSS**
            else if (file.endsWith(".css")) {
                content = content.replace(/url\(["']\/(?!${repoName})/g, `url("/${repoName}/`);
            }

            // 🔹 **Gestione file JS** (aggiunta `.href = '/...'`)
            else if (file.endsWith(".js")) {
                content = content.replace(/fetch\(["']\/(?!${repoName}|${BACKEND_BASE_URL})/g, `fetch("/${repoName}/`);
                content = content.replace(/\.href = ["']\/(?!${repoName})/g, `.href = "/${repoName}/`);
            }

            fs.writeFileSync(filePath, content, "utf8");
            console.log(`✅ Modificato: ${filePath}`);
        }
    });
};

// Avvia la scansione della directory principale e delle sue sottocartelle
processFiles(rootFolder);

console.log("🚀 Tutte le modifiche sono state applicate con successo!");

/*
const fs = require("fs");
const path = require("path");

// Nome del repository GitHub Pages
const repoName = "MwalimuHub";  // <-- Modifica con il nome corretto!

// Cartelle da modificare
const folders = ["", "js", "css", "components", "pages"];  // Aggiungi le cartelle necessarie

// Funzione ricorsiva per processare file in tutte le sottocartelle
const processFiles = (dirPath) => {
    fs.readdirSync(dirPath).forEach((file) => {
        const filePath = path.join(dirPath, file);
        
        if (fs.statSync(filePath).isDirectory()) {
            processFiles(filePath); // Se è una cartella, continua la scansione
        } else if (file.endsWith(".html") || file.endsWith(".css") || file.endsWith(".js")) {
            let content = fs.readFileSync(filePath, "utf8");

            // Evita di aggiungere il prefisso due volte (solo se non è già presente)
            content = content.replace(/(src|href)=["']\/(?!${repoName})/g, `$1="/${repoName}/`);
            content = content.replace(/fetch\(["']\/(?!${repoName}|${BACKEND_BASE_URL})/g, `fetch("/${repoName}/`);

            // ✅ Aggiunta gestione per `url('/...')` SOLO nei file CSS
            if (file.endsWith(".css")) {
                content = content.replace(/url\(["']\/(?!${repoName})/g, `url("/${repoName}/`);
            }

            fs.writeFileSync(filePath, content, "utf8");
            console.log(`✅ Modificato: ${filePath}`);
        }
    });
};

// Avvia la scansione per ogni cartella principale
folders.forEach((folder) => {
    processFiles(path.join(__dirname, folder));
});

console.log("🚀 Tutte le modifiche sono state applicate con successo!");


/*






/*
const fs = require("fs");
const path = require("path");

// Nome del repository GitHub Pages
const repoName = "MwalimuHub";  // <-- Modifica con il nome corretto!

// Cartelle da modificare
const folders = ["", "js", "css", "components", "pages"];  // Aggiungi le cartelle necessarie

folders.forEach((folder) => {
    const dirPath = path.join(__dirname, folder);
    
    fs.readdirSync(dirPath).forEach((file) => {
        const filePath = path.join(dirPath, file);
        
        if (file.endsWith(".html") || file.endsWith(".css") || file.endsWith(".js")) {
            let content = fs.readFileSync(filePath, "utf8");

            // Sostituzione dei path assoluti negli attributi HTML
            content = content.replace(/src="\//g, `src="/${repoName}/`);
            content = content.replace(/href="\//g, `href="/${repoName}/`);

            // Sostituzione solo per le fetch che puntano al frontend
            content = content.replace(/fetch\("\//g, `fetch("/${repoName}/`);
            content = content.replace(/fetch\('\/(?!\${BACKEND_BASE_URL})/g, `fetch('/${repoName}/`);

            fs.writeFileSync(filePath, content, "utf8");
            console.log(`✅ Modificato: ${filePath}`);
        }
    });
});

console.log("Tutte le modifiche sono state applicate con successo!");
*/