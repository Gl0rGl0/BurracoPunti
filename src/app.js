/**
 * BURRACO - TOURNAMENT MANAGER
 * UI Controller & Reactive View Manager
 */

class BurracoApp {
  constructor() {
    this.state = BurracoStorage.loadState();
    this.initDOMElements();
    this.bindEvents();
    this.render();

    // If PyWebView native API is ready, check and load disk tournament data
    window.addEventListener('pywebviewready', () => {
      if (window.pywebview && window.pywebview.api && window.pywebview.api.load_tournament_data) {
        window.pywebview.api.load_tournament_data().then(diskData => {
          if (diskData) {
            const parsedState = BurracoStorage.parseLoadedData(diskData);
            if (parsedState) {
              this.state = parsedState;
              this.applyConfig();
              this.syncSettingsUI();
              this.render();
            }
          }
        }).catch(err => console.error('Errore lettura statistiche_tornei.json da Python:', err));
      }
    });
  }

  // ==========================================
  // STATE PERSISTENCE HELPERS
  // ==========================================
  saveState() {
    BurracoStorage.saveState(this.state);
  }

  getRankedPairs() {
    return BurracoEngine.getRankedPairs(this.state.pairs, this.state.roundsCount);
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
    this.roundViewTitle = document.getElementById('round-view-title');
    this.roundTitleCheck = document.getElementById('round-title-check');
    this.currentRoundBadge = document.getElementById('current-round-badge');
    this.btnPrevRound = document.getElementById('btn-prev-round');
    this.btnNextRound = document.getElementById('btn-next-round');

    // Toolbar / Stats
    this.searchInput = document.getElementById('search-input');
    this.statTotalPairs = document.getElementById('stat-total-pairs');
    this.statCurrentRound = document.getElementById('stat-current-round');
    this.badgeGiornata = document.getElementById('badge-giornata');

    // Modals
    this.modalSettings = document.getElementById('modal-settings');
    this.modalAddPair = document.getElementById('modal-add-pair');
    this.modalEditPair = document.getElementById('modal-edit-pair');
    this.modalBulkPaste = document.getElementById('modal-bulk-paste');
    this.modalLottery = document.getElementById('modal-lottery');
    this.modalConfirmDelete = document.getElementById('modal-confirm-delete');
    this.modalNewTournament = document.getElementById('modal-new-tournament');
    this.modalExportImage = document.getElementById('modal-export-image');

    // Form inputs & export preview elements
    this.exportPreviewImg = document.getElementById('export-preview-img');
    this.exportModalFilename = document.getElementById('export-modal-filename');
    this.exportStatusTitle = document.getElementById('export-status-title');
    this.exportStatusDesc = document.getElementById('export-status-desc');
    this.instructionClipboard = document.getElementById('instruction-clipboard');
    this.btnCopyImageAgain = document.getElementById('btn-copy-image-again');
    this.currentExportBlob = null;
    this.currentExportBlobUrl = null;
    this.inputPairName = document.getElementById('input-pair-name');
    this.inputLotNumber = document.getElementById('input-lot-number');
    this.inputEditPairName = document.getElementById('edit-pair-name');
    this.inputEditLotNumber = document.getElementById('edit-lot-number');
    this.editPairId = document.getElementById('edit-pair-id');
    this.btnConfirmDelete = document.getElementById('btn-confirm-delete');
    this.pendingDeletePairId = null;

    this.toggleBulkPaste = document.getElementById('setting-toggle-bulk') || document.getElementById('setting-bulk-paste');
    this.toggleLottery = document.getElementById('setting-toggle-lottery') || document.getElementById('setting-lottery');
    this.togglePodium = document.getElementById('setting-toggle-podium') || document.getElementById('setting-podium');
    this.togglePrizepool = document.getElementById('setting-toggle-prizepool');
    this.settingEntryFee = document.getElementById('setting-entry-fee');
    this.settingPrizePcts = [
      document.getElementById('setting-prize-pct-1'),
      document.getElementById('setting-prize-pct-2'),
      document.getElementById('setting-prize-pct-3'),
      document.getElementById('setting-prize-pct-4'),
      document.getElementById('setting-prize-pct-5')
    ];
    this.prizePctBadge = document.getElementById('prize-pct-total-badge');
    this.prizePctHint = document.getElementById('prize-pct-hint');
    this._prizeHintTimer = null;
    this.settingRoundsCount = document.getElementById('setting-rounds-count');
    this.settingByePoints = document.getElementById('setting-bye-points');
    this.roundVpCheckBanner = document.getElementById('round-vp-check-banner');
    this.roundVpCheckIcon = document.getElementById('round-vp-check-icon');
    this.roundVpCheckMessage = document.getElementById('round-vp-check-message');
    this.btnBulkPasteToolbar = document.getElementById('btn-open-bulk-paste');
    this.btnLotteryToolbar = document.getElementById('btn-open-lottery');
    this.tabBtnPodium = document.getElementById('tab-btn-podium');
    this.btnOpenNewTournament = document.getElementById('btn-open-new-tournament');

    // Header action buttons
    this.btnPrint = document.getElementById('btn-print');
    this.btnOpenSettings = document.getElementById('btn-open-settings');

    // Initialize inputs with current state values
    if (this.titleInput) this.titleInput.value = this.state.title;
    this.applyConfig();
    this.syncSettingsUI();
  }

  applyConfig() {
    const cfg = typeof window !== 'undefined' && window.BURRACO_CONFIG ? window.BURRACO_CONFIG : null;
    if (!cfg) return;

    if (cfg.appTitle) {
      document.title = cfg.appTitle;
    }

    const brandEl = document.getElementById('brand-title');
    if (brandEl && cfg.brandName) {
      brandEl.textContent = cfg.brandName;
    }

    if (cfg.defaultTournamentTitle) {
      if (!this.state.title || this.state.title === 'Torneo di Burraco') {
        this.state.title = cfg.defaultTournamentTitle;
      }
    }

    if (cfg.labels) {
      const tabInitial = document.getElementById('tab-btn-initial');
      if (tabInitial && cfg.labels.playersTab) {
        tabInitial.innerHTML = `<span class="tab-icon">📋</span> ${BurracoUtils.escapeHtml(cfg.labels.playersTab)}`;
      }
      const initialH2 = document.querySelector('#view-initial .card-header h2');
      if (initialH2 && cfg.labels.playersTab) {
        initialH2.textContent = cfg.labels.playersTab;
      }
      const tabMaster = document.getElementById('tab-btn-master');
      if (tabMaster && cfg.labels.masterTab) {
        tabMaster.innerHTML = `<span class="tab-icon">🏆</span> ${BurracoUtils.escapeHtml(cfg.labels.masterTab)}`;
      }
      const masterH2 = document.querySelector('#view-master .card-header h2');
      if (masterH2 && cfg.labels.masterTab) {
        masterH2.textContent = cfg.labels.masterTab;
      }
      const tabPodium = document.getElementById('tab-btn-podium');
      if (tabPodium && cfg.labels.podiumTab) {
        tabPodium.innerHTML = `<span class="tab-icon">🥇</span> ${BurracoUtils.escapeHtml(cfg.labels.podiumTab)}`;
      }
      const btnNew = document.getElementById('btn-open-new-tournament');
      if (btnNew && cfg.labels.newEveningBtn) {
        btnNew.innerHTML = `<span class="btn-icon">✨</span> ${BurracoUtils.escapeHtml(cfg.labels.newEveningBtn)}`;
      }
    }
  }

