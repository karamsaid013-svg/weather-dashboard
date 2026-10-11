// DOM + events + application state. All weather values come from the API.
const elements = {
  form: document.querySelector("#weather-form"),
  input: document.querySelector("#city-input"),
  search: document.querySelector("#search-button"),
  loading: document.querySelector("#loading"),
  error: document.querySelector("#error"),
  errorMessage: document.querySelector("#error-message"),
  retry: document.querySelector("#retry-button"),
  picker: document.querySelector("#location-picker"),
  options: document.querySelector("#location-options"),
  recent: document.querySelector("#recent-buttons"),
  clearHistory: document.querySelector("#clear-history"),
  celsius: document.querySelector("#celsius-button"),
  fahrenheit: document.querySelector("#fahrenheit-button"),
  refresh: document.querySelector("#refresh-button"),
  dashboard: document.querySelector("#dashboard"),
  empty: document.querySelector("#empty-state"),
  content: document.querySelector("#weather-content"),
  city: document.querySelector("#city-name"),
  country: document.querySelector("#country-name"),
  updated: document.querySelector("#updated-time"),
  icon: document.querySelector("#weather-icon"),
  temperature: document.querySelector("#temperature"),
  description: document.querySelector("#description"),
  feelsLike: document.querySelector("#feels-like"),
  humidity: document.querySelector("#humidity"),
  wind: document.querySelector("#wind-speed"),
  pressure: document.querySelector("#pressure"),
  range: document.querySelector("#today-range"),
  sunrise: document.querySelector("#sunrise"),
  sunset: document.querySelector("#sunset"),
  timezone: document.querySelector("#timezone-label"),
  forecast: document.querySelector("#forecast-grid")
};

// Storage is optional: the app still works when a browser blocks localStorage.
function readStorage(key, fallback) {
  try {
    const value = localStorage.getItem(key);
    return value === null ? fallback : JSON.parse(value);
  } catch (error) {
    return fallback;
  }
}

function saveStorage(key, value) {
  try { localStorage.setItem(key, JSON.stringify(value)); }
  catch (error) { /* Weather still works without saved preferences. */ }
}

const savedHistory = readStorage(WEATHER_CONFIG.historyKey, []);
const state = {
  unit: readStorage(WEATHER_CONFIG.unitKey, "celsius") === "fahrenheit" ? "fahrenheit" : "celsius",
  recent: Array.isArray(savedHistory) ? savedHistory.filter(isValidLocation).slice(0, WEATHER_CONFIG.maxRecentCities) : [],
  location: null,
  weather: null,
  requestId: 0,
  controller: null,
  retryAction: null
};

function hideError() {
  elements.error.hidden = true;
  elements.retry.hidden = true;
  elements.input.removeAttribute("aria-invalid");
}

function showError(message, allowRetry) {
  elements.errorMessage.textContent = message;
  elements.error.hidden = false;
  elements.retry.hidden = !allowRetry;
}

function setLoading(isLoading, message) {
  elements.loading.textContent = isLoading ? message : "";
  elements.loading.hidden = !isLoading;
  elements.search.textContent = isLoading ? "Searching…" : "Search";
  elements.dashboard.setAttribute("aria-busy", String(isLoading));
  elements.refresh.disabled = isLoading;
}

function beginRequest(message) {
  if (state.controller) { state.controller.abort(); }
  state.controller = new AbortController();
  state.requestId += 1;
  hideError();
  elements.picker.hidden = true;
  // Hide the old result while searching so it cannot be mistaken for the new city.
  elements.content.hidden = true;
  elements.empty.hidden = true;
  elements.refresh.hidden = true;
  setLoading(true, message);
  return { id: state.requestId, signal: state.controller.signal };
}

function finishRequest(request) {
  if (request.id === state.requestId) {
    setLoading(false, "");
    state.controller = null;
  }
}

function updateUnitButtons() {
  elements.celsius.setAttribute("aria-pressed", String(state.unit === "celsius"));
  elements.fahrenheit.setAttribute("aria-pressed", String(state.unit === "fahrenheit"));
}

function changeUnit(unit) {
  state.unit = unit;
  updateUnitButtons();
  saveStorage(WEATHER_CONFIG.unitKey, unit);
  // Convert the saved Celsius values locally instead of making more requests.
  if (state.weather) { renderWeather(); }
}

function renderRecentCities() {
  elements.recent.replaceChildren();
  elements.clearHistory.hidden = state.recent.length === 0;
  if (state.recent.length === 0) {
    const hint = document.createElement("p");
    hint.className = "recent-hint";
    hint.textContent = "Your recent cities will appear here.";
    elements.recent.append(hint);
    return;
  }
  state.recent.forEach(function (location) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "recent-button";
    button.textContent = location.name + (location.country_code ? ", " + location.country_code : "");
    button.title = locationLabel(location);
    button.addEventListener("click", function () { loadLocation(location); });
    elements.recent.append(button);
  });
}

function rememberCity(location) {
  const otherCities = state.recent.filter(function (city) {
    return city.latitude !== location.latitude || city.longitude !== location.longitude;
  });
  state.recent = [location, ...otherCities].slice(0, WEATHER_CONFIG.maxRecentCities);
  saveStorage(WEATHER_CONFIG.historyKey, state.recent);
  renderRecentCities();
}

function showLocations(locations) {
  elements.options.replaceChildren();
  locations.forEach(function (location) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "location-option";
    button.textContent = locationLabel(location);
    button.addEventListener("click", function () { loadLocation(location); });
    elements.options.append(button);
  });
  elements.picker.hidden = false;
  // Keyboard users can immediately pick a result without finding the list again.
  elements.options.querySelector("button").focus();
}

function dailyValue(field, index) {
  const values = state.weather.daily[field];
  return Array.isArray(values) ? values[index] : null;
}

