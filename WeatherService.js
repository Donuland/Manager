// ========================================
// DONULAND MANAGEMENT SYSTEM - WEATHER SERVICE
// Služba pro načítání předpovědi počasí
// ========================================

const weatherService = {
    // Hlavní funkce pro získání počasí
    async getWeather(city, date) {
        const cacheKey = `${city}-${date}`;
        
        // Kontrola cache
        if (globalData.weatherCache.has(cacheKey)) {
            const cached = globalData.weatherCache.get(cacheKey);
            if (this.isCacheValid(cached)) {
                debug(`🌤️ Počasí načteno z cache pro ${city}`);
                return cached.data;
            }
        }

        try {
            debug(`🌤️ Načítám počasí pro ${city} na ${date}`);
            
            const apiKey = document.getElementById('weatherApiKey').value;
            if (!apiKey) {
                throw new Error('Weather API klíč není nastaven v nastavení');
            }

            // Získání souřadnic města
            const coordinates = await this.getCoordinates(city, apiKey);
            if (!coordinates) {
                throw new Error(`Město "${city}" nenalezeno`);
            }

            // Získání předpovědi počasí
            const weatherData = await this.getWeatherForecast(coordinates, date, apiKey);
            
            // Uložení do cache
            const cacheData = {
                data: weatherData,
                timestamp: Date.now()
            };
            globalData.weatherCache.set(cacheKey, cacheData);

            debug(`✅ Počasí úspěšně načteno pro ${city}:`, weatherData);
            return weatherData;

        } catch (error) {
            debugError('Chyba při načítání počasí:', error);
            
            // Fallback - základní odhad podle sezóny
            const fallbackWeather = this.getFallbackWeather(date);
            ui.showNotification(`⚠️ Počasí nelze načíst: ${error.message}. Používám odhad.`, 'warning');
            
            return fallbackWeather;
        }
    },

    // Získání souřadnic města
    async getCoordinates(city, apiKey) {
        try {
            // Pokusíme se použít CORS proxy
            const geoUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(
                `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${apiKey}&lang=cs`
            )}`;
            
            const response = await utils.retry(async () => {
                const res = await fetch(geoUrl);
                if (!res.ok) {
                    throw new Error(`Geocoding API error: ${res.status}`);
                }
                return res;
            });

            const result = await response.json();
            const geoData = JSON.parse(result.contents);

            if (geoData.length === 0) {
                // Pokusíme se alternativní způsob - bez diakritiky
                const cityAlt = utils.removeDiacritics(city);
                if (cityAlt !== city) {
                    return await this.getCoordinates(cityAlt, apiKey);
                }
                return null;
            }

            const coordinates = {
                lat: geoData[0].lat,
                lon: geoData[0].lon,
                name: geoData[0].local_names?.cs || geoData[0].name
            };

            debug(`📍 Souřadnice pro ${city}:`, coordinates);
            return coordinates;

        } catch (error) {
            debugWarn('Chyba při získávání souřadnic:', error);
            
            // Fallback - předdefinované souřadnice pro česká města
            const fallbackCoordinates = this.getFallbackCoordinates(city);
            if (fallbackCoordinates) {
                debug(`📍 Používám fallback souřadnice pro ${city}`);
                return fallbackCoordinates;
            }
            
            return null;
        }
    },

    // Získání předpovědi počasí
    async getWeatherForecast(coordinates, date, apiKey) {
        const targetDate = new Date(date);
        const today = new Date();
        const daysDiff = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));

        let weatherData;

        if (daysDiff <= 0) {
            // Aktuální počasí
            weatherData = await this.getCurrentWeather(coordinates, apiKey);
        } else if (daysDiff <= 5) {
            // 5denní předpověď
            weatherData = await this.get5DayForecast(coordinates, date, apiKey);
        } else {
            // Pro vzdálenější data používáme aktuální počasí jako odhad
            const current = await this.getCurrentWeather(coordinates, apiKey);
            weatherData = {
                ...current,
                description: current.description + ' (odhad pro vzdálenější datum)',
                isEstimate: true
            };
        }

        return weatherData;
    },

    // Aktuální počasí
    async getCurrentWeather(coordinates, apiKey) {
        const weatherUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(
            `https://api.openweathermap.org/data/2.5/weather?lat=${coordinates.lat}&lon=${coordinates.lon}&appid=${apiKey}&units=metric&lang=cs`
        )}`;

        const response = await utils.retry(async () => {
            const res = await fetch(weatherUrl);
            if (!res.ok) {
                throw new Error(`Weather API error: ${res.status}`);
            }
            return res;
        });

        const result = await response.json();
        const data = JSON.parse(result.contents);

        return {
            temp: Math.round(data.main.temp),
            description: data.weather[0].description,
            main: data.weather[0].main,
            humidity: data.main.humidity,
            windSpeed: data.wind?.speed || 0,
            pressure: data.main.pressure,
            visibility: data.visibility ? data.visibility / 1000 : null,
            cloudiness: data.clouds?.all || 0
        };
    },

    // 5denní předpověď
    async get5DayForecast(coordinates, targetDate, apiKey) {
        const forecastUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(
            `https://api.openweathermap.org/data/2.5/forecast?lat=${coordinates.lat}&lon=${coordinates.lon}&appid=${apiKey}&units=metric&lang=cs`
        )}`;

        const response = await utils.retry(async () => {
            const res = await fetch(forecastUrl);
            if (!res.ok) {
                throw new Error(`Forecast API error: ${res.status}`);
            }
            return res;
        });

        const result = await response.json();
        const data = JSON.parse(result.contents);

        // Najdeme nejbližší předpověď k cílovému datu
        const targetTime = new Date(targetDate).getTime();
        let closestForecast = data.list[0];
        let minDiff = Math.abs(new Date(closestForecast.dt * 1000) - targetTime);

        for (const forecast of data.list) {
            const forecastTime = new Date(forecast.dt * 1000);
            const diff = Math.abs(forecastTime - targetTime);
            if (diff < minDiff) {
                minDiff = diff;
                closestForecast = forecast;
            }
        }

        return {
            temp: Math.round(closestForecast.main.temp),
            description: closestForecast.weather[0].description,
            main: closestForecast.weather[0].main,
            humidity: closestForecast.main.humidity,
            windSpeed: closestForecast.wind?.speed || 0,
            pressure: closestForecast.main.pressure,
            cloudiness: closestForecast.clouds?.all || 0
        };
    },

    // Fallback souřadnice pro česká města
    getFallbackCoordinates(city) {
        const coordinates = {
            'praha': { lat: 50.0755, lon: 14.4378, name: 'Praha' },
            'brno': { lat: 49.1951, lon: 16.6068, name: 'Brno' },
            'ostrava': { lat: 49.8209, lon: 18.2625, name: 'Ostrava' },
            'plzeň': { lat: 49.7384, lon: 13.3736, name: 'Plzeň' },
            'liberec': { lat: 50.7663, lon: 15.0543, name: 'Liberec' },
            'olomouc': { lat: 49.5938, lon: 17.2509, name: 'Olomouc' },
            'hradec králové': { lat: 50.2103, lon: 15.8327, name: 'Hradec Králové' },
            'české budějovice': { lat: 48.9847, lon: 14.4747, name: 'České Budějovice' },
            'pardubice': { lat: 50.0343, lon: 15.7812, name: 'Pardubice' },
            'ústí nad labem': { lat: 50.6607, lon: 14.0323, name: 'Ústí nad Labem' }
        };

        const cityLower = utils.removeDiacritics(city.toLowerCase());
        
        for (const [knownCity, coords] of Object.entries(coordinates)) {
            if (cityLower.includes(knownCity) || knownCity.includes(cityLower)) {
                return coords;
            }
        }

        return null;
    },

    // Fallback počasí podle sezóny
    getFallbackWeather(date) {
        const month = new Date(date).getMonth() + 1; // 1-12
        
        let temp, description, main;
        
        if (month >= 12 || month <= 2) {
            // Zima
            temp = 2;
            description = 'částečně oblačno (odhad)';
            main = 'Clouds';
        } else if (month >= 3 && month <= 5) {
            // Jaro
            temp = 15;
            description = 'proměnlivě oblačno (odhad)';
            main = 'Clouds';
        } else if (month >= 6 && month <= 8) {
            // Léto
            temp = 24;
            description = 'slunečno (odhad)';
            main = 'Clear';
        } else {
            // Podzim
            temp = 12;
            description = 'oblačno s možností deště (odhad)';
            main = 'Clouds';
        }

        return {
            temp: temp,
            description: description,
            main: main,
            humidity: 65,
            windSpeed: 3,
            isFallback: true
        };
    },

    // Kontrola platnosti cache
    isCacheValid(cachedData) {
        return (Date.now() - cachedData.timestamp) < CONFIG.CACHE_TTL.weather;
    },

    // Zobrazení počasí v UI
    displayWeather(weather, elementId = 'weatherDisplay') {
        const weatherDisplay = document.getElementById(elementId);
        if (!weatherDisplay) return;

        const icon = this.getWeatherIcon(weather.main);
        const warnings = this.getWeatherWarnings(weather);
        
        const warningsHtml = warnings.length > 0 ? `
            <div style="margin-top: 15px; padding: 10px; background: #fff3cd; border-radius: 6px; border-left: 4px solid #ffc107;">
                <strong>⚠️ Varování:</strong> ${warnings.join(', ')}
            </div>
        ` : '';

        const estimateNotice = weather.isEstimate || weather.isFallback ? `
            <div style="margin-top: 10px; padding: 8px; background: #e3f2fd; border-radius: 6px; font-size: 0.9em; color: #1976d2;">
                ℹ️ ${weather.isFallback ? 'Odhad podle sezóny' : 'Odhad pro vzdálenější datum'}
            </div>
        ` : '';
        
        weatherDisplay.innerHTML = `
            <div class="weather-card">
                <div class="weather-icon">${icon}</div>
                <h4>${weather.description}</h4>
                <div class="weather-details">
                    <div class="weather-detail">
                        <div class="weather-detail-value">${weather.temp}°C</div>
                        <div class="weather-detail-label">Teplota</div>
                    </div>
                    <div class="weather-detail">
                        <div class="weather-detail-value">${weather.humidity}%</div>
                    </div>
                    <div class="weather-detail">
                        <div class="weather-detail-value">${Math.round(weather.windSpeed)} m/s</div>
                        <div class="weather-detail-label">Vítr</div>
                    </div>
                    ${weather.pressure ? `
                    <div class="weather-detail">
                        <div class="weather-detail-value">${weather.pressure} hPa</div>
                        <div class="weather-detail-label">Tlak</div>
                    </div>
                    ` : ''}
                </div>
                ${warningsHtml}
                ${estimateNotice}
            </div>
        `;
    },

    // Ikony počasí
    getWeatherIcon(main) {
        const icons = {
            'Clear': '☀️',
            'Clouds': '☁️',
            'Rain': '🌧️',
            'Snow': '❄️',
            'Thunderstorm': '⛈️',
            'Drizzle': '🌦️',
            'Mist': '🌫️',
            'Fog': '🌫️',
            'Haze': '🌫️'
        };
        return icons[main] || '🌤️';
    },

    // Varování podle počasí
    getWeatherWarnings(weather) {
        const warnings = [];
        
        if (weather.temp > 25) {
            warnings.push('Vysoké teploty - riziko roztékání čokoládových polev');
        }
        if (weather.temp < 5) {
            warnings.push('Nízké teploty - očekávejte nižší návštěvnost');
        }
        if (weather.main === 'Rain' || weather.main === 'Drizzle') {
            warnings.push('Déšť - významně sníží návštěvnost');
        }
        if (weather.main === 'Thunderstorm') {
            warnings.push('Bouřka - velmi nízká návštěvnost, zvažte přeložení');
        }
        if (weather.windSpeed > 10) {
            warnings.push('Silný vítr - zajistěte pevné kotvení stánku');
        }
        if (weather.temp > 30) {
            warnings.push('Extrémní horko - donuts se budou velmi rychle kazit');
        }
        
        return warnings;
    },

    // Výpočet faktoru počasí pro predikci
    calculateWeatherFactor(weather) {
        if (!weather) return 1.0;

        let factor = 1.0;
        
        // Faktor podle teploty
        const temp = weather.temp;
        if (temp >= 18 && temp <= 25) {
            factor *= CONFIG.WEATHER_FACTORS.temperature.ideal.factor; // Ideální teplota
        } else if (temp > 25) {
            factor *= CONFIG.WEATHER_FACTORS.temperature.hot.factor; // Horko
        } else if (temp < 10) {
            factor *= CONFIG.WEATHER_FACTORS.temperature.cold.factor; // Zima
        }
        
        // Faktor podle podmínek
        const conditionFactor = CONFIG.WEATHER_FACTORS.conditions[weather.main] || 1.0;
        factor *= conditionFactor;
        
        // Faktor podle větru
        if (weather.windSpeed > 10) {
            factor *= 0.9; // Silný vítr
        }
        
        // Faktor podle vlhkosti (vysoká vlhkost = nepříjemno)
        if (weather.humidity > 80) {
            factor *= 0.95;
        }
        
        debug(`🌤️ Weather faktor: ${factor.toFixed(2)} (${weather.description}, ${weather.temp}°C)`);
        return Math.max(factor, 0.2); // Minimální faktor 0.2
    },

    // Vyčištění cache počasí
    clearCache() {
        globalData.weatherCache.clear();
        debug('🌤️ Weather cache vyčištěna');
    }
};
