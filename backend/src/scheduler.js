import cron from 'node-cron';
import { randomUUID } from 'node:crypto';
import { db } from './database.js';

const MANDI_RESOURCE_ID = '9ef84268-d588-465a-a308-a864a43d0070';
const PAGE_SIZE = 1000;
const MAX_PAGES = 5;
const DISTRICT_REFRESH_INTERVAL_MS = 15 * 60 * 1000;
const districtRefreshes = new Map();

const districtStates = new Map([
  ['bhopal', 'Madhya Pradesh'],
  ['indore', 'Madhya Pradesh'],
  ['lucknow', 'Uttar Pradesh'],
  ['kanpur', 'Uttar Pradesh'],
  ['jaipur', 'Rajasthan'],
  ['pune', 'Maharashtra'],
  ['thane', 'Maharashtra'],
  ['delhi', 'Delhi'],
  ['patna', 'Bihar'],
  ['varanasi', 'Uttar Pradesh'],
]);

export function normalizeMandiDistrict(value) {
  return String(value || '').trim().replace(/\s+district$/i, '');
}

function normalizeName(value) {
  return normalizeMandiDistrict(value).toLowerCase();
}

function findField(record, names) {
  const normalizedNames = new Set(names.map((name) => name.toLowerCase().replace(/[^a-z]/g, '')));
  const match = Object.entries(record).find(([key]) => (
    normalizedNames.has(key.toLowerCase().replace(/[^a-z]/g, ''))
  ));
  return match?.[1];
}

function parseArrivalDate(value) {
  if (typeof value !== 'string') return null;
  const normalized = value.trim();
  const isoDate = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(normalized);
  const indianDate = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(normalized);
  const parts = isoDate
    ? { year: Number(isoDate[1]), month: Number(isoDate[2]), day: Number(isoDate[3]) }
    : indianDate
      ? { year: Number(indianDate[3]), month: Number(indianDate[2]), day: Number(indianDate[1]) }
      : null;
  if (!parts) return null;
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day));
  if (date.getUTCFullYear() !== parts.year
    || date.getUTCMonth() !== parts.month - 1
    || date.getUTCDate() !== parts.day) return null;
  return `${String(parts.year).padStart(4, '0')}-${String(parts.month).padStart(2, '0')}-${String(parts.day).padStart(2, '0')}`;
}

function parsePrice(value) {
  if ((typeof value !== 'string' && typeof value !== 'number') || String(value).trim() === '') {
    return Number.NaN;
  }
  return Number(String(value).replaceAll(',', '').trim());
}

function mapRecord(record, fetchedAt) {
  const commodity = findField(record, ['commodity', 'commodity_name']);
  const market = findField(record, ['market', 'market_name']);
  const district = findField(record, ['district']);
  const state = findField(record, ['state']);
  const minPrice = parsePrice(findField(record, ['min_price']));
  const maxPrice = parsePrice(findField(record, ['max_price']));
  const modalPrice = parsePrice(findField(record, ['modal_price']));

  const priceDate = parseArrivalDate(findField(record, ['arrival_date']));
  if (!commodity || !market || !district || !state || !priceDate
    || ![minPrice, maxPrice, modalPrice].every(Number.isFinite)
    || minPrice < 0 || maxPrice < 0 || modalPrice < 0) {
    return null;
  }

  return {
    id: randomUUID(),
    commodity_name: String(commodity).trim().slice(0, 100),
    market_name: String(market).trim().slice(0, 100),
    district: String(district).trim().slice(0, 100),
    state: String(state).trim().slice(0, 100),
    min_price: minPrice,
    max_price: maxPrice,
    modal_price: modalPrice,
    price_date: priceDate,
    fetched_at: fetchedAt,
    source: 'data.gov.in',
  };
}

