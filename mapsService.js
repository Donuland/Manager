// ========================================
// DONULAND MANAGEMENT SYSTEM - MAPS SERVICE
// Zjednodušená služba pro výpočet vzdáleností
// ========================================

const mapsService = {
    // Hlavní funkce pro výpočet vzdálenosti
    async calculateDistance(fromCity, toCity) {
        const cacheKey = `${fromCity}-${toCity}`;
        
        // Kontrola cache
        if (globalData.distanceCache.has(cacheKey)) {
            const cached = globalData.distanceCache.get(cacheKey);
            if (this.isCacheValid(cached)) {
                debug(`📍 Vzdálenost načtena z cache: ${fromCity} → ${toCity} = ${cached.data} km`);
                return cached.data;
            }
        }

        try {
            debug(`📍 Počítám vzdálenost: ${fromCity} → ${toCity}`);
            
            // Pokus o Google Maps API
            const distance = await this.getDistanceFromGoogleMaps(fromCity, toCity);
            
            // Uložení do cache
            globalData.distanceCache.set(cacheKey, {
                data: distance,
                timestamp: Date.now()
            });
            
            debug(`✅ Vzdálenost vypočítána: ${fromCity} → ${toCity} = ${distance} km`);
            return distance;

        } catch (error) {
            debugError('Chyba při výpočtu vzdálenosti:', error);
            
            // Jednoduchý fallback - 150km jako průměr pro ČR
            const fallbackDistance = 150;
            debug(`📍 Používám fallback vzdálenost: ${fallbackDistance} km`);
            
            return fallbackDistance;
        }
    },

    // Google Maps API volání
    async getDistanceFromGoogleMaps(fromCity, toCity) {
        const apiKey = document.getElementById('mapsApiKey').value;
        if (!apiKey) {
            throw new Error('Google Maps API klíč není nastaven');
        }

        // Přidáme "Czech Republic" pro lepší výsledky
        const origin = encodeURIComponent(`${fromCity}, Czech Republic`);
        const destination = encodeURIComponent(`${toCity}, Czech Republic`);

        const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&units=metric&key=${apiKey}`;
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
        
        const response = await utils.retry(async () => {
            const res = await fetch(proxyUrl);
            if (!res.ok) {
                throw new Error(`HTTP ${res.status}`);
            }
            return res;
        });

        const result = await response.json();
        const data = JSON.parse(result.contents);

        // Kontrola odpovědi API
        if (data.status !== 'OK') {
            throw new Error(`Maps API status: ${data.status}`);
        }

        const element = data.rows[0]?.elements[0];
        if (!element || element.status !== 'OK') {
            throw new Error(`Trasa nenalezena: ${element?.status || 'Neznámá chyba'}`);
        }

        // Vzdálenost v kilometrech
        const distanceInKm = Math.round(element.distance.value / 1000);
        debug(`🗺️ Google Maps vzdálenost: ${distanceInKm} km`);
        
        return distanceInKm;
    },

    // Kontrola platnosti cache
    isCacheValid(cachedData) {
        return (Date.now() - cachedData.timestamp) < CONFIG.CACHE_TTL.distance;
    },

    // Vyčištění cache
    clearCache() {
        globalData.distanceCache.clear();
        debug('📍 Distance cache vyčištěna');
    }
};
