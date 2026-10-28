# Concept Brief: Tournament Lifecycle Guard & Score Protection

**Feature Concept:** Introduce a tournament lifecycle guard that locks pair structure upon 'Conferma Iscrizioni' (auto-cleaning blank rows and dimming unconfirmed round tabs), while permitting non-destructive name edits. Completed rounds receive a touch-protective blur overlay with an explicit 'Modifica Punteggi' unlock, lifting automatically once all rounds conclude.

---

## 1. Executive Summary & Design Rationale

In club and senior-level Burraco tournaments, two operational vulnerabilities frequently occur during live operation on laptops and touch tablets:
1. **Accidental Structure Shifts:** Mid-tournament additions, row deletions, or stray empty rows cause table desynchronization and disrupt the Mitchell pairing rotation (`BurracoEngine.getMitchellPairings`).
2. **Accidental Touch Edits:** Directors scrolling or passing around tablets easily tap numeric input fields in past rounds, silently altering validated scores and invalidating VP totals.

The **Tournament Lifecycle Guard** introduces formal, non-intrusive phase boundaries:
- **Phase A (Setup):** Registration open; pairs and lots entered; round tabs dimmed.
- **Phase B (Active Tournament):** "Conferma Iscrizioni" strips empty rows, assigns missing lot numbers randomly from available numbers in 1..N (preserving manual lot inputs), locks pair count and lot inputs, unlocks round tabs, and **remains on the initial board** so players and directors can clearly read their assigned lot/table numbers, while **preserving inline name editing** (for spelling/substitution).
- **Phase C (In-Round Scoring):** Live scoring per table with real-time consistency checks.
- **Phase D (Round Concluded):** Once VP consistency is verified (`res.valid === true`), a touch-protective frosted glass overlay locks the table against accidental taps, unlockable on-demand via `🔓 Modifica Punteggi`.
- **Phase E (Tournament Complete):** When all rounds are verified, protective blur overlays auto-lift for seamless post-tournament review, leaderboard presentation, and WhatsApp image export.

---

## 2. Multi-Lens Brainstorm Findings

### Lens 1: UX & Ergonomics Brainstormer (`egm-design`)
* **Touch-Friendly Controls for Senior Eyes:**
  - "Conferma Iscrizioni" must feature high-contrast coloring (Emerald `#059669` or Primary Blue) with a minimum touch target of 44×44px and an unmistakable state icon (`🔒 Iscrizioni Confermate` / `📝 Conferma Iscrizioni`).
  - Font size zoom controls (`#font-zoom-group`) must scale the overlay and unlock buttons seamlessly via the existing `var(--app-zoom)` CSS variable.
* **Non-Blocking Dimmed Tabs:**
  - Round tabs should not simply vanish; dimming them (`opacity: 0.45; filter: grayscale(0.5); cursor: not-allowed;`) provides spatial continuity.
  - Clicking a dimmed tab displays a lightweight, dismissible toast or banner: *"Conferma le iscrizioni nel Tabellone Iniziale per iniziare il Turno 1"*.
* **Protective Overlay Ergonomics:**
  - The completed round overlay should use a subtle blur (`backdrop-filter: blur(2px); background: rgba(15, 23, 42, 0.15);`) that preserves legibility of the table underneath while intercepting tap/click events.
  - A centered or floating header pill: `✅ Turno Concluso (VP Verificati)` accompanied by an explicit `🔓 Modifica Punteggi` button.
  - When unlocked, the banner changes to Amber: `⚠️ Modifica Punteggi Attiva` with a `🔒 Blocca Turno` action.

### Lens 2: Codebase Details Brainstormer (`egm-codebase-details`)
* **State Schema Additions in `src/js/storage.js`:**
  - `registrationConfirmed: boolean` (default `false` for new evening, initialized in `getDefaultState()`).
  - `unlockedRounds: Record<number, boolean>` (transient or persistent in `state.unlockedRounds`).
  - Persistence across multi-giornata: store `registrationConfirmed` inside each `state.allGiornate[key]`.
* **Blank Row Auto-Cleaning Logic:**
  - During `confirmRegistrations()`:
    ```javascript
    this.state.pairs = this.state.pairs.filter(p => p.name && p.name.trim() !== '');
    ```
  - Validation safeguard: ensure at least 2 valid pairs remain before allowing confirmation.
  - If pairs have missing `lotNumber`, auto-fill sequential lots or notify the director.
* **Name Mutation vs. Structural Immutability:**
  - In `renderInitialTable()`: when `registrationConfirmed === true`, hide/disable `#btn-add-pair-row`, hide `.btn-delete-initial-pair`, and set `.initial-lot-input` to `disabled` / `readonly`.
  - Crucially: **keep `.initial-name-input` fully editable**. Update `pair.name` and persist immediately via `this.saveState()`.
