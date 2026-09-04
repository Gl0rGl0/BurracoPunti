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
   * Calculate tournament prizepool and prize distribution for top pairs.
   * Total Pot = (valid pairs count) * 2 * (entry fee per player)
   * Individual prizes are rounded to the nearest integer euro, team prize is single * 2.
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
      const singlePrize = Math.round(rawTeamPrize / 2);
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
      if (diff !== 0 && diff % 2 === 0) {
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
  }
};

if (typeof window !== 'undefined') {
  window.BurracoEngine = BurracoEngine;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BurracoEngine;
}
