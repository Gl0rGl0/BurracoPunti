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
  }
};

if (typeof window !== 'undefined') {
  window.BurracoEngine = BurracoEngine;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BurracoEngine;
}
