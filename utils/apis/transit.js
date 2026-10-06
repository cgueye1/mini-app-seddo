import { config } from '../config.js';

const NOMINATIM_URL = 'https://nominatim.openstreetmap.org';
const DAKAR_LAT = 14.7167;
const DAKAR_LON = -17.4677;

function request(url, options = {}) {
  return new Promise((resolve, reject) => {
    wx.request({
      url,
      method: options.method || 'GET',
      data: options.data,
      header: {
        Accept: 'application/json',
        ...(options.header || {}),
      },
      success: resolve,
      fail: reject,
    });
  });
}

function toPlace(item) {
  const displayName = item.display_name || item.name || '';
  return {
    latitude: Number(item.lat ?? item.latitude ?? 0),
    longitude: Number(item.lon ?? item.longitude ?? 0),
    name: item.name || displayName.split(',')[0] || 'Lieu sélectionné',
    address: displayName,
    placeId: item.place_id ? String(item.place_id) : '',
  };
}

export async function searchPlaces(query) {
  const params = [
    'format=json',
    `q=${encodeURIComponent(query)}`,
    'addressdetails=1',
    'limit=5',
    'countrycodes=sn',
    `viewbox=${DAKAR_LON - 0.3},${DAKAR_LAT + 0.3},${DAKAR_LON + 0.3},${DAKAR_LAT - 0.3}`,
    'bounded=1',
  ].join('&');
  const response = await request(`${NOMINATIM_URL}/search?${params}`, {
    header: { 'User-Agent': 'SeddoTCMPP/1.0' },
  });
  if (response.statusCode !== 200) throw new Error('Recherche de lieu indisponible');
  return (response.data || []).map(toPlace);
}

export async function reverseGeocode(latitude, longitude) {
  const url = `${NOMINATIM_URL}/reverse?format=json&lat=${latitude}&lon=${longitude}&addressdetails=1`;
  const response = await request(url, { header: { 'User-Agent': 'SeddoTCMPP/1.0' } });
  if (response.statusCode !== 200) throw new Error('Position indisponible');
  return toPlace({ ...response.data, lat: latitude, lon: longitude });
}

function requestFindBus(payload) {
  return request(`${config.TRANSIT_BASE_URL}/transit/find-bus`, {
    method: 'POST',
    data: payload,
    header: {
      Accept: '*/*',
      'Content-Type': 'application/json',
    },
  });
}

export async function findBusRoutes(origin, destination, date, time) {
  const response = await requestFindBus({
    date,
    time,
    departureLat: origin.latitude,
    departureLon: origin.longitude,
    destinationLat: destination.latitude,
    destinationLon: destination.longitude,
    maxDistanceFrom: 2000,
    maxDistanceTo: 2000,
    orderByFrom: true,
  });

  if (response.statusCode < 200 || response.statusCode >= 300) {
    throw new Error(`Recherche bus indisponible (${response.statusCode})`);
  }

  const payload = response.data;
  return Array.isArray(payload) ? payload : (payload?.data || payload?.content || []);
}
