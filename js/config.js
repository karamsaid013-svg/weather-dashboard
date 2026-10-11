// These are public settings, not secrets. Open-Meteo needs no API key.
const WEATHER_CONFIG = {
  geocodingUrl: "https://geocoding-api.open-meteo.com/v1/search",
  forecastUrl: "https://api.open-meteo.com/v1/forecast",
  defaultCity: "Beirut",
  timeoutMs: 15000,
  forecastDays: 5,
  maxRecentCities: 5,
  historyKey: "assignment4-weather-history",
  unitKey: "assignment4-weather-unit"
};
