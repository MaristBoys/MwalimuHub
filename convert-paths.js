const fs = require("fs");
const path = require("path");

// Nome del repository GitHub Pages
const repoName = "MwalimuHub";  // <-- Modifica con il nome corretto!

// Cartelle da modificare
const folders = ["", "js", "css", "components"];  // Aggiungi le cartelle necessarie

folders.forEach((folder) => {
    const dirPath = path.join(__dirname, folder);
    
    fs.readdirSync(dirPath).forEach((file) => {
        const filePath = path.join(dirPath, file);
        
        if (file.endsWith(".html") || file.endsWith(".css") || file.endsWith(".js")) {
            let content = fs.readFileSync(filePath, "utf8");

            // Sostituzione dei path assoluti negli attributi HTML
            content = content.replace(/src="\//g, `src="/MwalimuHub/${repoName}/`);
            content = content.replace(/href="\//g, `href="/MwalimuHub/${repoName}/`);

            // Sostituzione solo per le fetch che puntano al frontend
            content = content.replace(/fetch\("\//g, `fetch("/MwalimuHub/${repoName}/`);
            content = content.replace(/fetch\('\/(?!\${BACKEND_BASE_URL})/g, `fetch('/MwalimuHub/${repoName}/`);

            fs.writeFileSync(filePath, content, "utf8");
            console.log(`✅ Modificato: ${filePath}`);
        }
    });
});

console.log("Tutte le modifiche sono state applicate con successo!");