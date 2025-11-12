const { getAppSettings, setAppSetting, ensureAppSettingsTable } = require('./appSettings');

const ONLINE_SETTING_KEYS = {
  blockPastReservations: 'online_block_past_reservations',
  publicMinNoticeMinutes: 'online_public_min_notice_minutes',
  publicMaxDaysAhead: 'online_public_max_days_ahead',
};

const DEFAULT_ONLINE_SETTINGS = {
  blockPastReservations: true,
  publicMinNoticeMinutes: 0,
  publicMaxDaysAhead: 0,
};

function parseBoolean(value, fallback) {
  if (value == null) return fallback;
  const normalized = String(value).trim().toLowerCase();
  if (['1', 'true', 'yes', 'on'].includes(normalized)) return true;
  if (['0', 'false', 'no', 'off'].includes(normalized)) return false;
  return fallback;
}

function parseNonNegativeInteger(value, fallback) {
  if (value == null || value === '') return fallback;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return fallback;
  const rounded = Math.round(parsed);
  return rounded < 0 ? 0 : rounded;
}

function buildDateTimeFromDateAndTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const dateParts = String(dateStr).split('-');
  if (dateParts.length < 3) return null;
  const year = Number(dateParts[0]);
  const month = Number(dateParts[1]);
  const day = Number(dateParts[2]);
  if (!Number.isFinite(year) || !Number.isFinite(month) || !Number.isFinite(day)) return null;
  const timeParts = String(timeStr).split(':');
  if (timeParts.length < 2) return null;
  const hours = Number(timeParts[0]);
  const minutes = Number(timeParts[1]);
  if (!Number.isFinite(hours) || !Number.isFinite(minutes)) return null;
  return new Date(year, month - 1, day, hours, minutes, 0, 0);
}

async function getOnlineSettings() {
  await ensureAppSettingsTable();
  const keys = Object.values(ONLINE_SETTING_KEYS);
  const map = await getAppSettings(keys);
  return {
    blockPastReservations: parseBoolean(
      map.get(ONLINE_SETTING_KEYS.blockPastReservations),
      DEFAULT_ONLINE_SETTINGS.blockPastReservations,
    ),
    publicMinNoticeMinutes: parseNonNegativeInteger(
      map.get(ONLINE_SETTING_KEYS.publicMinNoticeMinutes),
      DEFAULT_ONLINE_SETTINGS.publicMinNoticeMinutes,
    ),
    publicMaxDaysAhead: parseNonNegativeInteger(
      map.get(ONLINE_SETTING_KEYS.publicMaxDaysAhead),
      DEFAULT_ONLINE_SETTINGS.publicMaxDaysAhead,
    ),
  };
}

async function saveOnlineSettings(settings) {
  const payload = {
    blockPastReservations: settings.blockPastReservations ? '1' : '0',
    publicMinNoticeMinutes: String(parseNonNegativeInteger(
      settings.publicMinNoticeMinutes,
      DEFAULT_ONLINE_SETTINGS.publicMinNoticeMinutes,
    )),
    publicMaxDaysAhead: String(parseNonNegativeInteger(
      settings.publicMaxDaysAhead,
      DEFAULT_ONLINE_SETTINGS.publicMaxDaysAhead,
    )),
  };

  await Promise.all([
    setAppSetting(ONLINE_SETTING_KEYS.blockPastReservations, payload.blockPastReservations),
    setAppSetting(ONLINE_SETTING_KEYS.publicMinNoticeMinutes, payload.publicMinNoticeMinutes),
    setAppSetting(ONLINE_SETTING_KEYS.publicMaxDaysAhead, payload.publicMaxDaysAhead),
  ]);

  return {
    blockPastReservations: payload.blockPastReservations === '1',
    publicMinNoticeMinutes: Number(payload.publicMinNoticeMinutes),
    publicMaxDaysAhead: Number(payload.publicMaxDaysAhead),
  };
}

module.exports = {
  ONLINE_SETTING_KEYS,
  DEFAULT_ONLINE_SETTINGS,
  getOnlineSettings,
  saveOnlineSettings,
  buildDateTimeFromDateAndTime,
};