* **Round Tab Controller Integration (`switchTab` / `renderTabs`):**
  - In `renderTabs()`, add `.tab-disabled` class to `round-[i]` buttons if `!this.state.registrationConfirmed`.
  - In `switchTab(tabKey)`: block navigation to `round-*` if unconfirmed, and route to `initial` with a visual alert.

### Lens 3: Skeptical Architect Brainstormer (`egm-zoom-out`)
* **Reversibility of Confirmation ("Late Arrivals"):**
  - What if the director confirms, but a player pair arrives late before Turno 1 starts?
  - Rule: If no scores have been recorded in any round (`!this.hasAnyScores()`), allow **"Riapri Iscrizioni"** with zero friction.
  - If scores exist in Turno 1, unlocking registrations must trigger a warning modal: altering pairs mid-tournament breaks table seating and Mitchell pairings.
* **Definition of "Round Completed":**
  - Rely on the existing deterministic validator `BurracoEngine.validateRoundVpSum(vpScores, numPairs, byePoints).valid`.
  - Avoid heuristic timers or premature locks: a round is completed **only** when all VP cells are populated and the total VP matches mathematical expectation.
* **Backward Compatibility with Existing Data:**
  - Existing archives in `statistiche_tornei.json` do not contain `registrationConfirmed`.
  - Migration rule in `BurracoStorage.parseLoadedData()`: If any pair in the tournament has non-null scores, automatically treat `registrationConfirmed = true`. This prevents historical archives from getting locked or broken.

### Lens 4: Mental Models & Domain Alignment (`egm-comprehension`)
* **Burraco Tournament Directors' Workflow:**
  1. *Accoglienza (Check-in):* Names and lot numbers are recorded on paper or typed into the initial table. Empty template rows are often left blank.
  2. *Chiusura Iscrizioni (Closing):* Director calls "Iscrizioni chiuse!", assigns final tables, and starts Round 1.
  3. *Verifica Arbitrale (Referee Check):* Table score slips arrive. Once all entered, director verifies the 20 VP / table checksum (`roundTitleCheck` ✅).
  4. *Consultazione Finale (Final Podium & Export):* After Round 4, scores are frozen, rankings published, and WhatsApp images generated.
* **Terminology Match:**
  - Use familiar Italian tournament director phrasing:
    - `"Conferma Iscrizioni"` / `"Riapri Iscrizioni"`
    - `"Turno Concluso"` / `"Modifica Punteggi"` / `"Blocca Turno"`
    - `"Iscrizioni aperte: completa le coppie per avviare il torneo"`

### Lens 5: Implementation Readiness Brainstormer (`egm-implementation-readiness`)
* **Minimal Surgical Surface Area:**
  1. `src/js/storage.js`: Add `registrationConfirmed: false` to default state; add migration heuristic in `parseLoadedData()`.
  2. `src/js/engine.js`: Add pure helper `isRoundComplete(pairs, roundIdx, roundsCount, byePoints)` and `areAllRoundsComplete(pairs, roundsCount, byePoints)`.
  3. `src/css/tables.css`: Add styles for `.round-table-overlay`, `.tab-btn.disabled`, and unlocked state badges.
  4. `src/index.html`: Add `#btn-confirm-registrations` inside `#view-initial .card-header-actions` and container for the round overlay.
  5. `src/app.js`: Wire confirmation handler, tab guard, overlay render logic, and auto-lift condition.
* **Automated Test Coverage:**
  - Add test suite in `test_engine.js` verifying:
    - `isRoundComplete()` returns `false` on partial scores, `true` on valid checksum.
    - `areAllRoundsComplete()` accurately identifies final tournament state.
    - Migration of legacy tournament states without `registrationConfirmed`.

### Lens 6: Structural & Architecture Brainstormer (`egm-structural`)
* **Strict Separation of Concerns:**
  - `BurracoEngine`: Pure domain logic (validation checks, round completion calculation). Zero DOM dependencies.
  - `BurracoStorage`: Serialization, schema evolution, and backward compatibility.
  - `BurracoApp`: UI state coordination, event listener management, keyboard accessibility.
* **Keyboard & Accessibility Hygiene:**
  - When the blur overlay is active, inputs inside the round table must be set to `tabindex="-1"` so keyboard navigation (`ArrowUp`/`ArrowDown`/`Enter`) cannot tab into locked inputs behind the overlay.
  - Once unlocked via `🔓 Modifica Punteggi`, restore standard `tabindex` and focus the first score cell.

---

## 3. Concrete State Machine & Lifecycle Transitions

