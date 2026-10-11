// Small reusable helpers: location validation, WMO weather codes, and formatting.
function isValidLocation(location) {
  return location && typeof location.name === "string" && location.name.trim() !== "" &&
    Number.isFinite(location.latitude) && Number.isFinite(location.longitude) &&
    location.latitude >= -90 && location.latitude <= 90 &&
    location.longitude >= -180 && location.longitude <= 180;
}

function locationDetails(location) {
  return [location.admin1, location.country].filter(Boolean).join(", ");
}

function locationLabel(location) {
  const details = locationDetails(location);
  return location.name + (details ? ", " + details : "");
}

function weatherCondition(code, isDay) {
  const sunnyIcon = isDay ? "icon-sun" : "icon-moon";
  const partlyIcon = isDay ? "icon-partly-cloudy-day" : "icon-partly-cloudy-night";
  const conditions = {
    0: ["Clear sky", sunnyIcon],
    1: ["Mainly clear", partlyIcon],
    2: ["Partly cloudy", partlyIcon],
    3: ["Overcast", "icon-cloud"],
    45: ["Fog", "icon-fog"],
    48: ["Freezing fog", "icon-fog"],
    51: ["Light drizzle", "icon-drizzle"],
    53: ["Drizzle", "icon-drizzle"],
    55: ["Dense drizzle", "icon-drizzle"],
    56: ["Light freezing drizzle", "icon-drizzle"],
    57: ["Freezing drizzle", "icon-drizzle"],
    61: ["Light rain", "icon-rain"],
    63: ["Rain", "icon-rain"],
    65: ["Heavy rain", "icon-rain"],
    66: ["Light freezing rain", "icon-rain"],
    67: ["Freezing rain", "icon-rain"],
    71: ["Light snow", "icon-snow"],
    73: ["Snow", "icon-snow"],
    75: ["Heavy snow", "icon-snow"],
    77: ["Snow grains", "icon-snow"],
    80: ["Light rain showers", "icon-rain"],
    81: ["Rain showers", "icon-rain"],
    82: ["Heavy rain showers", "icon-rain"],
    85: ["Light snow showers", "icon-snow"],
    86: ["Snow showers", "icon-snow"],
    95: ["Thunderstorm", "icon-storm"],
    96: ["Thunderstorm with hail", "icon-storm"],
    99: ["Thunderstorm with heavy hail", "icon-storm"]
  };
  const condition = conditions[code] || ["Conditions unavailable", "icon-cloud"];
  return { description: condition[0], icon: condition[1] };
}

function formatTemperature(value, unit) {
  if (!Number.isFinite(value)) { return "—"; }
  const converted = unit === "fahrenheit" ? (value * 9 / 5) + 32 : value;
  return Math.round(converted) + (unit === "fahrenheit" ? "°F" : "°C");
}

function formatNumber(value, suffix) {
  return Number.isFinite(value) ? Math.round(value) + suffix : "—";
}

function localClock(isoString) {
  // Open-Meteo returns city-local ISO time. Read HH:MM directly, avoiding
  // conversion to the viewer's timezone (which may be a different city).
  if (typeof isoString !== "string" || !isoString.includes("T")) { return "—"; }
  return isoString.split("T")[1].slice(0, 5);
}

function forecastDay(dateString, index) {
  if (index === 0) { return "Today"; }
  const date = new Date(dateString + "T12:00:00Z");
  if (Number.isNaN(date.getTime())) { return dateString; }
  return date.toLocaleDateString("en", { weekday: "short", month: "short", day: "numeric", timeZone: "UTC" });
}

function createIcon(symbolId, className) {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  const use = document.createElementNS("http://www.w3.org/2000/svg", "use");
  svg.setAttribute("viewBox", "0 0 64 64");
  svg.setAttribute("class", className || "weather-svg");
  svg.setAttribute("aria-hidden", "true");
  use.setAttribute("href", "#" + symbolId);
  svg.append(use);
  return svg;
}