  syncSettingsUI() {
    if (this.titleInput) this.titleInput.value = this.state.title;
    if (this.toggleBulkPaste) this.toggleBulkPaste.checked = !!this.state.settings.showBulkPaste;
    if (this.toggleLottery) this.toggleLottery.checked = !!this.state.settings.showLottery;
    if (this.togglePodium) this.togglePodium.checked = !!this.state.settings.showPodium;

    const cfgPrize = (typeof BURRACO_CONFIG !== 'undefined' && BURRACO_CONFIG.prizepool) || {};
    if (this.togglePrizepool) {
      const isPrizeVisible = (this.state.settings.showPrizepool !== undefined)
        ? !!this.state.settings.showPrizepool
        : (cfgPrize.showColumn !== false);
      this.togglePrizepool.checked = isPrizeVisible;
    }

    const curFee = (this.state.settings.entryFeePerPlayer !== undefined)
      ? this.state.settings.entryFeePerPlayer
      : (cfgPrize.entryFeePerPlayer !== undefined ? cfgPrize.entryFeePerPlayer : 2);
    if (this.settingEntryFee) this.settingEntryFee.value = curFee;

    const curPcts = this.state.settings.prizePercentages || cfgPrize.percentages || [50, 30, 20, 0, 0];
    this.settingPrizePcts?.forEach((inp, idx) => {
      if (inp) inp.value = (curPcts[idx] !== undefined && curPcts[idx] !== null) ? curPcts[idx] : 0;
    });

    this.updatePrizePercentages();

    if (this.settingRoundsCount) this.settingRoundsCount.value = this.state.roundsCount;

    const cfg = BurracoExcel._getConfig ? BurracoExcel._getConfig() : (window.BURRACO_CONFIG || {});
    const defaultBye = cfg.defaultByePoints !== undefined ? cfg.defaultByePoints : 12;
    const curBye = (this.state.settings && this.state.settings.byePoints !== undefined) ? this.state.settings.byePoints : defaultBye;
    if (this.settingByePoints) this.settingByePoints.value = curBye;

    this.applySettingsVisibility();
  }

  applySettingsVisibility() {
    if (this.btnBulkPasteToolbar) {
      this.btnBulkPasteToolbar.style.display = this.state.settings.showBulkPaste ? 'inline-flex' : 'none';
    }
    if (this.btnLotteryToolbar) {
      this.btnLotteryToolbar.style.display = this.state.settings.showLottery ? 'inline-flex' : 'none';
    }
    if (this.tabBtnPodium) {
      this.tabBtnPodium.style.display = this.state.settings.showPodium ? 'flex' : 'none';
      if (this.tabsNav) {
        if (!this.state.settings.showPodium) {
          this.tabsNav.classList.add('podium-hidden');
        } else {
          this.tabsNav.classList.remove('podium-hidden');
        }
      }
    }
  }

  updatePrizePercentages(activeInput = null) {
    if (!this.settingPrizePcts) return;

    if (activeInput) {
      let otherSum = 0;
      this.settingPrizePcts.forEach(inp => {
        if (inp && inp !== activeInput) {
          const val = parseFloat(inp.value) || 0;
          otherSum += Math.max(0, Math.min(100, val));
        }
      });

      const maxAllowed = Math.max(0, 100 - otherSum);
      const rawVal = activeInput.value ? activeInput.value.trim() : '';

      if (rawVal !== '') {
        let currentVal = parseFloat(rawVal);
        if (isNaN(currentVal) || currentVal < 0) {
          activeInput.value = 0;
        } else if (currentVal > maxAllowed) {
          activeInput.value = maxAllowed;
          if (this.prizePctHint) {
            this.prizePctHint.textContent = maxAllowed > 0
              ? `Valore limitato a ${maxAllowed}% per non superare il 100% totale.`
              : `Totale già al 100%. Riduci prima un'altra quota per aumentare questa.`;
            clearTimeout(this._prizeHintTimer);
            this._prizeHintTimer = setTimeout(() => {
              if (this.prizePctHint) this.prizePctHint.textContent = '';
            }, 3500);
          }
        } else if (this.prizePctHint && this.prizePctHint.textContent) {
          this.prizePctHint.textContent = '';
        }
      }
    }

    let total = 0;
    const pcts = this.settingPrizePcts.map(inp => {
      const v = Math.max(0, Math.min(100, parseFloat(inp?.value) || 0));
      total += v;
      return v;
    });

    if (this.prizePctBadge) {
      if (total === 100) {
        this.prizePctBadge.textContent = 'Totale: 100% ✓';
        this.prizePctBadge.style.background = '#ECFDF5';
        this.prizePctBadge.style.color = '#059669';
        this.prizePctBadge.style.borderColor = '#A7F3D0';
      } else if (total < 100) {
        const rem = 100 - total;
        this.prizePctBadge.textContent = `Totale: ${total}% (Disponibile: ${rem}%)`;
        this.prizePctBadge.style.background = '#EFF6FF';
        this.prizePctBadge.style.color = '#1D4ED8';
        this.prizePctBadge.style.borderColor = '#BFDBFE';
      } else {
        this.prizePctBadge.textContent = `Totale: ${total}% (> 100%)`;
        this.prizePctBadge.style.background = '#FEF2F2';
        this.prizePctBadge.style.color = '#DC2626';
        this.prizePctBadge.style.borderColor = '#FECACA';
      }
    }

    const fee = Math.max(0, parseFloat(this.settingEntryFee?.value) || 0);
    this.state.settings.entryFeePerPlayer = fee;
    this.state.settings.prizePercentages = pcts;
    this.saveState();
    this.renderMasterTable();
  }

