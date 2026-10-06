import { findBusRoutes, reverseGeocode, searchPlaces } from '../../utils/apis/transit.js';

const FAVORITE_KEYS = {
  home: 'transit_favorite_home',
  work: 'transit_favorite_work',
  school: 'transit_favorite_school',
};

function pad(value) {
  return String(value).padStart(2, '0');
}

function today() {
  const date = new Date();
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

function apiDate(value) {
  return value.replace(/-/g, '');
}

function nowTime() {
  const date = new Date();
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`;
}

function formatDistance(value) {
  const distance = Number(value || 0);
  return distance < 1000 ? `${Math.round(distance)} m` : `${(distance / 1000).toFixed(1)} km`;
}

function getBusImage(type) {
  const normalizedType = String(type || '').toUpperCase();
  if (normalizedType === 'BRT') return '/assets/transit/brt.png';
  if (normalizedType === 'DDD') return '/assets/transit/dddk.png';
  return '/assets/transit/aftu.png';
}

function formatRoute(route, index) {
  const legs = (route.legs || []).map((leg) => ({
    line: leg.trip?.routeId || leg.route?.route_short_name || leg.route?.routeShortName || leg.stopStart?.line || leg.transitType || 'BUS',
    type: leg.stopStart?.transitType || 'BUS',
    busImage: getBusImage(leg.stopStart?.transitType),
    from: leg.stopStart?.stopName || 'Arrêt de départ',
    to: leg.stopEnd?.stopName || 'Arrêt d’arrivée',
    departure: leg.departureStopTime?.departureTime || '',
    arrival: leg.destinationStopTime?.arrivalTime || '',
    walkTo: formatDistance(leg.walkingDistanceToBoardingStopMeters ?? leg.walkingDistanceToBoardingStop),
    walkFrom: formatDistance(leg.walkingDistanceFromAlightingStopMeters ?? leg.walkingDistanceFromAlightingStop),
    walkToMinutes: Math.round(Number(leg.walkingDistanceToBoardingStopMeters || 0) / 75),
    walkFromMinutes: Math.round(Number(leg.walkingDistanceFromAlightingStopMeters || 0) / 75),
    trafficDuration: formatDuration(leg.trafficDurationSeconds),
    intermediateStops: (leg.intermediateStops || []).slice(1, -1).map((stop) => ({
      name: stop.stop?.stopName || '',
      time: stop.stopTime?.arrivalTime || '',
    })),
    startLat: Number(leg.stopStart?.stopLat || 0),
    startLon: Number(leg.stopStart?.stopLon || 0),
  }));
  const seconds = Number(route.totalTrafficDurationSeconds || 0);
  const minutes = Math.round(seconds / 60);
  return {
    legs,
    label: route.label || (route.direct || route.isDirect ? 'Direct' : 'Correspondance'),
    direct: Boolean(route.direct || route.isDirect),
    duration: minutes < 60 ? `${minutes} min` : `${Math.floor(minutes / 60)}h${pad(minutes % 60)}`,
    durationMinutes: minutes,
    originName: route.origin?.name || '',
    destinationName: route.destination?.name || '',
    summary: legs.map((leg) => leg.line).join(' → ') || `Itinéraire ${index + 1}`,
  };
}

function formatDuration(seconds) {
  const minutes = Math.round(Number(seconds || 0) / 60);
  return minutes ? `${minutes} min` : '';
}

Page({
  data: {
    origin: null,
    destination: null,
    originText: '',
    destinationText: '',
    originSuggestions: [],
    destinationSuggestions: [],
    favorites: { home: null, work: null, school: null },
    favoriteItems: [
      { key: 'home', label: 'Domicile', icon: '/assets/transit/icons/home.svg' },
      { key: 'work', label: 'Bureau', icon: '/assets/transit/icons/office.svg' },
      { key: 'school', label: 'École', icon: '/assets/transit/icons/school.svg' },
    ],
    date: today(),
    time: nowTime(),
    routes: [],
    selectedRouteIndex: 0,
    loading: false,
    locating: false,
    error: '',
  },

  onLoad() {
    const favorites = { ...this.data.favorites };
    Object.keys(FAVORITE_KEYS).forEach((key) => {
      favorites[key] = wx.getStorageSync(FAVORITE_KEYS[key]) || null;
    });
    const favoriteItems = this.data.favoriteItems.map((item) => ({
      ...item,
      actionIcon: favorites[item.key]
        ? '/assets/transit/icons/edit.svg'
        : '/assets/transit/icons/add.svg',
    }));
    this.setData({ favorites, favoriteItems });
  },

  onUnload() {
    if (this._suggestionTimer) clearTimeout(this._suggestionTimer);
  },

  handleBack() {
    wx.navigateBack({ delta: 1 });
  },

  handleInput(event) {
    const field = event.currentTarget.dataset.field;
    const value = event.detail.value;
    const textKey = field === 'origin' ? 'originText' : 'destinationText';
    const suggestionsKey = field === 'origin' ? 'originSuggestions' : 'destinationSuggestions';
    this.setData({ [textKey]: value, [suggestionsKey]: [] });
    if (value.trim().length < 3) return;

    clearTimeout(this._suggestionTimer);
    this._suggestionTimer = setTimeout(async () => {
      try {
        const suggestions = await searchPlaces(value.trim());
        this.setData({ [suggestionsKey]: suggestions });
      } catch (error) {
        this.setData({ error: error.message || 'Recherche impossible' });
      }
    }, 500);
  },

  handleSelectPlace(event) {
    const field = event.currentTarget.dataset.field;
    const index = Number(event.currentTarget.dataset.index);
    const suggestions = field === 'origin' ? this.data.originSuggestions : this.data.destinationSuggestions;
    const place = suggestions[index];
    if (!place) return;
    const isOrigin = field === 'origin';
    this.setData({
      [isOrigin ? 'origin' : 'destination']: place,
      [isOrigin ? 'originText' : 'destinationText']: place.name,
      [isOrigin ? 'originSuggestions' : 'destinationSuggestions']: [],
      error: '',
    });
  },

  async handleUseLocation() {
    this.setData({ locating: true, error: '' });
    try {
      const position = await new Promise((resolve, reject) => {
        wx.getLocation({ type: 'gcj02', success: resolve, fail: reject });
      });
      const place = await reverseGeocode(position.latitude, position.longitude);
      this.setData({ origin: place, originText: place.name, locating: false });
    } catch (error) {
      this.setData({ locating: false, error: 'Impossible d’utiliser votre position.' });
    }
  },

  handleSwap() {
    this.setData({
      origin: this.data.destination,
      destination: this.data.origin,
      originText: this.data.destinationText,
      destinationText: this.data.originText,
      error: '',
    });
  },

  handleNavigateToStop(event) {
    const latitude = Number(event.currentTarget.dataset.lat);
    const longitude = Number(event.currentTarget.dataset.lon);
    if (!latitude || !longitude) return;
    wx.openLocation({
      latitude,
      longitude,
      name: event.currentTarget.dataset.name || 'Arrêt de bus',
      scale: 16,
    });
  },

  handleSelectRoute(event) {
    this.setData({ selectedRouteIndex: Number(event.currentTarget.dataset.index) });
  },

  handleDateChange(event) {
    this.setData({ date: event.detail.value });
  },

  handleTimeChange(event) {
    this.setData({ time: `${event.detail.value}:00` });
  },

  handleFavoriteSelect(event) {
    const key = event.currentTarget.dataset.key;
    const place = this.data.favorites[key];
    if (!place) {
      wx.showToast({ title: 'Aucune adresse enregistrée', icon: 'none' });
      return;
    }
    this.setData({ destination: place, destinationText: place.name, error: '' });
  },

  handleSaveFavorite(event) {
    const key = event.currentTarget.dataset.key;
    const place = this.data.origin;
    if (!place) {
      wx.showToast({ title: 'Choisissez d’abord une origine', icon: 'none' });
      return;
    }
    wx.setStorageSync(FAVORITE_KEYS[key], place);
    const favoriteItems = this.data.favoriteItems.map((item) => (
      item.key === key
        ? { ...item, actionIcon: '/assets/transit/icons/edit.svg' }
        : item
    ));
    this.setData({ [`favorites.${key}`]: place, favoriteItems });
    wx.showToast({ title: 'Adresse enregistrée', icon: 'success' });
  },

  async handleSearch() {
    if (!this.data.origin || !this.data.destination) {
      this.setData({ error: 'Sélectionnez une origine et une destination.' });
      return;
    }
    this.setData({ loading: true, routes: [], error: '' });
    try {
      const routes = await findBusRoutes(
        this.data.origin,
        this.data.destination,
        apiDate(this.data.date),
        this.data.time,
      );
      this.setData({ routes: routes.map(formatRoute), selectedRouteIndex: 0, loading: false, error: routes.length ? '' : 'Aucun trajet disponible pour ce trajet.' });
    } catch (error) {
      this.setData({ loading: false, error: error.message || 'La recherche des trajets a échoué.' });
    }
  },
});
