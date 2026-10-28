/**
 * BURRACO - TOURNAMENT COMPUTATION & RANKING ENGINE
 * Pure business logic for VP/MP calculations, multi-criteria tie breaks, and lot draws.
 */

const BurracoEngine = {
  /**
   * Calculate totVP, totMP, and playedRounds for each pair.
   */
  calculateTotals(pairs = [], roundsCount = 4) {
    return pairs.map(pair => {
      let totVP = 0;
      let totMP = 0;
      let playedRounds = 0;

      const scores = pair.scores || [];
      for (let i = 0; i < roundsCount; i++) {
        const sc = scores[i];
        if (sc) {
          if (sc.vp !== null && sc.vp !== undefined && !isNaN(sc.vp)) {
            totVP += Number(sc.vp);
            playedRounds++;
          }
          if (sc.mp !== null && sc.mp !== undefined && !isNaN(sc.mp)) {
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
  },

  /**
   * Return ranked pairs with tie-breaker hierarchy:
   * 1. Total Victory Points (VP) DESC
   * 2. Total Match Points (MP) DESC (primary tie-breaker)
   * 3. Assigned Lot Number ASC (secondary tie-breaker)
   */
  getRankedPairs(pairs = [], roundsCount = 4) {
    const pairsWithTotals = this.calculateTotals(pairs, roundsCount);
    const validPairs = pairsWithTotals.filter(p => p.name && p.name.trim() !== '');

    return validPairs.sort((a, b) => {
      if (b.totVP !== a.totVP) {
        return b.totVP - a.totVP;
      }
      if (b.totMP !== a.totMP) {
        return b.totMP - a.totMP;
      }
      return (a.lotNumber || 999) - (b.lotNumber || 999);
    });
  },

  /**
   * Generate an array of unique integers from 1 to count shuffled via Fisher-Yates algorithm.
   */
  generateRandomLots(count) {
    if (count <= 0) return [];
    const numbers = Array.from({ length: count }, (_, i) => i + 1);
    for (let i = numbers.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
    }
    return numbers;
  },

  /**
   * Assign random lot numbers (1..N) to pairs in place and return them.
   */
  assignRandomLots(pairs = []) {
    const numbers = this.generateRandomLots(pairs.length);
    pairs.forEach((pair, idx) => {
      pair.lotNumber = numbers[idx];
    });
    return pairs;
  },

  /**
   * Assign sequential lot numbers (1..N) to pairs in place and return them.
   */
  assignSequentialLots(pairs = []) {
    pairs.forEach((pair, idx) => {
      pair.lotNumber = idx + 1;
    });
    return pairs;
  },

  /**
   * Arrotonda un importo ai 0.5 Euro più vicini.
   * Es: 4.2 -> 4; 4.3 -> 4.5; 4.7 -> 4.5; 4.8 -> 5
   * @param {number} amount
   * @returns {number}
   */
  roundPrize(amount) {
    return Math.round((Number(amount) || 0) * 2) / 2;
  },

  /**
   * Calculate tournament prizepool and prize distribution for top pairs.
   * Total Pot = (valid pairs count) * 2 * (entry fee per player)
   * Individual prizes are rounded to the nearest 0.5 euro, team prize is single * 2.
   * Any rounding remainder (when percentages sum to ~100%) is reconciled on 1st place.
   *
   * @param {number} validPairsCount - Number of participating pairs
   * @param {number} entryFeePerPlayer - Fee in Euro per individual player
   * @param {Array<number>} percentages - Array of percentage allocations for ranks 1..5
   * @returns {Object} { totalPot, prizes: Array<{ rank, teamPrize, singlePrize, text }> }
   */
  calculatePrizepool(validPairsCount = 0, entryFeePerPlayer = 2, percentages = [50, 30, 20, 0, 0]) {
    const fee = Number(entryFeePerPlayer) || 0;
    const count = Math.max(0, parseInt(validPairsCount, 10) || 0);
    const totalPot = count * 2 * fee;

    if (totalPot <= 0 || count === 0) {
      return { totalPot: 0, prizes: [] };
    }

    const pcts = (Array.isArray(percentages) ? percentages : [50, 30, 20, 0, 0]).slice(0, 5);
    const maxPositions = Math.min(count, 5);

    const prizes = [];
    let allocatedTotal = 0;

    for (let pos = 0; pos < maxPositions; pos++) {
      const pct = Number(pcts[pos]) || 0;
      if (pct <= 0) {
        prizes.push({ rank: pos + 1, teamPrize: 0, singlePrize: 0, text: '—' });
        continue;
      }

      const rawTeamPrize = (totalPot * pct) / 100;
      const singlePrize = Math.round((rawTeamPrize / 2) * 2) / 2;
      const teamPrize = singlePrize * 2;

      allocatedTotal += teamPrize;
      prizes.push({
        rank: pos + 1,
        teamPrize,
        singlePrize,
        text: teamPrize > 0 ? `${teamPrize}€ (${singlePrize}€)` : '—'
      });
    }

    // Remainder adjustment on 1st place if percentages sum to ~100% and 1st prize is active
    const sumPct = pcts.reduce((sum, p) => sum + (Number(p) || 0), 0);
    if (sumPct >= 99 && sumPct <= 101 && prizes.length > 0 && prizes[0].teamPrize > 0) {
      const diff = totalPot - allocatedTotal;
      if (diff !== 0) {
        prizes[0].teamPrize += diff;
        prizes[0].singlePrize = prizes[0].teamPrize / 2;
        prizes[0].text = prizes[0].teamPrize > 0 ? `${prizes[0].teamPrize}€ (${prizes[0].singlePrize}€)` : '—';
      }
    }

    return { totalPot, prizes };
  },

  /**
   * Verifica la congruenza matematica dei punti VP di un turno.
   * I singoli punteggi devono essere compresi tra 0 e 20.
   * La somma di tutti i VP deve essere esattamente uguale ai punti attesi:
   * - Se coppie pari: (numPairs / 2) * 20
   * - Se coppie dispari: Math.floor(numPairs / 2) * 20 + byePoints
   */
  validateRoundVpSum(totalVPOrScores, numPairs, byePoints = 12) {
    let sum = 0;
    let hasOutOfRange = false;
    let n = Number(numPairs) || 0;

    if (Array.isArray(totalVPOrScores)) {
      if (n <= 0) n = totalVPOrScores.length;
      for (const sc of totalVPOrScores) {
        const val = Number(sc);
        if (isNaN(val) || val < 0 || val > 20) {
          hasOutOfRange = true;
        }
        sum += val;
      }
    } else {
      sum = Number(totalVPOrScores);
    }

    const b = (byePoints !== undefined && byePoints !== null && !isNaN(Number(byePoints))) ? Number(byePoints) : 12;
    const isOdd = (n % 2 === 1);
    const completeTables = Math.floor(n / 2);
    const expectedVP = (completeTables * 20) + (isOdd ? b : 0);

    if (isNaN(sum) || n <= 0) {
      return { valid: false, hasOutOfRange, totalVP: sum, expectedVP: 0, numPairs: n, byePoints: b, isOdd, completeTables };
    }

    const valid = !hasOutOfRange && (sum === expectedVP);

    return {
      valid,
      hasOutOfRange,
      totalVP: sum,
      expectedVP,
      numPairs: n,
      byePoints: b,
      isOdd,
      completeTables
    };
  },

  /**
   * Conversione ufficiale FIBUR a 4 smazzate da differenza MP a Victory Points (VP).
   * 0 - 100: 10 - 10
   * 105 - 300: 11 - 9
   * 305 - 500: 12 - 8
   * 505 - 700: 13 - 7
   * 705 - 900: 14 - 6
   * 905 - 1100: 15 - 5
   * 1105 - 1300: 16 - 4
   * 1305 - 1500: 17 - 3
   * 1505 - 1700: 18 - 2
   * 1705 - 2000: 19 - 1
   * Oltre 2000: 20 - 0
   *
   * @param {number|string} mpA - Match Points coppia A
   * @param {number|string} mpB - Match Points coppia B
   * @returns {Object|null} { vpA, vpB, diff } oppure null se input incompleto
   */
  calculateVpFromMp(mpA, mpB) {
    if (mpA === null || mpA === undefined || mpA === '' || isNaN(Number(mpA))) return null;
    if (mpB === null || mpB === undefined || mpB === '' || isNaN(Number(mpB))) return null;

    const numA = Number(mpA);
    const numB = Number(mpB);
    const diff = Math.abs(numA - numB);

    let winnerVp = 10;
    if (diff <= 100) {
      winnerVp = 10;
    } else if (diff <= 300) {
      winnerVp = 11;
    } else if (diff <= 500) {
      winnerVp = 12;
    } else if (diff <= 700) {
      winnerVp = 13;
    } else if (diff <= 900) {
      winnerVp = 14;
    } else if (diff <= 1100) {
      winnerVp = 15;
    } else if (diff <= 1300) {
      winnerVp = 16;
    } else if (diff <= 1500) {
      winnerVp = 17;
    } else if (diff <= 1700) {
      winnerVp = 18;
    } else if (diff <= 2000) {
      winnerVp = 19;
    } else {
      winnerVp = 20;
    }

    const loserVp = 20 - winnerVp;

    if (numA >= numB) {
      return { vpA: winnerVp, vpB: loserVp, diff };
    } else {
      return { vpA: loserVp, vpB: winnerVp, diff };
    }
  },

  /**
   * Genera gli abbinamenti ai tavoli per il turno dato secondo la rotazione ufficiale Mitchell.
   * - Coppie fisse (dispari: 1, 3, 5...): restano al tavolo corrispondente.
   * - Coppie mobili (pari: 2, 4, 6...): avanzano di 1 tavolo a ogni turno (T1 -> T2 -> ... -> T1).
   * - Se numero dispari di coppie: viene aggiunta una coppia fantasma mobile per la rotazione automatica del riposo.
   *
   * @param {Array} pairs - Elenco coppie
   * @param {number} roundIndex - Indice turno (0-based)
   * @returns {Object} { tables: Array<{ tableNumber, pairA, pairB }>, restingPair: Object|null, orderedPairs: Array }
   */
  getMitchellPairings(pairs = [], roundIndex = 0) {
    const validPairs = pairs.filter(p => p && p.name && p.name.trim() !== '');
    if (validPairs.length === 0) {
      return { tables: [], restingPair: null, orderedPairs: [] };
    }

    // Ordina in base al lotNumber se presente, altrimenti preserva l'ordine di inserimento
    const sorted = [...validPairs].sort((a, b) => {
      const lotA = (a.lotNumber !== null && a.lotNumber !== undefined) ? Number(a.lotNumber) : null;
      const lotB = (b.lotNumber !== null && b.lotNumber !== undefined) ? Number(b.lotNumber) : null;
      if (lotA !== null && lotB !== null) return lotA - lotB;
      if (lotA !== null) return -1;
      if (lotB !== null) return 1;
      return 0;
    });

    const isOdd = sorted.length % 2 === 1;
    const numTables = Math.floor(sorted.length / 2);
    const r = Math.max(0, parseInt(roundIndex, 10) || 0);

    const tables = [];
    let restingPair = null;
    const orderedPairs = [];

    if (!isOdd) {
      // Numero pari di coppie: T tavoli, T coppie fisse (dispari), T mobili (pari)
      const stationary = [];
      const moving = [];
      for (let i = 0; i < sorted.length; i++) {
        if (i % 2 === 0) stationary.push(sorted[i]);
        else moving.push(sorted[i]);
      }

      for (let t = 0; t < numTables; t++) {
        const pairStationary = stationary[t];
        const mIdx = ((t - r) % numTables + numTables) % numTables;
        const pairMoving = moving[mIdx];
        const tableNumber = t + 1;

        tables.push({ tableNumber, pairA: pairStationary, pairB: pairMoving });
        orderedPairs.push({
          ...pairStationary,
          _tableNumber: tableNumber,
          _opponentId: pairMoving.id,
          _isResting: false
        });
        orderedPairs.push({
          ...pairMoving,
          _tableNumber: tableNumber,
          _opponentId: pairStationary.id,
          _isResting: false
        });
      }
    } else {
      // Numero dispari di coppie: T tavoli fisici, T coppie fisse, T + 1 mobili
      // Le prime T coppie dispari rimangono fisse ai rispettivi tavoli (giocano tutti i turni)
      // Le restanti T + 1 coppie ruotano circolarmente: Riposo -> Tavolo 1 -> Tavolo 2 -> ... -> Riposo
      const stationary = [];
      const moving = [];

      for (let i = 0; i < numTables; i++) {
        stationary.push(sorted[i * 2]);
        moving.push(sorted[i * 2 + 1]);
      }
      moving.push(sorted[sorted.length - 1]);

      const numStations = numTables + 1; // T tavoli + 1 postazione riposo

      for (let t = 0; t < numTables; t++) {
        const pairStationary = stationary[t];
        const mIdx = ((t - r) % numStations + numStations) % numStations;
        const pairMoving = moving[mIdx];
        const tableNumber = t + 1;

        tables.push({ tableNumber, pairA: pairStationary, pairB: pairMoving });
        orderedPairs.push({
          ...pairStationary,
          _tableNumber: tableNumber,
          _opponentId: pairMoving.id,
          _isResting: false
        });
        orderedPairs.push({
          ...pairMoving,
          _tableNumber: tableNumber,
          _opponentId: pairStationary.id,
          _isResting: false
        });
      }

      // Coppia a riposo: stazione numTables (l'ultima della rotazione ciclica)
      const restMIdx = ((numTables - r) % numStations + numStations) % numStations;
      restingPair = moving[restMIdx];
      orderedPairs.push({
        ...restingPair,
        _tableNumber: null,
        _opponentId: null,
        _isResting: true
      });
    }

    return {
      tables,
      restingPair,
      orderedPairs
    };
  }
};

if (typeof window !== 'undefined') {
  window.BurracoEngine = BurracoEngine;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BurracoEngine;
}
