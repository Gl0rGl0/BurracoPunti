# Burraco Tournament Manager (BurracoPunti)

## Purpose & Architecture

Applicazione per la gestione, il calcolo dei punteggi (VP / Victory Points e MP / Match Points) e la redazione delle classifiche per tornei di Burraco.

- **Frontend Web:** HTML5, CSS3 e Vanilla JavaScript in `src/` (`index.html`, `styles.css`, `app.js`, `xlsx.full.min.js`). Funziona sia aperto direttamente nel browser sia distribuito come app desktop.
- **Backend Desktop:** `main.py` usa `pywebview` per racchiudere l'interfaccia web in una finestra nativa Windows ed esporre l'API di salvataggio automatico su `statistiche_tornei.json` e il file dialog nativo per l'export Excel.
- **Build / Packaging:** `build.py` usa PyInstaller per creare l'eseguibile standalone `BurracoPunti.exe`.

## Repository Structure

- `src/index.html` — Layout dell'applicazione, tab di navigazione, modali e script loader.
- `src/styles.css` — Entry point master degli stili (include `src/css/*`).
- `src/css/` — Moduli CSS dedicati (`base.css`, `tables.css`, `podium.css`, `modals.css`, `print.css`).
- `src/app.js` — Controller UI e coordinamento viste DOM (`BurracoApp`).
- `src/js/` — Moduli logici puri (`utils.js`, `engine.js`, `storage.js`, `excel.js`).
- `statistiche_tornei.json` — Struttura JSON multi-giornata indicizzata per data (`serata_GGMMAA`).
- `test_engine.js` — Suite di test automatizzata per calcoli VP/MP, moduli, sorteggi e schema dati.
- `main.py` — Wrapper nativo PyWebView con API di persistenza locale ed export Excel.
- `build.py` — Script di build PyInstaller per la generazione di `BurracoPunti.exe`.

## Strict Constraints (Regole Mandatorie)

1. **NON COMPILARE:** Non eseguire mai autonomamente `python build.py` o PyInstaller. La compilazione dell'eseguibile viene gestita dall'utente.
2. **NON COMMATTARE / NON PUSHARE:** Non eseguire comandi `git commit` o `git push` a meno che l'utente non lo richieda esplicitamente.
3. **Persistenza Dati:** Le serate sono archiviate in `statistiche_tornei.json` con prefisso data `serata_GGMMAA` (es. `serata_040926` per il 4 settembre 2026).
4. **Accessibilità Visiva:** Mantenere dimensioni font adeguate e confortevoli per facilitare la lettura da parte dei giocatori senior.
5. **Verifica:** Eseguire `node test_engine.js` per verificare la correttezza logica e l'integrità dei file.