async function fetchProviderRecords({ apiKey, district, state }) {
  const records = [];
  for (let page = 0; page < MAX_PAGES; page += 1) {
    const endpoint = new URL(`https://api.data.gov.in/resource/${MANDI_RESOURCE_ID}`);
    endpoint.searchParams.set('api-key', apiKey);
    endpoint.searchParams.set('format', 'json');
    endpoint.searchParams.set('offset', String(page * PAGE_SIZE));
    endpoint.searchParams.set('limit', String(PAGE_SIZE));
    if (state) endpoint.searchParams.set('filters[state]', state);
    if (district) endpoint.searchParams.set('filters[district]', district);

    const response = await fetch(endpoint, { signal: AbortSignal.timeout(15000) });
    if (!response.ok) {
      throw new Error(`Government mandi rates API returned HTTP ${response.status}.`);
    }
    const payload = await response.json();
    if (payload.error || payload.message?.toLowerCase().includes('error')) {
      throw new Error(`Government mandi rates API error: ${payload.message || payload.error}`);
    }
    const rows = Array.isArray(payload.records) ? payload.records : [];
    records.push(...rows);
    if (rows.length < PAGE_SIZE || records.length >= Number(payload.total || Infinity)) break;
  }
  return records;
}

async function storeGovernmentRates(records, { district, state }) {
  const now = new Date();
  const fetchedAt = now.toISOString();
  const rows = records
    .map((record) => mapRecord(record, fetchedAt))
    .filter(Boolean)
    .filter((row) => (
      (!district || normalizeName(row.district) === normalizeName(district))
      && (!state || normalizeName(row.state) === normalizeName(state))
    ));

  if (rows.length === 0) return 0;

  await db.transaction(async (trx) => {
    for (const row of rows) {
      const existing = await trx('mandi_prices')
        .where({
          commodity_name: row.commodity_name,
          market_name: row.market_name,
          district: row.district,
          state: row.state,
          price_date: row.price_date,
          source: 'data.gov.in',
        })
        .first('id');
      if (existing) {
        await trx('mandi_prices').where({ id: existing.id }).update({
          min_price: row.min_price,
          max_price: row.max_price,
          modal_price: row.modal_price,
          fetched_at: row.fetched_at,
        });
      } else {
        await trx('mandi_prices').insert(row);
      }
    }
  });
  return rows.length;
}

export async function refreshMandiRates({ district = '', state = '', force = false } = {}) {
  const apiKey = process.env.DATA_GOV_API_KEY;
  if (!apiKey) {
    throw new Error('DATA_GOV_API_KEY is not configured for government mandi rates.');
  }

  const normalizedDistrict = typeof district === 'string' ? district.trim() : '';
  const normalizedState = (typeof state === 'string' ? state.trim() : '')
    || districtStates.get(normalizeName(normalizedDistrict))
    || '';
  const refreshKey = `${normalizeName(normalizedDistrict)}|${normalizeName(normalizedState)}`;
  const lastRefresh = districtRefreshes.get(refreshKey);
  if (!force && lastRefresh && Date.now() - lastRefresh < DISTRICT_REFRESH_INTERVAL_MS) {
    return null;
  }

  const records = await fetchProviderRecords({
    apiKey,
    district: normalizedDistrict,
    state: normalizedState,
  });
  const count = await storeGovernmentRates(records, {
    district: normalizedDistrict,
    state: normalizedState,
  });
  districtRefreshes.set(refreshKey, Date.now());
  console.info(
    `Imported ${count} government mandi rates${normalizedDistrict ? ` for ${normalizedDistrict}` : ''}.`,
  );
  return count;
}

export function startRateScheduler() {
  scheduledTask = cron.schedule('0 6 * * *', () => {
    refreshMandiRates({ force: true }).catch((error) => {
      console.error('Scheduled mandi rate refresh failed:', error);
    });
  }, { timezone: process.env.TZ || 'Asia/Kolkata' });
}

export function stopRateScheduler() {
  scheduledTask?.stop();
  scheduledTask = undefined;
}