  // ==========================================
  // EVENT BINDINGS
  // ==========================================
  bindEvents() {
    // Title changes
    this.titleInput?.addEventListener('input', (e) => {
      this.state.title = e.target.value.trim() || 'Torneo di Burraco';
      if (this.podiumTitle) this.podiumTitle.textContent = this.state.title;
      if (this.printTitle) this.printTitle.textContent = this.state.title;
      this.saveState();
    });

    // Navigation Tabs
    this.tabsNav?.addEventListener('click', (e) => {
      const btn = e.target.closest('.tab-btn');
      if (!btn) return;
      const targetTab = btn.dataset.tab;
      if (targetTab) {
        this.switchTab(targetTab);
      }
    });

    // Round navigation buttons
    this.btnPrevRound?.addEventListener('click', () => {
      if (this.state.activeRoundIndex > 0) {
        this.state.activeRoundIndex--;
        this.saveState();
        this.renderTabs();
        this.renderRoundView();
      }
    });

    this.btnNextRound?.addEventListener('click', () => {
      if (this.state.activeRoundIndex < this.state.roundsCount - 1) {
        this.state.activeRoundIndex++;
        this.saveState();
        this.renderTabs();
        this.renderRoundView();
      }
    });

    // Global Action Buttons
    this.btnPrint?.addEventListener('click', () => this.exportLeaderboardImage());
    this.btnOpenSettings?.addEventListener('click', () => this.openModal('modalSettings'));

    // Search filters
    this.searchInput?.addEventListener('input', (e) => {
      this.state.searchFilter = e.target.value.trim().toLowerCase();
      this.renderMasterTable();
    });

    this.initialSearchInput?.addEventListener('input', (e) => {
      this.state.initialSearchFilter = e.target.value.trim().toLowerCase();
      this.renderInitialTable();
    });

    // Toolbar and Quick Action Buttons
    const btnAddPair = document.getElementById('btn-add-pair-row') || document.getElementById('btn-add-pair');
    btnAddPair?.addEventListener('click', () => this.addNewPairRow());
    this.btnBulkPasteToolbar?.addEventListener('click', () => this.openModal('modalBulkPaste'));
    this.btnLotteryToolbar?.addEventListener('click', () => this.openModal('modalLottery'));

    // Export Buttons (Toolbar & Settings Modal)
    const btnExportExcel = document.getElementById('btn-modal-export-excel') || document.getElementById('btn-export-excel');
    btnExportExcel?.addEventListener('click', () => this.exportExcel());
    document.getElementById('btn-export-excel-round')?.addEventListener('click', () => this.exportExcel());

    const btnExportJson = document.getElementById('btn-modal-export-json') || document.getElementById('btn-export-json');
    btnExportJson?.addEventListener('click', () => BurracoExcel.exportBackupJSON(this.state));

    // Import JSON File
    const fileInput = document.getElementById('input-import-json');
    const btnImportJson = document.getElementById('btn-modal-import-json') || document.getElementById('btn-trigger-import-json');
    btnImportJson?.addEventListener('click', () => fileInput?.click());
    fileInput?.addEventListener('change', (e) => {
      const file = e.target.files[0];
      if (file) {
        const reader = new FileReader();
        reader.onload = (ev) => {
          try {
            const parsed = JSON.parse(ev.target.result);
            const res = BurracoStorage.mergeBackupData(this.state, parsed);
            if (res && res.success) {
              this.syncSettingsUI();
              this.render();
              this.closeModal('modalSettings');
              if (res.addedCount > 0) {
                alert(`Backup unito con successo!\nAggiunte ${res.addedCount} nuove serate allo storico (totale serate archiviate: ${res.totalCount}).`);
              } else {
                alert(`Nessuna nuova serata aggiunta.\nLe serate nel file erano già presenti nello storico o non contenevano dati completi (totale serate archiviate: ${res.totalCount}).`);
              }
            } else {
              alert('File JSON non valido o privo di dati compatibili per il torneo.');
            }
          } catch (err) {
            console.error('Errore lettura JSON:', err);
            alert('Formato del file JSON non valido.');
          } finally {
            fileInput.value = '';
          }
        };
        reader.readAsText(file);
      }
    });

    // Clear Tournament Data Button in Settings
    document.getElementById('btn-modal-clear-data')?.addEventListener('click', () => {
      if (confirm('Sei sicuro di voler azzerare tutti i dati del torneo corrente?')) {
        this.state.pairs = [];
        this.saveState();
        this.render();
        this.closeModal('modalSettings');
      }
    });

    // Lottery Actions
    const btnDrawRandom = document.getElementById('btn-run-random-lottery') || document.getElementById('btn-draw-random-lottery');
    btnDrawRandom?.addEventListener('click', () => this.runRandomLottery());

    const btnDrawSeq = document.getElementById('btn-run-sequential-lottery') || document.getElementById('btn-draw-sequential-lottery');
    btnDrawSeq?.addEventListener('click', () => this.runSequentialLottery());

    // Bulk Paste Actions
    const btnConfirmBulk = document.getElementById('btn-confirm-bulk') || document.getElementById('btn-confirm-bulk-paste');
    btnConfirmBulk?.addEventListener('click', () => this.processBulkPaste());

    // Settings Toggle Listeners
    this.toggleBulkPaste?.addEventListener('change', (e) => {
      this.state.settings.showBulkPaste = e.target.checked;
      this.applySettingsVisibility();
      this.saveState();
    });

    this.toggleLottery?.addEventListener('change', (e) => {
      this.state.settings.showLottery = e.target.checked;
      this.applySettingsVisibility();
      this.saveState();
    });

    this.togglePodium?.addEventListener('change', (e) => {
      this.state.settings.showPodium = e.target.checked;
      this.applySettingsVisibility();
      this.saveState();
    });

    this.togglePrizepool?.addEventListener('change', (e) => {
      this.state.settings.showPrizepool = e.target.checked;
      this.saveState();
      this.renderMasterTable();
    });

    this.settingEntryFee?.addEventListener('input', () => this.updatePrizePercentages());
    this.settingPrizePcts?.forEach(inp => {
      inp?.addEventListener('input', () => this.updatePrizePercentages(inp));
      inp?.addEventListener('blur', () => {
        if (inp.value === '') {
          inp.value = 0;
          this.updatePrizePercentages(inp);
        }
      });
    });

    this.settingRoundsCount?.addEventListener('change', (e) => {
      const val = parseInt(e.target.value, 10);
      this.setRoundsCount(val);
    });

    this.settingByePoints?.addEventListener('input', (e) => {
      const raw = e.target.value.trim();
      if (raw === '') return;
      const parsed = parseInt(raw, 10);
      if (!isNaN(parsed)) {
        const clamped = Math.max(0, Math.min(20, parsed));
        if (clamped !== parsed) {
          e.target.value = clamped;
        }
      }
    });

    this.settingByePoints?.addEventListener('change', (e) => {
      const parsed = parseInt(e.target.value, 10);
      const val = Math.max(0, Math.min(20, isNaN(parsed) ? 12 : parsed));
      this.state.settings.byePoints = val;
      if (this.settingByePoints) this.settingByePoints.value = val;
      this.saveState();
      this.checkRoundScoreConsistency();
    });

    // New Tournament Modal
    this.btnOpenNewTournament?.addEventListener('click', () => {
      this.openModal('modalNewTournament');
    });
    document.getElementById('close-new-tournament-modal')?.addEventListener('click', () => {
      this.closeModal('modalNewTournament');
    });
    document.getElementById('btn-cancel-new-tournament')?.addEventListener('click', () => {
      this.closeModal('modalNewTournament');
    });
    document.getElementById('btn-confirm-new-evening')?.addEventListener('click', () => {
      this.startNewEvening();
    });

    // Close buttons on all modals
    document.getElementById('close-settings-modal')?.addEventListener('click', () => this.closeModal('modalSettings'));
    document.getElementById('btn-close-settings')?.addEventListener('click', () => this.closeModal('modalSettings'));
    document.getElementById('close-add-pair-modal')?.addEventListener('click', () => this.closeModal('modalAddPair'));
    document.getElementById('btn-cancel-add-pair')?.addEventListener('click', () => this.closeModal('modalAddPair'));
    document.getElementById('close-edit-pair-modal')?.addEventListener('click', () => this.closeModal('modalEditPair'));
    document.getElementById('btn-cancel-edit-pair')?.addEventListener('click', () => this.closeModal('modalEditPair'));
    document.getElementById('close-bulk-paste-modal')?.addEventListener('click', () => this.closeModal('modalBulkPaste'));
    document.getElementById('btn-cancel-bulk')?.addEventListener('click', () => this.closeModal('modalBulkPaste'));
    document.getElementById('close-lottery-modal')?.addEventListener('click', () => this.closeModal('modalLottery'));
    document.getElementById('btn-close-lottery')?.addEventListener('click', () => this.closeModal('modalLottery'));
    document.getElementById('close-confirm-delete-modal')?.addEventListener('click', () => this.closeModal('modalConfirmDelete'));
    document.getElementById('btn-cancel-delete')?.addEventListener('click', () => this.closeModal('modalConfirmDelete'));
    document.getElementById('close-export-image-modal')?.addEventListener('click', () => this.closeModal('modalExportImage'));
    document.getElementById('btn-close-export-modal')?.addEventListener('click', () => this.closeModal('modalExportImage'));

    this.btnCopyImageAgain?.addEventListener('click', () => {
      if (this.currentExportBlob && typeof navigator !== 'undefined' && navigator.clipboard && typeof ClipboardItem !== 'undefined') {
        navigator.clipboard.write([new ClipboardItem({ 'image/png': this.currentExportBlob })]).then(() => {
          if (this.btnCopyImageAgain) {
            const originalHTML = this.btnCopyImageAgain.innerHTML;
            this.btnCopyImageAgain.innerHTML = '<span class="btn-icon">✓</span> Copiata!';
            setTimeout(() => {
              if (this.btnCopyImageAgain) this.btnCopyImageAgain.innerHTML = originalHTML;
            }, 2000);
          }
        }).catch(err => console.warn('Errore ricopia immagine:', err));
      }
    });

    this.btnConfirmDelete?.addEventListener('click', () => {
      if (this.pendingDeletePairId) {
        this.state.pairs = this.state.pairs.filter(p => p.id !== this.pendingDeletePairId);
        this.pendingDeletePairId = null;
        this.saveState();
        this.renderInitialTable();
        this.closeModal('modalConfirmDelete');
      }
    });

    // Close modals on backdrop click or Escape key
    document.querySelectorAll('.modal-backdrop').forEach(modal => {
      modal.addEventListener('click', (e) => {
        if (e.target === modal) {
          modal.classList.remove('active');
        }
      });
    });

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        document.querySelectorAll('.modal-backdrop.active').forEach(m => m.classList.remove('active'));
      }
    });

    // Keyboard navigation in Round Table
    this.roundTable?.addEventListener('keydown', (e) => this.handleRoundTableKeyboard(e));
  }

  // ==========================================
  // TAB NAVIGATION CONTROLLER
  // ==========================================
  switchTab(tabKey) {
    if (tabKey.startsWith('round-')) {
      const rIdx = parseInt(tabKey.replace('round-', ''), 10);
      this.state.activeRoundIndex = rIdx;
      this.state.currentTab = 'round';
    } else {
      this.state.currentTab = tabKey;
    }

    this.saveState();

    // Toggle button active classes
    this.tabsNav?.querySelectorAll('.tab-btn').forEach(btn => {
      const isInitial = btn.dataset.tab === 'initial' && this.state.currentTab === 'initial';
      const isMaster = btn.dataset.tab === 'master' && this.state.currentTab === 'master';
      const isPodium = btn.dataset.tab === 'podium' && this.state.currentTab === 'podium';
      const isRound = btn.dataset.tab === `round-${this.state.activeRoundIndex}` && this.state.currentTab === 'round';

      if (isInitial || isMaster || isPodium || isRound) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    // Toggle view panels
    Object.keys(this.viewPanels).forEach(key => {
      if (this.viewPanels[key]) {
        if (key === this.state.currentTab) {
          this.viewPanels[key].classList.add('active');
        } else {
          this.viewPanels[key].classList.remove('active');
        }
      }
    });

    // Show "Nuova Serata" button only in Tabellone Iniziale
    if (this.btnOpenNewTournament) {
      this.btnOpenNewTournament.style.display = (this.state.currentTab === 'initial') ? 'inline-flex' : 'none';
    }

    // Re-render corresponding views
    if (this.state.currentTab === 'initial') {
      this.renderInitialTable();
    } else if (this.state.currentTab === 'round') {
      this.renderRoundView();
    } else if (this.state.currentTab === 'master') {
      this.renderMasterTable();
    } else if (this.state.currentTab === 'podium') {
      this.renderPodium();
    }
  }

  // ==========================================
  // RENDER COORDINATOR
  // ==========================================
  render() {
    this.renderTabs();
    this.renderInitialTable();
    this.renderMasterTable();
    this.renderRoundView();
    this.renderPodium();

    // Update stats
    if (this.statTotalPairs) {
      const validCount = this.state.pairs.filter(p => p.name && p.name.trim() !== '').length;
      this.statTotalPairs.textContent = validCount;
    }
    if (this.statCurrentRound) {
      this.statCurrentRound.textContent = `Turno ${this.state.activeRoundIndex + 1} di ${this.state.roundsCount}`;
    }
    if (this.printTitle) {
      this.printTitle.textContent = this.state.title;
    }
    if (this.printDate) {
      let printDateStr = '';
      if (this.state.currentGiornataKey) {
        const m = this.state.currentGiornataKey.match(/^serata_(\d{2})(\d{2})(\d{2})/);
        if (m) printDateStr = `${m[1]}/${m[2]}/20${m[3]}`;
      }
      this.printDate.textContent = `Data: ${printDateStr || new Date().toLocaleDateString('it-IT')}`;
    }
    if (this.badgeGiornata) {
      const dateText = BurracoUtils.formatGiornataLabel(this.state.currentGiornataKey);
      this.badgeGiornata.textContent = dateText || '';
    }

    // Show Nuova Serata only on Tabellone Iniziale
    if (this.btnOpenNewTournament) {
      this.btnOpenNewTournament.style.display = (this.state.currentTab === 'initial') ? 'inline-flex' : 'none';
    }
  }

  renderTabs() {
    if (!this.roundTabsContainer) return;
    this.roundTabsContainer.innerHTML = '';

    for (let i = 0; i < this.state.roundsCount; i++) {
      const tabBtn = document.createElement('button');
      tabBtn.className = 'tab-btn';
      tabBtn.dataset.tab = `round-${i}`;
      if (this.state.currentTab === 'round' && this.state.activeRoundIndex === i) {
        tabBtn.classList.add('active');
      }
      tabBtn.innerHTML = `<span class="tab-icon">🎯</span> Turno ${i + 1}`;
      this.roundTabsContainer.appendChild(tabBtn);
    }
  }

  // ==========================================
  // TAB 1: INITIAL PAIR REGISTRATION VIEW
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
          <div style="font-size:16px; font-weight:600; margin-bottom:6px; color:var(--text-main);">Nessuna coppia ancora inserita</div>
          <p style="font-size:14.5px; margin:0;">Clicca su <strong>➕ Aggiungi Coppia</strong> qui sotto per inserire i partecipanti.</p>
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
        <td style="text-align:center; font-weight:700; color:var(--text-muted); font-size:15px; width:55px;">
          ${rowIdx + 1}
        </td>
        <td>
          <input type="text" class="form-control initial-name-input" 
                 data-pair-id="${pair.id}" data-row-idx="${rowIdx}"
                 value="${BurracoUtils.escapeHtml(pair.name)}" 
                 placeholder="Nome Coppia / Giocatori (es. Pietro - Paolo)"
                 style="width:100%; font-size:16px; font-weight:600; padding:8px 12px;">
        </td>
        <td style="text-align:center; width:150px;">
          <input type="number" min="1" max="999" class="form-control tabular-nums initial-lot-input" 
                 data-pair-id="${pair.id}" data-row-idx="${rowIdx}"
                 value="${lotVal}" 
                 placeholder="N°" 
                 style="width:90px; text-align:center; font-weight:700; margin:0 auto; font-size:16px; padding:8px 8px;">
        </td>
        <td style="text-align:center; width:60px;">
          <button class="btn-ghost text-danger btn-delete-initial-pair" data-pair-id="${pair.id}" title="Elimina riga" style="font-size:16px;">🗑️</button>
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
          pair.name = e.target.value;
          this.saveState();
        }
      });

      input.addEventListener('blur', (e) => {
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

    // Input listeners for lot number
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

    // Delete buttons
    this.initialTableBody.querySelectorAll('.btn-delete-initial-pair').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const pairId = e.currentTarget.dataset.pairId;
        const pair = this.state.pairs.find(p => p.id === pairId);
        if (pair && pair.name && pair.name.trim() !== '') {
          this.pendingDeletePairId = pairId;
          const msg = document.getElementById('confirm-delete-detail') || document.getElementById('delete-pair-confirm-msg');
          if (msg) msg.textContent = pair.name;
          this.openModal('modalConfirmDelete');
        } else {
          this.state.pairs = this.state.pairs.filter(p => p.id !== pairId);
          this.saveState();
          this.renderInitialTable();
        }
      });
    });

    // Focus requested row
    if (focusPairId) {
      setTimeout(() => {
        const targetInput = this.initialTableBody.querySelector(`.initial-name-input[data-pair-id="${focusPairId}"]`);
        if (targetInput) targetInput.focus();
      }, 50);
    }
  }

  // ==========================================
  // TAB 3: MASTER LEADERBOARD VIEW
  // ==========================================
  renderMasterTable() {
    if (!this.masterTableHeadRow || !this.masterTableBody) return;

    const cfgPrize = (typeof BURRACO_CONFIG !== 'undefined' && BURRACO_CONFIG.prizepool) || {};
    const showPrizepool = (this.state.settings.showPrizepool !== undefined)
      ? !!this.state.settings.showPrizepool
      : (cfgPrize.showColumn !== false);
    const prizeColTitle = cfgPrize.columnHeader || 'Premio (€)';

    // 1. Ranked pairs e calcolo dinamico larghezza colonna "Coppia / Giocatori" (nome più lungo + 2 caratteri)
    const ranked = this.getRankedPairs().filter(p => p.name && p.name.trim() !== '');
    let maxNameLen = 19; // Intestazione "Coppia / Giocatori"
    ranked.forEach(pair => {
      const len = pair.name ? pair.name.trim().length : 0;
      if (len > maxNameLen) maxNameLen = len;
    });
    const colNameWidth = `${maxNameLen + 2}ch`;

    // 2. Build Header dynamically based on roundsCount (Two-row header for precise column alignment)
    const thead = this.masterTable.querySelector('thead');
    if (thead) {
      let roundColsHtml = '';
      let subHeadersHtml = '';
      for (let r = 0; r < this.state.roundsCount; r++) {
        roundColsHtml += `<th colspan="2" class="round-col-header">Turno ${r + 1}</th>`;
        subHeadersHtml += `
          <th class="sub-header-mp">MP</th>
          <th class="sub-header-vp">VP</th>
        `;
      }

      let prizeTh = '';
      if (showPrizepool) {
        prizeTh = `<th rowspan="2" class="col-prize">${prizeColTitle}</th>`;
      }

      thead.innerHTML = `
        <tr id="master-table-head-row">
          <th rowspan="2" class="col-rank">Pos.</th>
          <th rowspan="2" class="col-name" style="width:${colNameWidth}; max-width:${colNameWidth}; white-space:nowrap;">Coppia / Giocatori</th>
          <th rowspan="2" class="col-lot" title="Numero identificativo">N°</th>
          ${roundColsHtml}
          <th rowspan="2" class="col-tot-vp">Totale VP</th>
          <th rowspan="2" class="col-tot-mp">Totale MP</th>
          ${prizeTh}
        </tr>
        <tr class="master-table-subhead-row">
          ${subHeadersHtml}
        </tr>
      `;
      this.masterTableHeadRow = document.getElementById('master-table-head-row');
    }

    this.masterTableBody.innerHTML = '';
    const filter = this.state.searchFilter;

    if (ranked.length === 0) {
      const totalCols = 5 + (this.state.roundsCount * 2) + (showPrizepool ? 1 : 0);
      const emptyRow = document.createElement('tr');
      emptyRow.innerHTML = `
        <td colspan="${totalCols}" style="text-align:center; padding:36px 20px; color:var(--text-muted);">
          <div style="font-size:16px; font-weight:600; margin-bottom:6px; color:var(--text-main);">Nessuna coppia registrata</div>
          <p style="font-size:14.5px; margin:0;">Inserisci le coppie dal <strong>Tabellone Iniziale</strong> per visualizzare la classifica.</p>
        </td>
      `;
      this.masterTableBody.appendChild(emptyRow);
      return;
    }

    // Compute prizes map
    const fee = (this.state.settings.entryFeePerPlayer !== undefined)
      ? this.state.settings.entryFeePerPlayer
      : (cfgPrize.entryFeePerPlayer !== undefined ? cfgPrize.entryFeePerPlayer : 2);
    const pcts = this.state.settings.prizePercentages || cfgPrize.percentages || [50, 30, 20, 0, 0];

    const prizepoolResult = showPrizepool
      ? BurracoEngine.calculatePrizepool(ranked.length, fee, pcts)
      : null;

    const prizeMap = {};
    if (prizepoolResult && prizepoolResult.prizes) {
      prizepoolResult.prizes.forEach(p => {
        prizeMap[p.rank] = p.text;
      });
    }

    ranked.forEach((pair, idx) => {
      if (!pair.name || pair.name.trim() === '') return;

      if (filter) {
        const matchesName = pair.name.toLowerCase().includes(filter);
        const matchesLot = String(pair.lotNumber || '').includes(filter);
        if (!matchesName && !matchesLot) return;
      }

      const rank = idx + 1;
      let rankDisplay = `<span class="tabular-nums" style="color:var(--text-muted);">${rank}°</span>`;
      if (rank === 1) rankDisplay = `<span class="rank-badge rank-1">1°</span>`;
      else if (rank === 2) rankDisplay = `<span class="rank-badge rank-2">2°</span>`;
      else if (rank === 3) rankDisplay = `<span class="rank-badge rank-3">3°</span>`;

      let roundCellsHtml = '';
      for (let r = 0; r < this.state.roundsCount; r++) {
        const sc = pair.scores[r] || { mp: null, vp: null };
        const mpText = (sc.mp !== null && sc.mp !== undefined) ? Number(sc.mp).toLocaleString('it-IT') : '<span style="color:#CBD5E1;">—</span>';
        const vpText = (sc.vp !== null && sc.vp !== undefined) ? `<strong style="color:var(--primary); font-size:15.5px;">${sc.vp}</strong>` : '<span style="color:#CBD5E1;">—</span>';

        roundCellsHtml += `
          <td class="col-round-mp">${mpText}</td>
          <td class="col-round-vp">${vpText}</td>
        `;
      }

      let prizeCellHtml = '';
      if (showPrizepool) {
        const pText = prizeMap[rank] || '—';
        const isAwarded = pText !== '—';
        const pStyle = isAwarded
          ? 'font-weight:700; color:#047857; background-color:#F0FDF4; font-size:15px;'
          : 'color:#94A3B8; font-size:14px;';
        prizeCellHtml = `<td class="col-prize" style="text-align:center; ${pStyle}">${pText}</td>`;
      }

      const tr = document.createElement('tr');
      tr.dataset.pairId = pair.id;

      tr.innerHTML = `
        <td class="col-rank">${rankDisplay}</td>
        <td class="col-name" style="width:${colNameWidth}; max-width:${colNameWidth}; white-space:nowrap; color:var(--text-main);">${BurracoUtils.escapeHtml(pair.name)}</td>
        <td class="col-lot"><span class="tabular-nums">${pair.lotNumber || '—'}</span></td>
        ${roundCellsHtml}
        <td class="col-tot-vp" style="text-align:center; font-weight:800; font-size:18px; color:var(--primary); background-color:#EFF6FF;">${pair.totVP}</td>
        <td class="col-tot-mp" style="text-align:center; font-weight:700; font-size:15px; color:var(--text-main); background-color:#F8FAFC;">${pair.totMP.toLocaleString('it-IT')}</td>
        ${prizeCellHtml}
      `;

      this.masterTableBody.appendChild(tr);
    });
  }

  // ==========================================
  // TAB 2: ROUND SCORE INPUT VIEW
  // ==========================================
  renderRoundView() {
    const roundIdx = this.state.activeRoundIndex;
    if (this.roundViewTitle) {
      this.roundViewTitle.textContent = `Inserimento Punteggi - Turno ${roundIdx + 1}`;
    }
    if (this.currentRoundBadge) {
      this.currentRoundBadge.textContent = `Turno ${roundIdx + 1} di ${this.state.roundsCount}`;
    }

    if (this.btnPrevRound) {
      this.btnPrevRound.style.display = roundIdx === 0 ? 'none' : 'inline-flex';
    }
    if (this.btnNextRound) {
      this.btnNextRound.style.display = roundIdx >= this.state.roundsCount - 1 ? 'none' : 'inline-flex';
    }

    if (!this.roundTableBody) return;
    this.roundTableBody.innerHTML = '';

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
        <td colspan="4" style="text-align:center; padding:32px; color:var(--text-muted); font-size:15px;">
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
        <td class="col-lot" style="font-size:16px; font-weight:600;">${pair.lotNumber || '—'}</td>
        <td class="col-name" style="font-size:16px; font-weight:600;">${BurracoUtils.escapeHtml(pair.name)}</td>
        <td class="col-input">
          <input type="number" class="form-control tabular-nums round-score-input" 
                 data-pair-id="${pair.id}" data-field="mp" value="${mpVal}" 
                 placeholder="es. 1540" style="max-width:145px; font-size:15.5px; padding:8px 12px;">
        </td>
        <td class="col-input">
          <input type="number" step="1" min="0" max="20" class="form-control tabular-nums round-score-input" 
                 data-pair-id="${pair.id}" data-field="vp" value="${vpVal}" 
                 placeholder="es. 14" style="max-width:115px; font-weight:bold; color:var(--primary); font-size:16px; padding:8px 12px;">
        </td>
      `;

      this.roundTableBody.appendChild(tr);
    });

    // Event listeners for round inputs
    this.roundTableBody.querySelectorAll('.round-score-input').forEach(inp => {
      const handleInputOrChange = (e) => {
        const pairId = e.target.dataset.pairId;
        const field = e.target.dataset.field;
        const pair = this.state.pairs.find(p => p.id === pairId);
        if (!pair) return;

        if (!pair.scores[roundIdx]) pair.scores[roundIdx] = { mp: null, vp: null };
        const rawVal = e.target.value.trim();
        let val = rawVal === '' ? null : Number(rawVal);

        // I singoli punteggi VP non possono superare 20 e devono essere >= 0
        if (field === 'vp' && val !== null && !isNaN(val)) {
          if (val < 0) {
            val = 0;
            e.target.value = 0;
          } else if (val > 20) {
            val = 20;
            e.target.value = 20;
          }
        }

        pair.scores[roundIdx][field] = val;

        if (e.type === 'change') {
          this.saveState();
        }
        this.checkRoundScoreConsistency();
      };

      inp.addEventListener('input', handleInputOrChange);
      inp.addEventListener('change', handleInputOrChange);
    });

    this.checkRoundScoreConsistency();
  }

  /**
   * Verifica la consistenza della somma punti VP per il turno attivo.
   * Il controllo avviene solamente quando tutte le coppie hanno i VP inseriti.
   */
  checkRoundScoreConsistency() {
    const roundIdx = this.state.activeRoundIndex;
    const validPairs = this.state.pairs.filter(p => p.name && p.name.trim() !== '');

    if (this.roundTitleCheck) this.roundTitleCheck.style.display = 'none';

    if (validPairs.length === 0) {
      if (this.roundVpCheckBanner) this.roundVpCheckBanner.style.display = 'none';
      return;
    }

    // Verifica se TUTTE le coppie hanno il punteggio VP compilato
    let allVpFilled = true;
    let totalVP = 0;
    let hasOutOfRangeScore = false;
    const vpScores = [];

    for (const pair of validPairs) {
      const sc = pair.scores && pair.scores[roundIdx];
      if (!sc || sc.vp === null || sc.vp === undefined || sc.vp === '') {
        allVpFilled = false;
        break;
      }
      const num = Number(sc.vp);
      if (isNaN(num)) {
        allVpFilled = false;
        break;
      }
      if (num < 0 || num > 20) {
        hasOutOfRangeScore = true;
      }
      totalVP += num;
      vpScores.push(num);
    }

    // Il check si attiva solamente dopo che tutti i punti sono stati inseriti
    if (!allVpFilled) {
      if (this.roundVpCheckBanner) this.roundVpCheckBanner.style.display = 'none';
      return;
    }

    const numPairs = validPairs.length;
    const cfg = BurracoExcel._getConfig ? BurracoExcel._getConfig() : (window.BURRACO_CONFIG || {});
    const defaultBye = cfg.defaultByePoints !== undefined ? cfg.defaultByePoints : 12;
    const byePoints = (this.state.settings && this.state.settings.byePoints !== undefined)
      ? Number(this.state.settings.byePoints)
      : defaultBye;

    const res = BurracoEngine.validateRoundVpSum(vpScores, numPairs, byePoints);

    if (hasOutOfRangeScore || res.hasOutOfRange) {
      if (this.roundTitleCheck) this.roundTitleCheck.style.display = 'none';
      if (this.roundVpCheckBanner) {
        this.roundVpCheckBanner.style.display = 'flex';
        this.roundVpCheckBanner.style.background = '#FEF2F2';
        this.roundVpCheckBanner.style.border = '1px solid #FECACA';
        this.roundVpCheckBanner.style.color = '#991B1B';
      }
      if (this.roundVpCheckIcon) this.roundVpCheckIcon.textContent = '⚠️';
      if (this.roundVpCheckMessage) {
        this.roundVpCheckMessage.textContent = `Attenzione Turno ${roundIdx + 1}: I singoli punteggi VP devono essere compresi tra 0 e 20!`;
      }
      return;
    }

    if (res.valid) {
      // Quando il turno è valido, non mostriamo il banner verde ingombrante: mostriamo solo la spunta ✅ accanto al titolo
      if (this.roundVpCheckBanner) {
        this.roundVpCheckBanner.style.display = 'none';
      }
      if (this.roundTitleCheck) {
        this.roundTitleCheck.style.display = 'inline-block';
        const detail = res.isOdd
          ? `(${res.completeTables} tavoli da 20 VP + ${res.byePoints} VP riposo)`
          : `(${res.completeTables} tavoli completi da 20 VP)`;
        this.roundTitleCheck.title = `Turno ${roundIdx + 1} valido: Totale di ${totalVP} VP corretto per ${res.numPairs} squadre ${detail}`;
      }
    } else {
      if (this.roundTitleCheck) this.roundTitleCheck.style.display = 'none';
      if (this.roundVpCheckBanner) {
        this.roundVpCheckBanner.style.display = 'flex';
        this.roundVpCheckBanner.style.background = '#FEF2F2';
        this.roundVpCheckBanner.style.border = '1px solid #FECACA';
        this.roundVpCheckBanner.style.color = '#991B1B';
      }
      if (this.roundVpCheckIcon) this.roundVpCheckIcon.textContent = '⚠️';
      if (this.roundVpCheckMessage) {
        const detail = res.isOdd
          ? `(attesi esattamente ${res.expectedVP} VP: ${res.completeTables} tavoli da 20 VP + ${res.byePoints} VP riposo)`
          : `(attesi esattamente ${res.expectedVP} VP per ${res.completeTables} tavoli da 20 VP)`;
        this.roundVpCheckMessage.textContent = `Attenzione Turno ${roundIdx + 1}: Totale inserito di ${totalVP} VP non corretto ${detail}. Verifica i punteggi inseriti nei tavoli.`;
      }
    }
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
    } else if (e.key === 'ArrowRight') {
      const isAtEnd = currentInput.selectionStart === currentInput.value.length;
      if (isAtEnd && colIndex === 2) {
        targetInput = currentTr.children[3]?.querySelector('.round-score-input');
      }
    } else if (e.key === 'ArrowLeft') {
      const isAtStart = currentInput.selectionStart === 0;
      if (isAtStart && colIndex === 3) {
        targetInput = currentTr.children[2]?.querySelector('.round-score-input');
      }
    }

    if (targetInput) {
      targetInput.focus();
      targetInput.select();
    }
  }

  // ==========================================
  // PODIUM & CEREMONY VIEW
  // ==========================================
  renderPodium() {
    const ranked = this.getRankedPairs();

    // 1st Place (Gold)
    const p1 = ranked[0];
    const t1 = document.getElementById('pillar-team-1');
    const s1 = document.getElementById('pillar-score-1');
    if (t1) t1.textContent = p1 ? p1.name : '—';
    if (s1) s1.textContent = p1 ? `${p1.totVP} VP (${p1.totMP.toLocaleString('it-IT')} MP)` : '0 VP';

    // 2nd Place (Silver)
    const p2 = ranked[1];
    const t2 = document.getElementById('pillar-team-2');
    const s2 = document.getElementById('pillar-score-2');
    if (t2) t2.textContent = p2 ? p2.name : '—';
    if (s2) s2.textContent = p2 ? `${p2.totVP} VP (${p2.totMP.toLocaleString('it-IT')} MP)` : '0 VP';

    // 3rd Place (Bronze)
    const p3 = ranked[2];
    const t3 = document.getElementById('pillar-team-3');
    const s3 = document.getElementById('pillar-score-3');
    if (t3) t3.textContent = p3 ? p3.name : '—';
    if (s3) s3.textContent = p3 ? `${p3.totVP} VP (${p3.totMP.toLocaleString('it-IT')} MP)` : '0 VP';

    // Honorable mentions (4th and 5th)
    const honorableGrid = document.getElementById('honorable-grid');
    if (honorableGrid) {
      honorableGrid.innerHTML = '';
      for (let i = 3; i < Math.min(5, ranked.length); i++) {
        const p = ranked[i];
        const card = document.createElement('div');
        card.className = 'honorable-card';
        card.innerHTML = `
          <span class="honorable-rank">${i + 1}°</span>
          <span class="honorable-name">${BurracoUtils.escapeHtml(p.name)}</span>
          <span class="honorable-score">${p.totVP} VP (${p.totMP.toLocaleString('it-IT')} MP)</span>
        `;
        honorableGrid.appendChild(card);
      }
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

      this.state.pairs.forEach(p => {
        if (p.scores.length > newCount) {
          p.scores = p.scores.slice(0, newCount);
        }
      });
    } else {
      this.state.pairs.forEach(p => {
        while (p.scores.length < newCount) {
          p.scores.push({ mp: null, vp: null });
        }
      });
    }

    this.state.roundsCount = newCount;
    if (this.state.activeRoundIndex >= newCount) {
      this.state.activeRoundIndex = newCount - 1;
    }

    this.saveState();
    this.render();
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

    BurracoEngine.assignRandomLots(this.state.pairs);
    this.saveState();
    this.render();
    this.closeModal('modalLottery');
  }

  runSequentialLottery() {
    BurracoEngine.assignSequentialLots(this.state.pairs);
    this.saveState();
    this.render();
    this.closeModal('modalLottery');
  }

  // ==========================================
  // BULK PASTE IMPORT
  // ==========================================
  processBulkPaste() {
    const textarea = document.getElementById('bulk-paste-textarea');
    const text = textarea?.value?.trim() || '';
    if (!text) {
      alert('Incolla del testo prima di confermare.');
      return;
    }

    const autoNumber = document.getElementById('bulk-auto-number')?.checked || false;
    const currentMaxLot = this.state.pairs.reduce((max, p) => Math.max(max, p.lotNumber || 0), 0);

    const newPairs = BurracoExcel.parseBulkPaste(text, autoNumber, currentMaxLot + 1, this.state.roundsCount);
    if (newPairs.length === 0) {
      alert('Nessun nome rilevato.');
      return;
    }

    this.state.pairs.push(...newPairs);
    this.saveState();
    this.render();

    if (textarea) textarea.value = '';
    this.closeModal('modalBulkPaste');
    alert(`Importate con successo ${newPairs.length} coppie!`);
  }

  // ==========================================
  // EXCEL & PRINT
  // ==========================================
  exportExcel() {
    BurracoExcel.exportToExcel(this.state, this.getRankedPairs());
  }

  exportLeaderboardImage() {
    BurracoExcel.exportLeaderboardImage(this.state, this.getRankedPairs(), (res) => {
      if (res && res.success) {
        this.showExportImageModal(res);
      } else if (res && res.error) {
        alert(res.error);
      }
    });
  }

  showExportImageModal({ blob, fileName, copiedToClipboard }) {
    if (this.currentExportBlobUrl) {
      URL.revokeObjectURL(this.currentExportBlobUrl);
      this.currentExportBlobUrl = null;
    }
    this.currentExportBlob = blob;
    this.currentExportBlobUrl = URL.createObjectURL(blob);

    if (this.exportPreviewImg) {
      this.exportPreviewImg.src = this.currentExportBlobUrl;
    }
    if (this.exportModalFilename) {
      this.exportModalFilename.textContent = fileName;
    }
    if (copiedToClipboard) {
      if (this.exportStatusTitle) this.exportStatusTitle.textContent = 'Pronta per WhatsApp!';
      if (this.exportStatusDesc) this.exportStatusDesc.textContent = "L'immagine è stata copiata negli appunti e scaricata sul tuo computer.";
      if (this.instructionClipboard) this.instructionClipboard.style.display = 'flex';
      if (this.btnCopyImageAgain) this.btnCopyImageAgain.style.display = 'inline-flex';
    } else {
      if (this.exportStatusTitle) this.exportStatusTitle.textContent = 'Immagine Scaricata!';
      if (this.exportStatusDesc) this.exportStatusDesc.textContent = "Il file PNG è pronto: puoi allegarlo direttamente su WhatsApp dalla cartella Download.";
      if (this.instructionClipboard) this.instructionClipboard.style.display = 'none';
      if (this.btnCopyImageAgain) this.btnCopyImageAgain.style.display = 'none';
    }

    this.openModal('modalExportImage');
  }

  // ==========================================
  // NEW EVENING / TOURNAMENT
  // ==========================================
  startNewEvening() {
    BurracoStorage.startNewEvening(this.state);
    this.render();
    this.closeModal('modalNewTournament');
  }

  // ==========================================
  // MODAL HELPERS
  // ==========================================
  openModal(modalKey) {
    if (modalKey === 'modalSettings') {
      this.syncSettingsUI();
    }
    if (modalKey === 'modalLottery') {
      const countEl = document.getElementById('lottery-total-count');
      if (countEl) {
        const activeCount = this.state.pairs.filter(p => p.name && p.name.trim() !== '').length;
        countEl.textContent = activeCount || this.state.pairs.length;
      }
    }
    if (modalKey === 'modalNewTournament') {
      const label = document.getElementById('modal-new-date-label');
      if (label) {
        const d = new Date();
        const dd = String(d.getDate()).padStart(2, '0');
        const mm = String(d.getMonth() + 1).padStart(2, '0');
        const yy = String(d.getFullYear()).slice(-2);
        label.textContent = `${dd}/${mm}/${yy}`;
      }
    }
    if (this[modalKey]) {
      this[modalKey].classList.add('active');
    }
  }

  closeModal(modalKey) {
    if (this[modalKey]) {
      this[modalKey].classList.remove('active');
    }
  }
}

// Instantiate on DOM ready
document.addEventListener('DOMContentLoaded', () => {
  window.app = new BurracoApp();
});
