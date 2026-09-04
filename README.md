# Burraco - Gestionale Tornei di Burraco

Applicazione gestionale moderna, reattiva e portabile (per Windows, Web, iPad e Tablet) progettata per la gestione completa e il conteggio automatico dei punteggi nei tornei di Burraco, eliminando la necessità dei fogli Excel cartacei e manuali.

---

## 🚀 Come Avviare l'Applicazione

### 1. Applicazione Desktop (.exe portatile per Windows)

- Fai doppio clic su **`BurracoPunti.exe`**.
- File singolo portatile da ~39 MB senza necessità di installazione o Python sul PC.
- Salva automaticamente lo stato del torneo in locale su file **`torneo_data.json`**.

### 2. Versione Web / Mobile / iPad (100% Offline)

- **Online su GitHub Pages**: [https://gl0rgl0.github.io/BurracoPunti/](https://gl0rgl0.github.io/BurracoPunti/)
- **In locale**: fai doppio clic su `src/index.html` in qualsiasi browser.
- **Su iPad / iPhone / Android**: apri il link in Safari/Chrome e seleziona **"Aggiungi a schermata Home"** per aprirla a schermo intero come un'app nativa.

---

## 🎛️ Flusso di Gioco e Struttura a Schede

```text
[📋 Tabellone Iniziale] ➔ [🎯 Turno 1] [🎯 Turno 2] ... ➔ [🏆 Classifica] ➔ [🥇 Podio]
```

### 1. 📋 Tabellone Iniziale (Prima dei Round)

- **Compilazione rapida stile Excel**:
  - **Counter a sinistra (`#`)**: numerazione progressiva delle righe inserite (1, 2, 3...).
  - **Colonna Coppia / Giocatori**: campo editabile direttamente sulla riga per scrivere i nomi dei partecipanti.
  - **Colonna Numero Squadra**: casella numerica dedicata a destra per inserire il numero di tavolo/sorteggio assegnato alla coppia.
  - **Pulsante `➕ Aggiungi Coppia` sotto la tabella**: aggiunge una nuova riga con focus automatico sul campo nome.
  - **Inserimento con <kbd>Invio</kbd>**: premi Invio mentre scrivi per creare e passare automaticamente alla riga successiva.
  - **Pulsante `🗑️` con Mini Modale**: apertura di una modale personalizzata dell'app con richiesta di conferma prima dell'eliminazione.
  - **Incolla da Excel & Sorteggio**: strumenti opzionali attivabili dalle Impostazioni per importare elenchi massivi o estrarre numeri casuali da 1 a N.

### 2. 🎯 Viste dedicate per Turno (Turno 1, Turno 2, Turno 3, Turno 4...)

- Schede dedicate all'inserimento dei punteggi man mano che arrivano i foglietti di tavolo:
  - **N°** e **Nome Coppia** (vengono mostrate solo le coppie con nome compilato).
  - Casella numerica **Match Points (MP)**.
  - Casella numerica **Ventesimi (VP)**.
- **Navigazione Dinamica tra Turni**: il pulsante _"◀ Turno Precedente"_ viene nascosto automaticamente al primo turno (Turno 1) e _"Turno Successivo ▶"_ viene nascosto all'ultimo turno.
- **Navigazione da Tastiera**: premi <kbd>Invio</kbd> o <kbd>Freccia Giù</kbd> per passare automaticamente alla coppia successiva.

### 3. 🏆 Classifica Generale (Tabellone View-Only)

- Tabellone riassuntivo completo con MP e VP turno per turno:
  - **Ordinamento Automatico**: sempre ordinato per **Totale Ventesimi (VP)** decrescenti (con spareggio su Totale MP).
  - **Filtro Righe Vuote**: le righe senza nome o incomplete vengono escluse in automatico.
  - **View-Only e pulita**: senza colonna azioni, con celle a contrasto e badge per le prime 3 posizioni (1°, 2°, 3°).
  - **Filtro di Ricerca Rapido**: per filtrare la classifica in tempo reale per nome o per numero di squadra.

### 4. 🥇 Podio

- Schermata grafica celebrativa con podio a gradini 3D per le prime 3 coppie classificate e menzioni d'onore per le successive.

---

## 🎨 Design & Separatori Visivi

- **Header Actions**: separatore visivo sottile (`|`) tra il pulsante **🖨️ PDF** e **⚙️ Impostazioni**.
- **Barra di Navigazione**: divisori verticali leggeri (`|`) tra ogni singolo turno e tra le schede principali (`Tabellone Iniziale` | `Turni` | `Classifica` | `Podio`).

---

## 💾 Backup, Persistenza & Impostazioni

- **Salvataggio Multi-Giornata Storico (`torneo_data.json`)**:
  - Il file mantiene un'unica radice `title` e un'indentazione incrementale con i blocchi storici di tutte le serate giocate nominati per data in formato GGMMAA (es. `giornata_040926` per il 4 settembre 2026).
  - All'avvio di una **"✨ Nuova Serata"**, i punteggi e le coppie della serata corrente vengono archiviati nel loro blocco di data, azzerando il tabellone per inserire le nuove coppie e numeri.
  - Salvataggio automatico continuo sia in `localStorage` che nel file locale su Windows.
- **Backup e Ripristino JSON**:
  - **`💾 Salva Backup (.json)`**: scarica un file `.json` formattato con tutte le giornate archiviate.
  - **`📂 Carica Backup (.json)`**: ricarica un file `.json` per ripristinare o spostare l'intero campionato/torneo da un dispositivo all'altro.
- **Esportazione Excel (`.xlsx`)**: esportazione con foglio di Classifica Generale e Tabellone Completo di tutti i turni.
- **Stampa PDF Ufficiale**: impaginazione per stampa A4 con intestazione, date e sezioni firma arbitro/direttore di gara.
- **Personalizzazione Strumenti**: toggle switch nelle impostazioni per mostrare/nascondere _"Incolla Elenco da Excel"_, _"Sorteggio"_ e scheda _"Podio"_.

---

## 🛠️ Struttura del Progetto & Sviluppo

```text
Burraco/
├── src/
│   ├── index.html         # Struttura semantica, viste e finestre modali
│   ├── styles.css         # Design system Vanilla CSS (Slate & Sapphire, responsive, print)
│   ├── app.js             # Engine reattivo, calcolo spareggi VP/MP, persistenza, import/export
│   └── xlsx.full.min.js   # Libreria SheetJS per generazione Excel 100% offline
├── main.py                # Wrapper Python PyWebView per finestra desktop nativa Windows
├── build.py               # Script PyInstaller per compilazione dell'eseguibile portatile
├── test_engine.js         # Suite di test Node.js per verifica logica calcoli e spareggi
├── index.html             # Entry point con redirect automatico a src/ per GitHub Pages
└── README.md              # Documentazione del progetto
```

### Verifica e Test della Logica

Per eseguire i test unitari della logica di calcolo, spareggi e parser:

```bash
node test_engine.js
```

### Compilazione dell'Eseguibile Windows

Per generare l'eseguibile standalone `BurracoPunti.exe`:

```bash
python build.py
```

_(L'eseguibile viene generato direttamente nella cartella principale del progetto)._