function renderForecast() {
  elements.forecast.replaceChildren();
  state.weather.daily.time.slice(0, WEATHER_CONFIG.forecastDays).forEach(function (date, index) {
    const condition = weatherCondition(dailyValue("weather_code", index), true);
    const card = document.createElement("article");
    card.className = "forecast-card";

    const day = document.createElement("h3");
    day.className = "forecast-day";
    day.textContent = forecastDay(date, index);
    const icon = createIcon(condition.icon, "forecast-icon weather-svg");
    const description = document.createElement("p");
    description.className = "forecast-description";
    description.textContent = condition.description;

    const temperatures = document.createElement("p");
    temperatures.className = "forecast-temperatures";
    const high = document.createElement("span");
    high.className = "forecast-high";
    high.textContent = formatTemperature(dailyValue("temperature_2m_max", index), state.unit);
    high.setAttribute("aria-label", "High " + high.textContent);
    const low = document.createElement("span");
    low.className = "forecast-low";
    low.textContent = formatTemperature(dailyValue("temperature_2m_min", index), state.unit);
    low.setAttribute("aria-label", "Low " + low.textContent);
    temperatures.append(high, low);

    const rain = document.createElement("p");
    rain.className = "forecast-rain";
    rain.textContent = formatNumber(dailyValue("precipitation_probability_max", index), "%") + " chance of rain";
    card.append(day, icon, description, temperatures, rain);
    elements.forecast.append(card);
  });
}

function renderWeather() {
  const current = state.weather.current;
  const condition = weatherCondition(current.weather_code, current.is_day !== 0);
  elements.city.textContent = state.location.name;
  elements.country.textContent = locationDetails(state.location) || "Selected location";
  elements.updated.textContent = "Weather as of " + localClock(current.time) + " local time";
  elements.icon.replaceChildren(createIcon(condition.icon));
  elements.temperature.textContent = formatTemperature(current.temperature_2m, state.unit);
  elements.description.textContent = condition.description;
  elements.feelsLike.textContent = formatTemperature(current.apparent_temperature, state.unit);
  elements.humidity.textContent = formatNumber(current.relative_humidity_2m, "%");
  elements.wind.textContent = formatNumber(current.wind_speed_10m, " km/h");
  elements.pressure.textContent = formatNumber(current.surface_pressure, " hPa");
  elements.range.textContent = "H: " + formatTemperature(dailyValue("temperature_2m_max", 0), state.unit) +
    "  ·  L: " + formatTemperature(dailyValue("temperature_2m_min", 0), state.unit);
  elements.sunrise.textContent = localClock(dailyValue("sunrise", 0));
  elements.sunset.textContent = localClock(dailyValue("sunset", 0));
  elements.timezone.textContent = state.weather.timezone || "City local time";
  renderForecast();
}

async function displayLocation(location, request) {
  elements.loading.textContent = "Loading weather for " + location.name + "…";
  const weather = await fetchWeather(location, request.signal);
  // If two searches overlap, only the latest may update the page.
  if (request.id !== state.requestId) { return; }
  state.location = location;
  state.weather = weather;
  elements.input.value = location.name;
  renderWeather();
  elements.empty.hidden = true;
  elements.content.hidden = false;
  elements.refresh.hidden = false;
  rememberCity(location);
}

async function loadLocation(location) {
  const request = beginRequest("Loading weather for " + location.name + "…");
  state.retryAction = function () { loadLocation(location); };
  try {
    await displayLocation(location, request);
  } catch (error) {
    if (request.id === state.requestId) { showError(error.message, true); }
  } finally {
    finishRequest(request);
  }
}

async function searchCity(cityName, chooseFirst) {
  const city = cityName.trim();
  if (city.length < 2) {
    // Cancel an older search before displaying a validation error.
    if (state.controller) { state.controller.abort(); }
    state.requestId += 1;
    setLoading(false, "");
    elements.picker.hidden = true;
    showError("Please enter a city name with at least two letters.", false);
    elements.input.setAttribute("aria-invalid", "true");
    elements.input.focus();
    return;
  }

  const request = beginRequest('Finding "' + city + '"…');
  state.retryAction = function () { searchCity(city, chooseFirst); };
  try {
    const locations = await findCities(city, request.signal);
    if (request.id !== state.requestId) { return; }
    if (locations.length > 1 && !chooseFirst) {
      showLocations(locations);
    } else {
      await displayLocation(locations[0], request);
    }
  } catch (error) {
    if (request.id === state.requestId) { showError(error.message, true); }
  } finally {
    finishRequest(request);
  }
}

elements.form.addEventListener("submit", function (event) {
  event.preventDefault();
  searchCity(elements.input.value, false);
});
elements.retry.addEventListener("click", function () {
  if (state.retryAction) { state.retryAction(); }
});
elements.refresh.addEventListener("click", function () {
  if (state.location) { loadLocation(state.location); }
});
elements.celsius.addEventListener("click", function () { changeUnit("celsius"); });
elements.fahrenheit.addEventListener("click", function () { changeUnit("fahrenheit"); });
elements.clearHistory.addEventListener("click", function () {
  state.recent = [];
  saveStorage(WEATHER_CONFIG.historyKey, []);
  renderRecentCities();
});
document.querySelectorAll(".suggestion-button").forEach(function (button) {
  button.addEventListener("click", function () {
    elements.input.value = button.dataset.city;
    searchCity(button.dataset.city, false);
  });
});

updateUnitButtons();
renderRecentCities();
// Start with a real request so the dashboard is useful as soon as it opens.
// There is no hardcoded temperature or fallback pretending to be live weather.
if (WEATHER_CONFIG.defaultCity) { searchCity(WEATHER_CONFIG.defaultCity, true); }