```
[ Stato Iniziale: Setup ]
  │
  ├─ Inserimento coppie / sorteggio
  ├─ Turni 1..N disabilitati (dimmed)
  │
  ▼ [ Click "Conferma Iscrizioni" ]
  ├─ Pulizia automatica righe vuote (name.trim() === '')
  ├─ Blocco struttura (aggiunta/eliminazione/numeri di tavolo bloccati)
  ├─ Nomi giocatori sempre modificabili inline
  ├─ Sblocco schede Turni 1..N
  │
  ▼ [ Turno in Corso: Inserimento Punteggi ]
  ├─ Inserimento MP/VP tavolo per tavolo
  ├─ Controllo VP incompleto -> Nessun blocco
  │
  ▼ [ Controllo VP Valido: res.valid === true ]
  ├─ Comparsa Spunta ✅ nel titolo
  ├─ Attivazione Overlay Protettivo Touch (blur + pulsante "Modifica Punteggi")
  │     │
  │     ├─ [ Click "Modifica Punteggi" ] ──► Sblocco temporaneo turno
  │     └─ [ Click "Blocca Turno" o Cambio Tab ] ──► Riattivazione protezione
  │
  ▼ [ Tutti i Turni Conclusi: areAllRoundsComplete === true ]
  ├─ Rimozione automatica dell'overlay protettivo su tutti i turni
  └─ Navigazione fluida e consultazione libera di Classifica, Podio e Export
```

---

## 4. Implementation Specification

### 4.1 UI Component: Tabellone Iniziale Action
In `src/index.html` (inside `#view-initial .card-header-actions`):
```html
<button id="btn-toggle-registration-lock" class="btn btn-sm btn-primary">
  <span class="btn-icon">🔒</span> Conferma Iscrizioni
</button>
```

### 4.2 CSS Overlay Component
In `src/css/tables.css`:
```css
/* Stile tab disabilitati prima della conferma */
.tab-btn.tab-locked {
  opacity: 0.45;
  cursor: not-allowed;
  filter: grayscale(0.6);
}

/* Overlay protettivo per turno concluso */
.round-protection-wrapper {
  position: relative;
}

.round-protective-overlay {
  position: absolute;
  inset: 0;
  backdrop-filter: blur(2.5px);
  -webkit-backdrop-filter: blur(2.5px);
  background: rgba(15, 23, 42, 0.18);
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  z-index: 20;
  border-radius: var(--radius-lg, 12px);
  padding: 24px;
}

.round-overlay-card {
  background: #ffffff;
  border: 1px solid var(--border-light, #E2E8F0);
  border-radius: 10px;
  box-shadow: 0 10px 25px -5px rgba(0, 0, 0, 0.15);
  padding: 16px 24px;
  text-align: center;
  display: flex;
  align-items: center;
  gap: 16px;
}
```

### 4.3 Engine Helper Functions
In `src/js/engine.js`:
```javascript
isRoundComplete(pairs, roundIdx, byePoints = 12) {
  const validPairs = pairs.filter(p => p.name && p.name.trim() !== '');
  if (validPairs.length === 0) return false;
  const vpScores = [];
  for (const pair of validPairs) {
    const sc = pair.scores && pair.scores[roundIdx];
    if (!sc || sc.vp === null || sc.vp === undefined || sc.vp === '') return false;
    const num = Number(sc.vp);
    if (isNaN(num) || num < 0 || num > 20) return false;
    vpScores.push(num);
  }
  return this.validateRoundVpSum(vpScores, validPairs.length, byePoints).valid;
},

areAllRoundsComplete(pairs, roundsCount, byePoints = 12) {
  for (let r = 0; r < roundsCount; r++) {
    if (!this.isRoundComplete(pairs, r, byePoints)) return false;
  }
  return true;
}
```

---

## 5. Potential Pitfalls & Mitigations

| Risk / Edge Case | Impact | Mitigation |
| :--- | :--- | :--- |
| **Accidental Confirmation with Empty Table** | User locks before adding pairs. | Minimum threshold: require at least 2 non-blank pairs to confirm; show clear warning toast otherwise. |
| **Late Pair Registration** | 1 pair arrives after confirmation. | If Round 1 has no scores yet, "Riapri Iscrizioni" is a one-click action. If scores exist, prompt with confirmation dialog explaining table recalculation. |
| **Player Name Typo / Substitution** | Partner name needs correction. | Name fields (`.initial-name-input`) remain editable at all times, even when locked. |
| **Screen Trapping on Old Browsers** | `backdrop-filter` not supported. | Fallback semi-transparent background (`rgba(248, 250, 252, 0.88)`). |
| **Legacy Archive Breakage** | Loading old `serata_GGMMAA` files. | Heuristic in `parseLoadedData()`: existing tournaments with entered scores default to `registrationConfirmed = true`. |

---

## 6. Recommendation & Decision Summary

- **Recommendation:** Proceed with the lifecycle guard as architected.
- **Complexity:** Low-to-Medium (surgical changes in existing view controller, storage schema, and table renderers).
- **User Impact:** High value for tournament directors by preventing disastrous table corruption and accidental score overwrites during live events.
