// ========================================
// DONULAND MANAGEMENT SYSTEM - OPRAVENÝ WEATHER SERVICE
// Služba pro načítání předpovědi počasí s lepším error handlingem
// ========================================

const weatherService = {
    // Hlavní funkce pro získání počasí
    async getWeather(city, date) {
        const cacheKey = `${city}-${date}`;
        
        // Kontrola cache
        if (globalData && globalData.weatherCache && globalData.weatherCache.has(cacheKey)) {
            const cached = globalData.weatherCache.get(cacheKey);
            if (this.isCacheValid(cached)) {
                debug(`🌤️ Počasí načteno z cache pro ${city}`);
                return cached.data;
            }
        }

        try {
            debug(`🌤️ Načítám počasí pro ${city} na ${date}`);
            
            const apiKey = document.getElementById('weatherApiKey')?.value || CONFIG.WEATHER_API_KEY;
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
            if (globalData && globalData.weatherCache) {
                const cacheData = {
                    data: weatherData,
                    timestamp: Date.now()
                };
                globalData.weatherCache.set(cacheKey, cacheData);
            }

            debug(`✅ Počasí úspěšně načteno pro ${city}:`, weatherData);
            return weatherData;

        } catch (error) {
            debugError('Chyba při načítání počasí:', error);
            
            // Fallback - základní odhad podle sezóny
            const fallbackWeather = this.getFallbackWeather(date);
            if (typeof ui !== 'undefined') {
                ui.showNotification(`⚠️ Počasí nelze načíst: ${error.message}. Používám odhad.`, 'warning');
            }
            
            return fallbackWeather;
        }
    },

    // Získání souřadnic města s vylepšením
    async getCoordinates(city, apiKey) {
        try {
            // Nejdříve zkusíme fallback koordináty pro známá česká města
            const fallbackCoords = this.getFallbackCoordinates(city);
            if (fallbackCoords) {
                debug(`📍 Používám fallback souřadnice pro ${city}`);
                return fallbackCoords;
            }

            // Pokus o API volání
            const geoUrl = `https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)},CZ&limit=1&appid=${apiKey}`;
            
            // Zkusíme několik proxy služeb
            const proxies = [
                `https://api.allorigins.win/get?url=${encodeURIComponent(geoUrl)}`,
                `https://cors-anywhere.herokuapp.com/${geoUrl}`,
                geoUrl
            ];

            for (let i = 0; i < proxies.length; i++) {
                try {
                    debug(`🔄 Zkouším geocoding proxy ${i + 1}/${proxies.length}`);
                    
                    const response = await fetch(proxies[i]);
                    if (!response.ok) continue;

                    let geoData;
                    if (i === 0) { // allorigins proxy
                        const result = await response.json();
                        geoData = JSON.parse(result.contents);
                    } else {
                        geoData = await response.json();
                    }

                    if (geoData.length === 0) continue;

                    const coordinates = {
                        lat: geoData[0].lat,
                        lon: geoData[0].lon,
                        name: geoData[0].local_names?.cs || geoData[0].name
                    };

                    debug(`📍 Souřadnice z API pro ${city}:`, coordinates);
                    return coordinates;

                } catch (error) {
                    debug(`Proxy ${i + 1} pro geocoding selhala:`, error.message);
                }
            }

            // Pokud API selže, použijeme fallback
            return this.getFallbackCoordinates(city);

        } catch (error) {
            debugWarn('Chyba při získávání souřadnic:', error);
            return this.getFallbackCoordinates(city);
        }
    },

    // Získání předpovědi počasí s vylepšením
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
            try {
                const current = await this.getCurrentWeather(coordinates, apiKey);
                weatherData = {
                    ...current,
                    description: current.description + ' (odhad pro vzdálenější datum)',
                    isEstimate: true
                };
            } catch (error) {
                // Pokud ani aktuální počasí nejde načíst, použijeme fallback
                weatherData = this.getFallbackWeather(date);
            }
        }

        return weatherData;
    },

    // Aktuální počasí s vylepšeným error handlingem
    async getCurrentWeather(coordinates, apiKey) {
        const weatherUrl = `https://api.openweathermap.org/data/2.5/weather?lat=${coordinates.lat}&lon=${coordinates.lon}&appid=${apiKey}&units=metric&lang=cs`;
        
        // Zkusíme několik proxy služeb
        const proxies = [
            `https://api.allorigins.win/get?url=${encodeURIComponent(weatherUrl)}`,
            `https://cors-anywhere.herokuapp.com/${weatherUrl}`,
            weatherUrl
        ];

        for (let i = 0; i < proxies.length; i++) {
            try {
                debug(`🔄 Zkouším weather proxy ${i + 1}/${proxies.length}`);
                
                const response = await fetch(proxies[i]);
                if (!response.ok) continue;

                let data;
                if (i === 0) { // allorigins proxy
                    const result = await response.json();
                    data = JSON.parse(result.contents);
                } else {
                    data = await response.json();
                }

                if (data.cod && data.cod !== 200) {
                    throw new Error(`Weather API error: ${data.message}`);
                }

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

            } catch (error) {
                debug(`Weather proxy ${i + 1} selhala:`, error.message);
                if (i === proxies.length - 1) {
                    throw error;
                }
            }
        }

        throw new Error('Všechny weather proxy služby selhaly');
    },

    // 5denní předpověď s vylepšením
    async get5DayForecast(coordinates, targetDate, apiKey) {
        const forecastUrl = `https://api.openweathermap.org/data/2.5/forecast?lat=${coordinates.lat}&lon=${coordinates.lon}&appid=${apiKey}&units=metric&lang=cs`;
        
        // Zkusíme několik proxy služeb
        const proxies = [
            `https://api.allorigins.win/get?url=${encodeURIComponent(forecastUrl)}`,
            `https://cors-anywhere.herokuapp.com/${forecastUrl}`,
            forecastUrl
        ];

        for (let i = 0; i < proxies.length; i++) {
            try {
                debug(`🔄 Zkouším forecast proxy ${i + 1}/${proxies.length}`);
                
                const response = await fetch(proxies[i]);
                if (!response.ok) continue;

                let data;
                if (i === 0) { // allorigins proxy
                    const result = await response.json();
                    data = JSON.parse(result.contents);
                } else {
                    data = await response.json();
                }

                if (data.cod && data.cod !== "200") {
                    throw new Error(`Forecast API error: ${data.message}`);
                }

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

            } catch (error) {
                debug(`Forecast proxy ${i + 1} selhala:`, error.message);
                if (i === proxies.length - 1) {
                    throw error;
                }
            }
        }

        throw new Error('Všechny forecast proxy služby selhaly');
    },

    // Rozšířené fallback souřadnice pro česká města
    getFallbackCoordinates(city) {
        const coordinates = {
            'praha': { lat: 50.0755, lon: 14.4378, name: 'Praha' },
            'brno': { lat: 49.1951, lon: 16.6068, name: 'Brno' },
            'ostrava': { lat: 49.8209, lon: 18.2625, name: 'Ostrava' },
            'plzeň': { lat: 49.7384, lon: 13.3736, name: 'Plzeň' },
            'plzen': { lat: 49.7384, lon: 13.3736, name: 'Plzeň' },
            'liberec': { lat: 50.7663, lon: 15.0543, name: 'Liberec' },
            'olomouc': { lat: 49.5938, lon: 17.2509, name: 'Olomouc' },
            'hradec králové': { lat: 50.2103, lon: 15.8327, name: 'Hradec Králové' },
            'hradec kralove': { lat: 50.2103, lon: 15.8327, name: 'Hradec Králové' },
            'české budějovice': { lat: 48.9847, lon: 14.4747, name: 'České Budějovice' },
            'ceske budejovice': { lat: 48.9847, lon: 14.4747, name: 'České Budějovice' },
            'pardubice': { lat: 50.0343, lon: 15.7812, name: 'Pardubice' },
            'ústí nad labem': { lat: 50.6607, lon: 14.0323, name: 'Ústí nad Labem' },
            'usti nad labem': { lat: 50.6607, lon: 14.0323, name: 'Ústí nad Labem' },
            'jihlava': { lat: 49.3961, lon: 15.5911, name: 'Jihlava' },
            'karlovy vary': { lat: 50.2329, lon: 12.8710, name: 'Karlovy Vary' },
            'kladno': { lat: 50.1427, lon: 14.1027, name: 'Kladno' },
            'most': { lat: 50.5030, lon: 13.6357, name: 'Most' },
            'opava': { lat: 49.9386, lon: 17.9026, name: 'Opava' },
            'frýdek-místek': { lat: 49.6835, lon: 18.3487, name: 'Frýdek-Místek' },
            'frydek-mistek': { lat: 49.6835, lon: 18.3487, name: 'Frýdek-Místek' }
        };

        const cityLower = this.removeDiacritics(city.toLowerCase());
        
        // Přesná shoda
        if (coordinates[cityLower]) {
            return coordinates[cityLower];
        }
        
        // Částečná shoda
        for (const [knownCity, coords] of Object.entries(coordinates)) {
            if (cityLower.includes(knownCity) || knownCity.includes(cityLower)) {
                return coords;
            }
        }

        return null;
    },

    // Fallback počasí podle sezóny s vylepšením
    getFallbackWeather(date) {
        const month = new Date(date).getMonth() + 1; // 1-12
        const day = new Date(date).getDate();
        
        let temp, description, main;
        
        if (month >= 12 || month <= 2) {
            // Zima
            temp = Math.random() > 0.5 ? 2 : -1;
            description = 'částečně oblačno (sezónní odhad)';
            main = 'Clouds';
        } else if (month >= 3 && month <= 5) {
            // Jaro
            temp = 10 + Math.floor(Math.random() * 10);
            description = 'proměnlivě oblačno (sezónní odhad)';
            main = 'Clouds';
        } else if (month >= 6 && month <= 8) {
            // Léto
            temp = 20 + Math.floor(Math.random() * 8);
            description = 'slunečno až polojasno (sezónní odhad)';
            main = 'Clear';
        } else {
            // Podzim
            temp = 8 + Math.floor(Math.random() * 8);
            description = 'oblačno s možností deště (sezónní odhad)';
            main = 'Clouds';
        }

        return {
            temp: temp,
            description: description,
            main: main,
            humidity: 60 + Math.floor(Math.random() * 20),
            windSpeed: 2 + Math.floor(Math.random() * 4),
            isFallback: true
        };
    },

    // Kontrola platnosti cache
    isCacheValid(cachedData) {
        const ttl = CONFIG?.CACHE_TTL?.weather || (30 * 60 * 1000); // 30 minut default
        return (Date.now() - cachedData.timestamp) < ttl;
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
                ℹ️ ${weather.isFallback ? 'Sezónní odhad (API nedostupné)' : 'Odhad pro vzdálenější datum'}
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
                        <div class="weather-detail-label">Vlhkost</div>
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
            factor *= 1.2; // Ideální teplota
        } else if (temp > 25) {
            factor *= 0.8; // Horko
        } else if (temp < 10) {
            factor *= 0.7; // Zima
        }
        
        // Faktor podle podmínek
        const conditionFactors = {
            'Clear': 1.15,
            'Clouds': 1.0,
            'Rain': 0.5,
            'Drizzle': 0.6,
            'Snow': 0.4,
            'Thunderstorm': 0.3,
            'Mist': 0.8,
            'Fog': 0.8
        };
        
        const conditionFactor = conditionFactors[weather.main] || 1.0;
        factor *= conditionFactor;
        
        // Faktor podle větru
        if (weather.windSpeed > 10) {
            factor *= 0.9;
        }
        
        // Faktor podle vlhkosti
        if (weather.humidity > 80) {
            factor *= 0.95;
        }
        
        debug(`🌤️ Weather faktor: ${factor.toFixed(2)} (${weather.description}, ${weather.temp}°C)`);
        return Math.max(factor, 0.2); // Minimální faktor 0.2
    },

    // Utility funkce pro odstranění diakritiky
    removeDiacritics(str) {
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    },

    // Vyčištění cache počasí
    clearCache() {
        if (globalData && globalData.weatherCache) {
            globalData.weatherCache.clear();
            debug('🌤️ Weather cache vyčištěna');
        }
    }
};
