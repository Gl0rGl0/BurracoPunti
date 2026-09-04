/**
 * BURRACO - TOURNAMENT MANAGER
 * Application Engine & Reactive State Controller
 */

// Initial State Template
const DEFAULT_ROUNDS = 4;
const STORAGE_KEY = 'burraco_master_tournament_v1';

const defaultState = {
  title: 'Torneo di Burraco',
  roundsCount: DEFAULT_ROUNDS,
  settings: { showBulkPaste: false, showLottery: false },
  currentTab: 'initial', // 'initial' | 'round' | 'master' | 'podium'
  activeRoundIndex: 0,
  searchFilter: '',
  initialSearchFilter: '',
  pairs: [
    { id: 'p1', lotNumber: 1, name: 'Pietro - Paolo', scores: [{ mp: 1540, vp: 14 }, { mp: 980, vp: 11 }, { mp: 1200, vp: 13 }, { mp: null, vp: null }] },
    { id: 'p2', lotNumber: 2, name: 'Anna - Marco', scores: [{ mp: 620, vp: 6 }, { mp: 1420, vp: 16 }, { mp: 850, vp: 9 }, { mp: null, vp: null }] },
    { id: 'p3', lotNumber: 3, name: 'Giovanni - Luca', scores: [{ mp: 1810, vp: 17 }, { mp: 750, vp: 8 }, { mp: 1650, vp: 15 }, { mp: null, vp: null }] },
    { id: 'p4', lotNumber: 4, name: 'Maria - Elena', scores: [{ mp: 890, vp: 9 }, { mp: 1310, vp: 14 }, { mp: 1100, vp: 12 }, { mp: null, vp: null }] }
  ]
};

class BurracoApp {
  constructor() {
    this.state = this.loadState();
    this.initDOMElements();
    this.bindEvents();
    this.render();
  }

