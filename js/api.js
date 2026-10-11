// API requests stay separate from the DOM code in script.js.
// An AbortController stops a slow request after the configured timeout.
async function fetchJSON(url, signal) {
  const controller = new AbortController();
  let timedOut = false;
  const cancelRequest = function () { controller.abort(); };

  if (signal.aborted) {
    controller.abort();
  } else {
    signal.addEventListener("abort", cancelRequest);
  }

  const timeout = setTimeout(function () {
    timedOut = true;
    controller.abort();
  }, WEATHER_CONFIG.timeoutMs);

  try {
    const response = await fetch(url, { signal: controller.signal });

    // fetch() does not throw for HTTP failures, so check the status ourselves.
    if (!response.ok) {
      if (response.status === 429) {
        throw new Error("Too many requests. Please wait a moment before trying again.");
      }
      if (response.status >= 500) {
        throw new Error("The weather service is temporarily unavailable. Please try again shortly.");
      }
      throw new Error("The weather service could not complete this request (HTTP " + response.status + "). Please try another city.");
    }

    const data = await response.json();
    if (!data || typeof data !== "object" || data.error) {
      throw new Error("The weather service returned an unexpected response. Please try again.");
    }
    return data;
  } catch (error) {
    // A newer search deliberately cancels the previous one; it is not a UI error.
    if (signal.aborted) { throw error; }
    if (timedOut) {
      throw new Error("The request took too long. Check your connection and try again.");
    }
    if (error instanceof TypeError) {
      throw new Error("Could not connect to the weather service. Check your internet connection and try again.");
    }
    if (error instanceof SyntaxError) {
      throw new Error("The weather service returned unreadable data. Please try again.");
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    signal.removeEventListener("abort", cancelRequest);
  }
}

async function findCities(cityName, signal) {
  const url = new URL(WEATHER_CONFIG.geocodingUrl);
  url.searchParams.set("name", cityName);
  url.searchParams.set("count", "5");
  url.searchParams.set("language", "en");
  url.searchParams.set("format", "json");

  const data = await fetchJSON(url.toString(), signal);
  if (data.results !== undefined && !Array.isArray(data.results)) {
    throw new Error("The location service returned unexpected data. Please try again.");
  }
  const locations = (data.results || []).filter(isValidLocation);
  if (locations.length === 0) {
    throw new Error('No city found for "' + cityName + '". Check the spelling or add a country, such as "Paris, France".');
  }
  return locations;
}

async function fetchWeather(location, signal) {
  const url = new URL(WEATHER_CONFIG.forecastUrl);
  url.searchParams.set("latitude", location.latitude);
  url.searchParams.set("longitude", location.longitude);
  url.searchParams.set("current", "temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,wind_speed_10m,is_day,surface_pressure");
  url.searchParams.set("daily", "weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset");
  url.searchParams.set("timezone", "auto");
  url.searchParams.set("forecast_days", WEATHER_CONFIG.forecastDays);
  url.searchParams.set("temperature_unit", "celsius");
  url.searchParams.set("wind_speed_unit", "kmh");

  const data = await fetchJSON(url.toString(), signal);
  if (!data.current || !Number.isFinite(data.current.temperature_2m) ||
      !Number.isFinite(data.current.weather_code) || !data.daily ||
      !Array.isArray(data.daily.time) || data.daily.time.length === 0) {
    throw new Error("The weather service returned incomplete data. Please try again.");
  }
  return data;
}
