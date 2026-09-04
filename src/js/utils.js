/**
 * BURRACO - UTILITIES & DATE HELPERS
 * Shared constants, date string formatting, HTML escape utilities
 */

const config = typeof window !== 'undefined' && window.BURRACO_CONFIG 
  ? window.BURRACO_CONFIG 
  : (function() { try { return require('./config'); } catch(e) { return {}; } })();

const DEFAULT_ROUNDS = (config && config.defaultRounds) || 4;
const STORAGE_KEY = 'burraco_master_tournament_v1';

function getDateGGMMAA(date = new Date()) {
  const gg = String(date.getDate()).padStart(2, '0');
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const aa = String(date.getFullYear()).slice(-2);
  return `${gg}${mm}${aa}`;
}

function formatGiornataLabel(key) {
  if (!key) return '';
  const m = key.match(/^serata_(\d{2})(\d{2})(\d{2})/);
  if (m) {
    return `${m[1]}/${m[2]}/${m[3]}`;
  }
  return key.replace(/^serata_/, 'Giornata ');
}

function parseSortKey(k) {
  const m = k.match(/^serata_(\d{2})(\d{2})(\d{2})/);
  if (m) return `20${m[3]}${m[2]}${m[1]}`;
  const num = parseInt(k.replace(/\D/g, ''), 10);
  return isNaN(num) ? k : String(num).padStart(8, '0');
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const BurracoUtils = {
  DEFAULT_ROUNDS,
  STORAGE_KEY,
  getDateGGMMAA,
  formatGiornataLabel,
  parseSortKey,
  escapeHtml
};

if (typeof window !== 'undefined') {
  window.BurracoUtils = BurracoUtils;
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BurracoUtils;
}