  // ==========================================
  // STATE MANAGEMENT & PERSISTENCE
  // ==========================================
  loadState() {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) || localStorage.getItem('burraco_Pezzo_tournament_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        // Ensure data consistency
        if (parsed.pairs && Array.isArray(parsed.pairs)) {
          if (!parsed.settings) parsed.settings = { showBulkPaste: false, showLottery: false };
          return parsed;
        }
      }
    } catch (e) {
      console.warn('Errore lettura localStorage:', e);
    }
    return JSON.parse(JSON.stringify(defaultState));
  }

  saveState() {
    try {
      const json = JSON.stringify(this.state);
      localStorage.setItem(STORAGE_KEY, json);

      // Indicate save
      const statusEl = document.getElementById('save-status');
      if (statusEl) {
        statusEl.classList.add('saving');
        const textEl = statusEl.querySelector('.status-text');
        if (textEl) textEl.textContent = 'Salvato ' + new Date().toLocaleTimeString('it-IT', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
      }

      // If PyWebView API is present, persist to file
      if (window.pywebview && window.pywebview.api && window.pywebview.api.save_tournament_data) {
        window.pywebview.api.save_tournament_data(json).catch(err => console.error('Python save error:', err));
      }
    } catch (e) {
      console.error('Errore salvataggio stato:', e);
    }
  }

  // ==========================================
  // DOM ELEMENT SELECTION
  // ==========================================
  initDOMElements() {
    // Title
    this.titleInput = document.getElementById('tournament-title-input');
    this.podiumTitle = document.getElementById('podium-tournament-title');
    this.printTitle = document.getElementById('print-title');
    this.printDate = document.getElementById('print-date');

    // Navigation Tabs
    this.tabsNav = document.getElementById('tabs-nav');
    this.roundTabsContainer = document.getElementById('round-tabs-container');
    this.viewPanels = {
      initial: document.getElementById('view-initial'),
      round: document.getElementById('view-round'),
      master: document.getElementById('view-master'),
      podium: document.getElementById('view-podium')
    };

    // Tables
    this.initialTable = document.getElementById('initial-table');
    this.initialTableBody = document.getElementById('initial-table-body');
    this.initialSearchInput = document.getElementById('initial-search-input');
    this.masterTable = document.getElementById('master-table');
    this.masterTableHeadRow = document.getElementById('master-table-head-row');
    this.masterTableBody = document.getElementById('master-table-body');
    this.roundTable = document.getElementById('round-table');
    this.roundTableBody = document.getElementById('round-table-body');

    // Round View Controls
    this.roundViewTitle = document.getElementById('round-view-title');
    this.currentRoundBadge = document.getElementById('current-round-badge');
    this.btnPrevRound = document.getElementById('btn-prev-round');
    this.btnNextRound = document.getElementById('btn-next-round');

    // Modals
    this.modalAddPair = document.getElementById('modal-add-pair');
    this.modalEditPair = document.getElementById('modal-edit-pair');
    this.modalBulkPaste = document.getElementById('modal-bulk-paste');
    this.modalLottery = document.getElementById('modal-lottery');
    this.modalSettings = document.getElementById('modal-settings');
    this.modalConfirmDelete = document.getElementById('modal-confirm-delete');
    this.confirmDeleteDetail = document.getElementById('confirm-delete-detail');
    this.btnConfirmDelete = document.getElementById('btn-confirm-delete');
    this.pendingDeletePairId = null;

    // Inputs & Forms
    this.masterSearchInput = document.getElementById('master-search-input');
    this.formAddPair = document.getElementById('form-add-pair');
    this.formEditPair = document.getElementById('form-edit-pair');
    this.inputPairName = document.getElementById('input-pair-name');
    this.inputLotNumber = document.getElementById('input-lot-number');
    this.inputEditPairName = document.getElementById('input-edit-pair-name');
    this.inputEditLotNumber = document.getElementById('input-edit-lot-number');
    this.editPairId = document.getElementById('edit-pair-id');
    this.bulkTextarea = document.getElementById('bulk-paste-textarea');
    this.bulkAutoNumber = document.getElementById('bulk-auto-number');

    // Settings & Tool Visibility
    this.settingToggleBulk = document.getElementById('setting-toggle-bulk');
    this.settingToggleLottery = document.getElementById('setting-toggle-lottery');
    this.settingRoundsCount = document.getElementById('setting-rounds-count');
    this.btnOpenBulkPaste = document.getElementById('btn-open-bulk-paste');
    this.btnOpenLottery = document.getElementById('btn-open-lottery');
  }

  // ==========================================
  // EVENT BINDINGS
  // ==========================================
  bindEvents() {
    // Title edit (optional if present in HTML)
    if (this.titleInput) {
      this.titleInput.addEventListener('input', (e) => {
        this.state.title = e.target.value.trim() || 'Torneo di Burraco';
        this.saveState();
        this.updateTitles();
      });
    }

    // Main tabs click
    if (this.tabsNav) {
      this.tabsNav.addEventListener('click', (e) => {
        const tabBtn = e.target.closest('.tab-btn');
        if (!tabBtn) return;
        const tab = tabBtn.dataset.tab;
        if (tab.startsWith('round-')) {
          const roundIdx = parseInt(tab.replace('round-', ''), 10);
          this.switchTab('round', roundIdx);
        } else {
          this.switchTab(tab);
        }
      });
    }

    // Round add / remove buttons (optional if present)
    document.getElementById('btn-add-round')?.addEventListener('click', () => this.addRound());
    document.getElementById('btn-remove-round')?.addEventListener('click', () => this.removeRound());

    // Settings round count numeric input
    this.settingRoundsCount?.addEventListener('change', (e) => {
      const val = parseInt(e.target.value, 10);
      if (isNaN(val) || val < 1) {
        e.target.value = this.state.roundsCount;
        return;
      }
      this.setRoundsCount(val);
    });

    // Round navigation buttons
    this.btnPrevRound?.addEventListener('click', () => {
      if (this.state.activeRoundIndex > 0) {
        this.switchTab('round', this.state.activeRoundIndex - 1);
      }
    });
    this.btnNextRound?.addEventListener('click', () => {
      if (this.state.activeRoundIndex < this.state.roundsCount - 1) {
        this.switchTab('round', this.state.activeRoundIndex + 1);
      }
    });

    // Modal open buttons
    document.getElementById('btn-open-add-pair')?.addEventListener('click', () => this.openModal('modalAddPair'));
    document.getElementById('btn-open-bulk-paste')?.addEventListener('click', () => this.openModal('modalBulkPaste'));
    document.getElementById('btn-open-lottery')?.addEventListener('click', () => {
      const countEl = document.getElementById('lottery-total-count');
      if (countEl) countEl.textContent = this.state.pairs.length;
      this.openModal('modalLottery');
    });

    // Settings modal open/close
    document.getElementById('btn-open-settings')?.addEventListener('click', () => {
      this.syncSettingsUI();
      this.openModal('modalSettings');
    });
    document.getElementById('close-settings-modal')?.addEventListener('click', () => this.closeModal('modalSettings'));
    document.getElementById('btn-close-settings')?.addEventListener('click', () => this.closeModal('modalSettings'));

    // Settings actions inside modal
    document.getElementById('btn-modal-export-excel')?.addEventListener('click', () => {
      this.exportExcel();
    });
    document.getElementById('btn-modal-export-json')?.addEventListener('click', () => {
      this.exportBackupJSON();
    });
    document.getElementById('btn-modal-import-json')?.addEventListener('click', () => {
      document.getElementById('input-import-json')?.click();
    });
    document.getElementById('input-import-json')?.addEventListener('change', (e) => {
      const file = e.target.files && e.target.files[0];
      if (file) {
        this.importBackupJSON(file);
      }
      e.target.value = '';
    });
    document.getElementById('btn-modal-clear-data')?.addEventListener('click', () => {
      this.closeModal('modalSettings');
      this.confirmNewTournament();
    });

    // Settings toggle switches
    this.settingToggleBulk?.addEventListener('change', (e) => {
      this.state.settings.showBulkPaste = e.target.checked;
      this.saveState();
      this.applySettingsVisibility();
    });
    this.settingToggleLottery?.addEventListener('change', (e) => {
      this.state.settings.showLottery = e.target.checked;
      this.saveState();
      this.applySettingsVisibility();
    });

    // Modal Add Pair close buttons
    document.getElementById('close-add-pair-modal')?.addEventListener('click', () => this.closeModal('modalAddPair'));
    document.getElementById('btn-cancel-add-pair')?.addEventListener('click', () => this.closeModal('modalAddPair'));

    // Modal Edit Pair close buttons
    document.getElementById('close-edit-pair-modal')?.addEventListener('click', () => this.closeModal('modalEditPair'));
    document.getElementById('btn-cancel-edit-pair')?.addEventListener('click', () => this.closeModal('modalEditPair'));

    // Modal Bulk Paste close buttons
    document.getElementById('close-bulk-paste-modal')?.addEventListener('click', () => this.closeModal('modalBulkPaste'));
    document.getElementById('btn-cancel-bulk')?.addEventListener('click', () => this.closeModal('modalBulkPaste'));

    // Modal Lottery close buttons
    document.getElementById('close-lottery-modal')?.addEventListener('click', () => this.closeModal('modalLottery'));
    document.getElementById('btn-close-lottery')?.addEventListener('click', () => this.closeModal('modalLottery'));

    // Modal Confirm Delete buttons
    document.getElementById('close-confirm-delete-modal')?.addEventListener('click', () => this.closeModal('modalConfirmDelete'));
    document.getElementById('btn-cancel-delete')?.addEventListener('click', () => this.closeModal('modalConfirmDelete'));
    this.btnConfirmDelete?.addEventListener('click', () => {
      if (this.pendingDeletePairId) {
        this.state.pairs = this.state.pairs.filter(p => p.id !== this.pendingDeletePairId);
        this.pendingDeletePairId = null;
        this.saveState();
        this.renderInitialTable();
        this.closeModal('modalConfirmDelete');
      }
    });

    // Close modals on backdrop click
    document.querySelectorAll('.modal-backdrop').forEach(backdrop => {
      backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
          backdrop.classList.remove('active');
        }
      });
    });

    // Form Add Pair
    this.formAddPair?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.addSinglePair();
    });

    // Form Edit Pair
    this.formEditPair?.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveEditPair();
    });

    // Bulk Paste confirm
    document.getElementById('btn-confirm-bulk')?.addEventListener('click', () => this.processBulkPaste());

    // Lottery actions
    document.getElementById('btn-run-random-lottery')?.addEventListener('click', () => this.runRandomLottery());
    document.getElementById('btn-run-sequential-lottery')?.addEventListener('click', () => this.runSequentialLottery());

    // Initial search filter
    this.initialSearchInput?.addEventListener('input', (e) => {
      this.state.initialSearchFilter = e.target.value.toLowerCase().trim();
      this.renderInitialTable();
    });

    // Master search filter
    this.masterSearchInput?.addEventListener('input', (e) => {
      this.state.searchFilter = e.target.value.toLowerCase().trim();
      this.renderMasterTable();
    });

    // Header actions (safe with optional chaining)
    document.getElementById('btn-export-excel')?.addEventListener('click', () => this.exportExcel());
    document.getElementById('btn-print')?.addEventListener('click', () => this.triggerPrint());
    document.getElementById('btn-new-tournament')?.addEventListener('click', () => this.confirmNewTournament());

    // Keyboard navigation in round view score table
    this.roundTable?.addEventListener('keydown', (e) => this.handleRoundTableKeyboard(e));

    // Button to add pair row under initial table
    document.getElementById('btn-add-pair-row')?.addEventListener('click', () => this.addNewPairRow());
  }

  // ==========================================
  // NAVIGATION & TAB SWITCHING
  // ==========================================
  switchTab(tabName, roundIndex = null) {
    this.state.currentTab = tabName;
    if (roundIndex !== null) {
      this.state.activeRoundIndex = roundIndex;
    }

    // Update tab buttons active state
    const allTabBtns = this.tabsNav.querySelectorAll('.tab-btn');
    allTabBtns.forEach(btn => {
      btn.classList.remove('active');
      if (tabName === 'round' && btn.dataset.tab === `round-${this.state.activeRoundIndex}`) {
        btn.classList.add('active');
      } else if (btn.dataset.tab === tabName) {
        btn.classList.add('active');
      }
    });

    // Show active panel
    Object.keys(this.viewPanels).forEach(key => {
      if (this.viewPanels[key]) {
        if (key === tabName) {
          this.viewPanels[key].classList.add('active');
        } else {
          this.viewPanels[key].classList.remove('active');
        }
      }
    });

    // Re-render corresponding views
    if (tabName === 'initial') {
      this.renderInitialTable();
    } else if (tabName === 'round') {
      this.renderRoundView();
    } else if (tabName === 'master') {
      this.renderMasterTable();
    } else if (tabName === 'podium') {
      this.renderPodium();
    }

    this.saveState();
  }

  // ==========================================
  // SCORE CALCULATIONS & RANKINGS
  // ==========================================
  calculateTotals() {
    return this.state.pairs.map(pair => {
      let totVP = 0;
      let totMP = 0;
      let playedRounds = 0;

      for (let i = 0; i < this.state.roundsCount; i++) {
        const sc = pair.scores[i];
        if (sc) {
          if (sc.vp !== null && !isNaN(sc.vp)) {
            totVP += Number(sc.vp);
            playedRounds++;
          }
          if (sc.mp !== null && !isNaN(sc.mp)) {
            totMP += Number(sc.mp);
          }
        }
      }

      return {
        ...pair,
        totVP,
        totMP,
        playedRounds
      };
    });
  }

  getRankedPairs() {
    const pairsWithTotals = this.calculateTotals();
    const validPairs = pairsWithTotals.filter(p => p.name && p.name.trim() !== '');

    // Primary sort: Total VP DESC
    // Secondary sort: Total MP DESC
    // Tertiary: Lot Number ASC
    return validPairs.sort((a, b) => {
      if (b.totVP !== a.totVP) {
        return b.totVP - a.totVP;
      }
      if (b.totMP !== a.totMP) {
        return b.totMP - a.totMP;
      }
      return (a.lotNumber || 999) - (b.lotNumber || 999);
    });
  }

  // ==========================================
  // RENDERING ENGINE
  // ==========================================
  render() {
    this.updateTitles();
    this.renderTabs();
    this.applySettingsVisibility();
    this.renderInitialTable();
    this.renderMasterTable();
    this.renderRoundView();
    this.renderPodium();
  }

  syncSettingsUI() {
    if (!this.state.settings) {
      this.state.settings = { showBulkPaste: false, showLottery: false };
    }
    if (this.settingToggleBulk) {
      this.settingToggleBulk.checked = this.state.settings.showBulkPaste === true;
    }
    if (this.settingToggleLottery) {
      this.settingToggleLottery.checked = this.state.settings.showLottery === true;
    }
    if (this.settingRoundsCount) {
      this.settingRoundsCount.value = this.state.roundsCount;
    }
  }

  applySettingsVisibility() {
    if (!this.state.settings) {
      this.state.settings = { showBulkPaste: false, showLottery: false };
    }
    if (this.btnOpenBulkPaste) {
      this.btnOpenBulkPaste.style.display = this.state.settings.showBulkPaste ? 'inline-flex' : 'none';
    }
    if (this.btnOpenLottery) {
      this.btnOpenLottery.style.display = this.state.settings.showLottery ? 'inline-flex' : 'none';
    }
  }

  updateTitles() {
    if (this.titleInput) this.titleInput.value = this.state.title;
    if (this.podiumTitle) this.podiumTitle.textContent = this.state.title;
    if (this.printTitle) this.printTitle.textContent = this.state.title;
    if (this.printDate) this.printDate.textContent = 'Data: ' + new Date().toLocaleDateString('it-IT', { day: '2-digit', month: 'long', year: 'numeric' });
  }

  renderTabs() {
    this.roundTabsContainer.innerHTML = '';
    for (let r = 0; r < this.state.roundsCount; r++) {
      const btn = document.createElement('button');
      btn.className = `tab-btn ${this.state.currentTab === 'round' && this.state.activeRoundIndex === r ? 'active' : ''}`;
      btn.dataset.tab = `round-${r}`;
      btn.innerHTML = `<span class="tab-icon">🎯</span> Turno ${r + 1}`;
      this.roundTabsContainer.appendChild(btn);
    }
  }

  // ==========================================
  // TABELLONE INIZIALE (REGISTRAZIONE E COPPIE)
  // ==========================================
  addNewPairRow() {
    const newPair = {
      id: 'p_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      lotNumber: null,
      name: '',
      scores: Array.from({ length: this.state.roundsCount }, () => ({ mp: null, vp: null }))
    };
    this.state.pairs.push(newPair);
    this.saveState();
    this.renderInitialTable(newPair.id);
  }

  renderInitialTable(focusPairId = null) {
    if (!this.initialTableBody) return;
    this.initialTableBody.innerHTML = '';

    const filter = this.state.initialSearchFilter || '';

    if (this.state.pairs.length === 0) {
      const emptyRow = document.createElement('tr');
      emptyRow.innerHTML = `
        <td colspan="4" style="text-align:center; padding:32px 20px; color:var(--text-muted);">
          <div style="font-size:14px; font-weight:600; margin-bottom:6px; color:var(--text-main);">Nessuna coppia ancora inserita</div>
          <p style="font-size:13px; margin:0;">Clicca su <strong>➕ Aggiungi Coppia</strong> qui sotto per inserire i partecipanti.</p>
        </td>
      `;
      this.initialTableBody.appendChild(emptyRow);
      return;
    }

    this.state.pairs.forEach((pair, rowIdx) => {
      if (filter) {
        const matchesName = pair.name.toLowerCase().includes(filter);
        const matchesLot = String(pair.lotNumber || '').includes(filter);
        if (!matchesName && !matchesLot) return;
      }

      const tr = document.createElement('tr');
      tr.dataset.pairId = pair.id;

      const lotVal = (pair.lotNumber !== null && pair.lotNumber !== undefined) ? pair.lotNumber : '';

      tr.innerHTML = `
        <td style="text-align:center; font-weight:700; color:var(--text-muted); font-size:13px; width:50px;">
          ${rowIdx + 1}
        </td>
        <td>
          <input type="text" class="form-control initial-name-input" 
                 data-pair-id="${pair.id}" data-row-idx="${rowIdx}"
                 value="${this.escapeHtml(pair.name)}" 
                 placeholder="Nome Coppia / Giocatori (es. Pietro + Paolo)"
                 style="width:100%; font-size:13px; font-weight:600;">
        </td>
        <td style="text-align:center; width:150px;">
          <input type="number" min="1" max="999" class="form-control tabular-nums initial-lot-input" 
                 data-pair-id="${pair.id}" data-row-idx="${rowIdx}"
                 value="${lotVal}" 
                 placeholder="N°" 
                 style="width:85px; text-align:center; font-weight:700; margin:0 auto; font-size:14px;">
        </td>
        <td style="text-align:center; width:60px;">
          <button class="btn-ghost text-danger btn-delete-initial-pair" data-pair-id="${pair.id}" title="Elimina riga">🗑️</button>
        </td>
      `;
      this.initialTableBody.appendChild(tr);
    });

    // Input listeners for pair name
    this.initialTableBody.querySelectorAll('.initial-name-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const pairId = e.target.dataset.pairId;
        const pair = this.state.pairs.find(p => p.id === pairId);
        if (pair) {
          pair.name = e.target.value.trim();
          this.saveState();
        }
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const rowIdx = parseInt(e.target.dataset.rowIdx, 10);
          if (rowIdx === this.state.pairs.length - 1) {
            this.addNewPairRow();
          } else {
            const nextInput = this.initialTableBody.querySelectorAll('.initial-name-input')[rowIdx + 1];
            if (nextInput) {
              nextInput.focus();
              nextInput.select();
            }
          }
        }
      });
    });

    // Input listeners for team number (lot)
    this.initialTableBody.querySelectorAll('.initial-lot-input').forEach(input => {
      input.addEventListener('input', (e) => {
        const pairId = e.target.dataset.pairId;
        const pair = this.state.pairs.find(p => p.id === pairId);
        if (pair) {
          const val = e.target.value.trim();
          pair.lotNumber = val === '' ? null : parseInt(val, 10);
          this.saveState();
        }
      });

      input.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
          e.preventDefault();
          const rowIdx = parseInt(e.target.dataset.rowIdx, 10);
          if (rowIdx < this.state.pairs.length - 1) {
            const nextLot = this.initialTableBody.querySelectorAll('.initial-lot-input')[rowIdx + 1];
            if (nextLot) {
              nextLot.focus();
              nextLot.select();
            }
          }
        }
      });
    });

    // Delete buttons (Apre mini modale di conferma)
    this.initialTableBody.querySelectorAll('.btn-delete-initial-pair').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const pairId = e.currentTarget.dataset.pairId;
        const pair = this.state.pairs.find(p => p.id === pairId);
        this.pendingDeletePairId = pairId;
        if (this.confirmDeleteDetail) {
          const pairName = pair && pair.name ? pair.name : '(Senza nome)';
          const pairLot = pair && pair.lotNumber ? `Squadra N° ${pair.lotNumber} — ` : '';
          this.confirmDeleteDetail.textContent = `${pairLot}${pairName}`;
        }
        this.openModal('modalConfirmDelete');
      });
    });

    // Auto-focus if focusPairId is specified
    if (focusPairId) {
      const targetInput = this.initialTableBody.querySelector(`.initial-name-input[data-pair-id="${focusPairId}"]`);
      if (targetInput) {
        targetInput.focus();
      }
    }
  }

  // ==========================================
  // CLASSIFICA (TABELLONE VIEW-ONLY IN ORDINE DI VP)
  // ==========================================
  renderMasterTable() {
    if (!this.masterTableHeadRow || !this.masterTableBody) return;

    // 1. Build Header dynamically based on roundsCount (without Azioni)
    this.masterTableHeadRow.innerHTML = `
      <th class="col-rank">Pos.</th>
      <th class="col-lot" title="Numero identificativo">N°</th>
      <th class="col-name">Coppia / Giocatori</th>
    `;

    for (let r = 0; r < this.state.roundsCount; r++) {
      const th = document.createElement('th');
      th.colSpan = 2;
      th.className = 'round-col-header';
      th.innerHTML = `Turno ${r + 1} <div class="sub-col-header" style="display:flex; justify-content:space-around; font-weight:600; font-size:10px; margin-top:3px; opacity:0.85;"><span>MP</span><span>VP</span></div>`;
      this.masterTableHeadRow.appendChild(th);
    }

    const thTotVp = document.createElement('th');
    thTotVp.className = 'col-tot-vp';
    thTotVp.textContent = 'Totale VP';
    this.masterTableHeadRow.appendChild(thTotVp);

    const thTotMp = document.createElement('th');
    thTotMp.className = 'col-tot-mp';
    thTotMp.textContent = 'Totale MP';
    this.masterTableHeadRow.appendChild(thTotMp);

    // 2. Ranked pairs (Primary: Totale VP DESC, Secondary: Totale MP DESC, Tertiary: Lot ASC)
    // Filter out any empty rows
    const ranked = this.getRankedPairs().filter(p => p.name && p.name.trim() !== '');
    this.masterTableBody.innerHTML = '';
    const filter = this.state.searchFilter;

    if (ranked.length === 0) {
      const totalCols = 5 + (this.state.roundsCount * 2);
      const emptyRow = document.createElement('tr');
      emptyRow.innerHTML = `
        <td colspan="${totalCols}" style="text-align:center; padding:36px 20px; color:var(--text-muted);">
          <div style="font-size:15px; font-weight:600; margin-bottom:6px; color:var(--text-main);">Nessuna coppia registrata</div>
          <p style="font-size:13px; margin:0;">Inserisci le coppie dal <strong>Tabellone Iniziale</strong> per visualizzare la classifica.</p>
        </td>
      `;
      this.masterTableBody.appendChild(emptyRow);
      return;
    }

    let rankCounter = 0;
    ranked.forEach((pair) => {
      // Safety check for empty rows
      if (!pair.name || pair.name.trim() === '') return;

      // Search filter check
      if (filter) {
        const matchesName = pair.name.toLowerCase().includes(filter);
        const matchesLot = String(pair.lotNumber || '').includes(filter);
        if (!matchesName && !matchesLot) return;
      }

      rankCounter++;
      const rank = rankCounter;
      let rankDisplay = `<span class="tabular-nums" style="font-weight:600; color:var(--text-muted); font-size:13px;">${rank}°</span>`;
      if (rank === 1) rankDisplay = `<span class="rank-badge rank-1">1°</span>`;
      else if (rank === 2) rankDisplay = `<span class="rank-badge rank-2">2°</span>`;
      else if (rank === 3) rankDisplay = `<span class="rank-badge rank-3">3°</span>`;

      // Build turn scores columns (strictly view-only text/badges)
      let roundCellsHtml = '';
      for (let r = 0; r < this.state.roundsCount; r++) {
        const sc = pair.scores[r] || { mp: null, vp: null };
        const mpText = (sc.mp !== null && sc.mp !== undefined) ? Number(sc.mp).toLocaleString('it-IT') : '<span style="color:#CBD5E1;">—</span>';
        const vpText = (sc.vp !== null && sc.vp !== undefined) ? `<strong style="color:var(--primary); font-size:13px;">${sc.vp}</strong>` : '<span style="color:#CBD5E1;">—</span>';

        roundCellsHtml += `
          <td style="text-align:center; font-family:var(--font-mono); font-size:12px; color:var(--text-muted);">${mpText}</td>
          <td style="text-align:center; font-family:var(--font-mono); font-size:13px;">${vpText}</td>
        `;
      }

      const tr = document.createElement('tr');
      tr.dataset.pairId = pair.id;

      tr.innerHTML = `
        <td class="col-rank">${rankDisplay}</td>
        <td class="col-lot"><span class="tabular-nums" style="font-weight:700;">${pair.lotNumber || '—'}</span></td>
        <td class="col-name" style="font-size:14px; font-weight:600; color:var(--text-main);">${this.escapeHtml(pair.name)}</td>
        ${roundCellsHtml}
        <td class="col-tot-vp" style="text-align:center; font-weight:800; font-size:15px; color:var(--primary); background-color:#EFF6FF;">${pair.totVP}</td>
        <td class="col-tot-mp" style="text-align:center; font-weight:700; font-size:13px; color:var(--text-main); background-color:#F8FAFC;">${pair.totMP.toLocaleString('it-IT')}</td>
      `;

      this.masterTableBody.appendChild(tr);
    });
  }

  openEditPairModal(pairId) {
    const pair = this.state.pairs.find(p => p.id === pairId);
    if (!pair) return;
    if (this.editPairId) this.editPairId.value = pair.id;
    if (this.inputEditPairName) this.inputEditPairName.value = pair.name;
    if (this.inputEditLotNumber) this.inputEditLotNumber.value = pair.lotNumber || '';
    this.openModal('modalEditPair');
  }

  saveEditPair() {
    const id = this.editPairId ? this.editPairId.value : null;
    const pair = this.state.pairs.find(p => p.id === id);
    if (!pair) return;

    const name = this.inputEditPairName ? this.inputEditPairName.value.trim() : '';
    if (name) pair.name = name;

    const lotVal = this.inputEditLotNumber ? this.inputEditLotNumber.value.trim() : '';
    pair.lotNumber = lotVal === '' ? null : parseInt(lotVal, 10);

    this.saveState();
    this.render();
    this.closeModal('modalEditPair');
  }

  // ==========================================
  // INSERIMENTO PUNTEGGI TURNO SINGOLO
  // ==========================================
  renderRoundView() {
    const roundIdx = this.state.activeRoundIndex;
    if (this.roundViewTitle) {
      this.roundViewTitle.textContent = `Inserimento Punteggi - Turno ${roundIdx + 1}`;
    }
    if (this.currentRoundBadge) {
      this.currentRoundBadge.textContent = `Turno ${roundIdx + 1} di ${this.state.roundsCount}`;
    }

    // Hide "Turno Precedente" on first round and "Turno Successivo" on last round
    if (this.btnPrevRound) {
      this.btnPrevRound.style.display = roundIdx === 0 ? 'none' : 'inline-flex';
    }
    if (this.btnNextRound) {
      this.btnNextRound.style.display = roundIdx >= this.state.roundsCount - 1 ? 'none' : 'inline-flex';
    }

    if (!this.roundTableBody) return;
    this.roundTableBody.innerHTML = '';

    // Pairs sorted by lot number for convenient table matching (excluding empty rows)
    const sortedPairs = this.state.pairs
      .filter(p => p.name && p.name.trim() !== '')
      .sort((a, b) => {
        if (a.lotNumber && b.lotNumber) return a.lotNumber - b.lotNumber;
        if (a.lotNumber) return -1;
        if (b.lotNumber) return 1;
        return a.name.localeCompare(b.name);
      });

    if (sortedPairs.length === 0) {
      const emptyRow = document.createElement('tr');
      emptyRow.innerHTML = `
        <td colspan="4" style="text-align:center; padding:32px; color:var(--text-muted);">
          Nessuna coppia registrata. Aggiungi prima le coppie dal Tabellone Iniziale.
        </td>
      `;
      this.roundTableBody.appendChild(emptyRow);
      return;
    }

    sortedPairs.forEach((pair) => {
      const sc = pair.scores[roundIdx] || { mp: null, vp: null };
      const mpVal = (sc.mp !== null && sc.mp !== undefined) ? sc.mp : '';
      const vpVal = (sc.vp !== null && sc.vp !== undefined) ? sc.vp : '';

      const tr = document.createElement('tr');

      tr.innerHTML = `
        <td class="col-lot" style="font-weight:700;">${pair.lotNumber || '—'}</td>
        <td class="col-name">${this.escapeHtml(pair.name)}</td>
        <td class="col-input">
          <input type="number" class="form-control tabular-nums round-score-input" 
                 data-pair-id="${pair.id}" data-field="mp" value="${mpVal}" 
                 placeholder="es. 1540" style="max-width:140px;">
        </td>
        <td class="col-input">
          <input type="number" step="0.5" class="form-control tabular-nums round-score-input" 
                 data-pair-id="${pair.id}" data-field="vp" value="${vpVal}" 
                 placeholder="es. 14" style="max-width:110px; font-weight:bold; color:var(--primary);">
        </td>
      `;

      this.roundTableBody.appendChild(tr);
    });

    // Event listeners for round inputs
    this.roundTableBody.querySelectorAll('.round-score-input').forEach(inp => {
      inp.addEventListener('change', (e) => {
        const pairId = e.target.dataset.pairId;
        const field = e.target.dataset.field;
        const pair = this.state.pairs.find(p => p.id === pairId);
        if (!pair) return;

        if (!pair.scores[roundIdx]) pair.scores[roundIdx] = { mp: null, vp: null };
        const val = e.target.value.trim();
        pair.scores[roundIdx][field] = val === '' ? null : Number(val);

        this.saveState();
      });
    });
  }

  // Keyboard navigation inside round table (Excel feel)
  handleRoundTableKeyboard(e) {
    if (!e.target.classList.contains('round-score-input')) return;

    const currentInput = e.target;
    const currentTd = currentInput.closest('td');
    const currentTr = currentInput.closest('tr');
    if (!currentTd || !currentTr) return;

    const colIndex = Array.from(currentTr.children).indexOf(currentTd);
    const tbody = currentTr.parentElement;
    const rows = Array.from(tbody.querySelectorAll('tr'));
    const rowIndex = rows.indexOf(currentTr);

    let targetInput = null;

    if (e.key === 'ArrowDown' || e.key === 'Enter') {
      e.preventDefault();
      if (rowIndex < rows.length - 1) {
        const nextTr = rows[rowIndex + 1];
        targetInput = nextTr.children[colIndex]?.querySelector('.round-score-input');
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (rowIndex > 0) {
        const prevTr = rows[rowIndex - 1];
        targetInput = prevTr.children[colIndex]?.querySelector('.round-score-input');
      }
    }

    if (targetInput) {
      targetInput.focus();
      targetInput.select();
    }
  }

  // Render Podium & Ceremony
  renderPodium() {
    const ranked = this.getRankedPairs();

    // 1st Place (Gold)
    const p1 = ranked[0];
    document.getElementById('pillar-team-1').textContent = p1 ? p1.name : '—';
    document.getElementById('pillar-score-1').textContent = p1 ? `${p1.totVP} VP (${p1.totMP.toLocaleString('it-IT')} MP)` : '0 VP';

    // 2nd Place (Silver)
    const p2 = ranked[1];
    document.getElementById('pillar-team-2').textContent = p2 ? p2.name : '—';
    document.getElementById('pillar-score-2').textContent = p2 ? `${p2.totVP} VP (${p2.totMP.toLocaleString('it-IT')} MP)` : '0 VP';

    // 3rd Place (Bronze)
    const p3 = ranked[2];
    document.getElementById('pillar-team-3').textContent = p3 ? p3.name : '—';
    document.getElementById('pillar-score-3').textContent = p3 ? `${p3.totVP} VP (${p3.totMP.toLocaleString('it-IT')} MP)` : '0 VP';

    // Honorable mentions (4th and 5th)
    const honorableGrid = document.getElementById('honorable-grid');
    honorableGrid.innerHTML = '';

    for (let i = 3; i < Math.min(5, ranked.length); i++) {
      const p = ranked[i];
      const card = document.createElement('div');
      card.className = 'honorable-card';
      card.innerHTML = `
        <span class="honorable-rank">${i + 1}°</span>
        <span class="honorable-name">${this.escapeHtml(p.name)}</span>
        <span class="honorable-score">${p.totVP} VP (${p.totMP.toLocaleString('it-IT')} MP)</span>
      `;
      honorableGrid.appendChild(card);
    }
  }

  // ==========================================
  // ROUND MANAGEMENT (ADD / REMOVE ROUNDS)
  // ==========================================
  setRoundsCount(newCount) {
    if (newCount === this.state.roundsCount || isNaN(newCount)) return;
    if (newCount < 1) {
      alert('Il torneo deve avere almeno 1 turno.');
      if (this.settingRoundsCount) this.settingRoundsCount.value = this.state.roundsCount;
      return;
    }

    if (newCount < this.state.roundsCount) {
      // Check if any round being removed has data
      let hasData = false;
      for (let r = newCount; r < this.state.roundsCount; r++) {
        if (this.state.pairs.some(p => p.scores[r] && (p.scores[r].vp !== null || p.scores[r].mp !== null))) {
          hasData = true;
          break;
        }
      }

      if (hasData) {
        if (!confirm(`Riducendo i turni a ${newCount}, i punteggi dei turni successivi andranno persi. Sei sicuro di voler procedere?`)) {
          if (this.settingRoundsCount) this.settingRoundsCount.value = this.state.roundsCount;
          return;
        }
      }

      // Truncate scores arrays
      this.state.pairs.forEach(p => {
        if (p.scores.length > newCount) {
          p.scores = p.scores.slice(0, newCount);
        }
      });

      if (this.state.activeRoundIndex >= newCount) {
        this.state.activeRoundIndex = newCount - 1;
      }
    } else {
      // Expanding rounds count
      this.state.pairs.forEach(p => {
        while (p.scores.length < newCount) {
          p.scores.push({ mp: null, vp: null });
        }
      });
    }

    this.state.roundsCount = newCount;
    if (this.settingRoundsCount) this.settingRoundsCount.value = newCount;
    this.saveState();
    this.render();
  }

  addRound() {
    this.setRoundsCount(this.state.roundsCount + 1);
  }

  removeRound() {
    this.setRoundsCount(this.state.roundsCount - 1);
  }

  // ==========================================
  // PAIRS & BULK REGISTRATION
  // ==========================================
  addSinglePair() {
    const name = this.inputPairName.value.trim();
    if (!name) return;

    let lot = this.inputLotNumber.value ? parseInt(this.inputLotNumber.value, 10) : null;
    if (lot === null || isNaN(lot)) {
      // Find highest assigned lot number + 1
      const maxLot = this.state.pairs.reduce((max, p) => Math.max(max, p.lotNumber || 0), 0);
      lot = maxLot + 1;
    }

    const newPair = {
      id: 'p_' + Date.now() + '_' + Math.floor(Math.random() * 1000),
      lotNumber: lot,
      name: name,
      scores: Array.from({ length: this.state.roundsCount }, () => ({ mp: null, vp: null }))
    };

    this.state.pairs.push(newPair);
    this.saveState();
    this.render();

    this.inputPairName.value = '';
    this.inputLotNumber.value = '';
    this.closeModal('modalAddPair');
  }

  processBulkPaste() {
    const text = document.getElementById('bulk-paste-textarea').value.trim();
    if (!text) {
      alert('Incolla del testo prima di confermare.');
      return;
    }

    const lines = text.split(/\r?\n/);
    const autoNumber = document.getElementById('bulk-auto-number').checked;
    let currentLot = this.state.pairs.reduce((max, p) => Math.max(max, p.lotNumber || 0), 0) + 1;

    let importedCount = 0;

    lines.forEach(rawLine => {
      let line = rawLine.trim();
      if (!line) return;

      // Clean up leading numbers or table prefixes like "1. ", "1 - ", "Tavolo 1: "
      line = line.replace(/^(?:Tavolo\s*\d+[\s:\-]+|\d+[\s\.\)\-:]+)/i, '').trim();
      if (!line) return;

      const newPair = {
        id: 'p_' + Date.now() + '_' + Math.floor(Math.random() * 10000) + '_' + importedCount,
        lotNumber: autoNumber ? currentLot++ : null,
        name: line,
        scores: Array.from({ length: this.state.roundsCount }, () => ({ mp: null, vp: null }))
      };

      this.state.pairs.push(newPair);
      importedCount++;
    });

    this.saveState();
    this.render();
    document.getElementById('bulk-paste-textarea').value = '';
    this.closeModal('modalBulkPaste');
    alert(`Importate con successo ${importedCount} coppie!`);
  }

  // ==========================================
  // LOTTERY & DRAW SYSTEM
  // ==========================================
  runRandomLottery() {
    const count = this.state.pairs.length;
    if (count === 0) {
      alert('Nessuna coppia registrata.');
      return;
    }

    if (!confirm(`Vuoi estrarre a sorte i numeri identificativi (1..${count}) per tutte le coppie?`)) {
      return;
    }

    // Generate numbers [1..N] and shuffle
    const numbers = Array.from({ length: count }, (_, i) => i + 1);
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }

    // Assign to pairs
    this.state.pairs.forEach((pair, idx) => {
      pair.lotNumber = numbers[idx];
    });

    this.saveState();
    this.render();
    this.closeModal('modalLottery');
  }

  runSequentialLottery() {
    this.state.pairs.forEach((pair, idx) => {
      pair.lotNumber = idx + 1;
    });

    this.saveState();
    this.render();
    this.closeModal('modalLottery');
  }

  // ==========================================
  // EXCEL EXPORT & PRINT
  // ==========================================
  exportExcel() {
    try {
      if (typeof XLSX === 'undefined') {
        alert('Libreria Excel non ancora caricata. Riprova tra un secondo.');
        return;
      }

      const wb = XLSX.utils.book_new();
      const ranked = this.getRankedPairs();

      // Sheet 1: Classifica Generale
      const leaderboardData = [
        ['BURRACO - CLASSIFICA GENERALE UFFICIALE'],
        ['Torneo:', this.state.title],
        ['Data:', new Date().toLocaleDateString('it-IT')],
        [],
        ['Posizione', 'N° Estratto', 'Coppia / Giocatori', 'Totale VP', 'Totale MP', 'Distacco 1°']
      ];

      const leaderVP = ranked[0]?.totVP || 0;
      ranked.forEach((p, idx) => {
        leaderboardData.push([
          idx + 1,
          p.lotNumber || '',
          p.name,
          p.totVP,
          p.totMP,
          idx === 0 ? '—' : `-${leaderVP - p.totVP}`
        ]);
      });

      const wsLeaderboard = XLSX.utils.aoa_to_sheet(leaderboardData);
      XLSX.utils.book_append_sheet(wb, wsLeaderboard, 'Classifica');

      // Sheet 2: Tabellone Completo Turni
      const masterHeader = ['Pos.', 'N°', 'Coppia'];
      for (let r = 0; r < this.state.roundsCount; r++) {
        masterHeader.push(`T${r+1} MP`, `T${r+1} VP`);
      }
      masterHeader.push('Totale VP', 'Totale MP');

      const masterData = [
        ['BURRACO - TABELLONE COMPLETO DI TUTTI I TURNI'],
        ['Torneo:', this.state.title],
        [],
        masterHeader
      ];

      ranked.forEach((p, idx) => {
        const row = [idx + 1, p.lotNumber || '', p.name];
        for (let r = 0; r < this.state.roundsCount; r++) {
          const sc = p.scores[r] || {};
          row.push(sc.mp !== null ? sc.mp : '', sc.vp !== null ? sc.vp : '');
        }
        row.push(p.totVP, p.totMP);
        masterData.push(row);
      });

      const wsMaster = XLSX.utils.aoa_to_sheet(masterData);
      XLSX.utils.book_append_sheet(wb, wsMaster, 'Tabellone Completo');

      // File name
      const safeTitle = this.state.title.replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const fileName = `${safeTitle}_risultati.xlsx`;

      // Save via native Python bridge if in PyWebView, else browser download
      if (window.pywebview && window.pywebview.api && window.pywebview.api.export_excel_native) {
        const base64Data = XLSX.write(wb, { bookType: 'xlsx', type: 'base64' });
        window.pywebview.api.export_excel_native(fileName, base64Data).then(res => {
          if (res && res.success) {
            alert(`File Excel salvato con successo: ${res.path}`);
          }
        });
      } else {
        XLSX.writeFile(wb, fileName);
      }
    } catch (e) {
      console.error('Errore export Excel:', e);
      alert('Si è verificato un errore durante la generazione del file Excel.');
    }
  }

  exportBackupJSON() {
    try {
      const dataStr = JSON.stringify(this.state, null, 2);
      const blob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const safeTitle = (this.state.title || 'torneo').replace(/[^a-z0-9]/gi, '_').toLowerCase();
      const dateStr = new Date().toISOString().slice(0, 10);
      a.href = url;
      a.download = `${safeTitle}_backup_${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 200);
    } catch (e) {
      console.error('Errore export JSON:', e);
      alert('Si è verificato un errore durante il salvataggio del backup.');
    }
  }

  importBackupJSON(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const parsed = JSON.parse(e.target.result);
        if (parsed && Array.isArray(parsed.pairs)) {
          if (!parsed.settings) {
            parsed.settings = { showBulkPaste: false, showLottery: false };
          }
          this.state = parsed;
          this.saveState();
          this.render();
          this.closeModal('modalSettings');
          alert('Backup caricato con successo! Dati del torneo ripristinati.');
        } else {
          alert('Il file selezionato non contiene dati validi per un torneo di Burraco.');
        }
      } catch (err) {
        console.error('Errore lettura JSON:', err);
        alert('Impossibile leggere il file: formato JSON non valido.');
      }
    };
    reader.readAsText(file);
  }

  triggerPrint() {
    const printBody = document.getElementById('print-body');
    const ranked = this.getRankedPairs();

    let tableHtml = `
      <table class="data-table" style="width:100%;">
        <thead>
          <tr>
            <th style="width:60px; text-align:center;">Pos.</th>
            <th style="width:60px; text-align:center;">N°</th>
            <th>Coppia</th>
            <th style="text-align:center;">Totale VP</th>
            <th style="text-align:center;">Totale MP</th>
    `;

    for (let r = 0; r < this.state.roundsCount; r++) {
      tableHtml += `<th style="text-align:center; font-size:10pt;">T${r+1} VP</th>`;
    }

    tableHtml += `
          </tr>
        </thead>
        <tbody>
    `;

    ranked.forEach((p, idx) => {
      tableHtml += `
        <tr>
          <td style="text-align:center; font-weight:bold;">${idx + 1}°</td>
          <td style="text-align:center;">${p.lotNumber || '—'}</td>
          <td style="font-weight:600;">${this.escapeHtml(p.name)}</td>
          <td style="text-align:center; font-weight:bold; font-size:12pt;">${p.totVP}</td>
          <td style="text-align:center;">${p.totMP.toLocaleString('it-IT')}</td>
      `;

      for (let r = 0; r < this.state.roundsCount; r++) {
        const sc = p.scores[r];
        tableHtml += `<td style="text-align:center;">${sc && sc.vp !== null ? sc.vp : '—'}</td>`;
      }

      tableHtml += `</tr>`;
    });

    tableHtml += `
        </tbody>
      </table>
      <div style="margin-top:40px; display:flex; justify-content:space-between; font-size:11pt;">
        <div>Firma Arbitro di Gara: ______________________</div>
        <div>Firma Direttore di Torneo: ______________________</div>
      </div>
    `;

    printBody.innerHTML = tableHtml;
    window.print();
  }

  confirmNewTournament() {
    if (confirm('Sei sicuro di voler azzerare il torneo corrente e iniziarne uno nuovo? Tutti i punteggi correnti andranno persi.')) {
      this.state = JSON.parse(JSON.stringify(defaultState));
      this.state.title = 'Nuovo Torneo di Burraco';
      this.state.pairs = [];
      this.saveState();
      this.render();
      this.openModal('modalBulkPaste');
    }
  }

  // ==========================================
  // UTILITIES & MODAL HELPERS
  // ==========================================
  openModal(modalKey) {
    if (this[modalKey]) {
      this[modalKey].classList.add('active');
    }
  }

  closeModal(modalKey) {
    if (this[modalKey]) {
      this[modalKey].classList.remove('active');
    }
  }

  escapeHtml(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }
}

// Instantiate on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new BurracoApp();
});
