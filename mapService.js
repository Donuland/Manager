// ========================================
// DONULAND MANAGEMENT SYSTEM - MAPS SERVICE
// Služba pro výpočet vzdáleností pomocí Google Maps
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
            
            let distance;
            
            // Pokusíme se použít Google Maps API
            try {
                distance = await this.getDistanceFromGoogleMaps(fromCity, toCity);
            } catch (error) {
                debugWarn('Google Maps API selhalo, používám odhad:', error.message);
                distance = this.estimateDistance(fromCity, toCity);
            }
            
            // Uložení do cache
            const cacheData = {
                data: distance,
                timestamp: Date.now()
            };
            globalData.distanceCache.set(cacheKey, cacheData);
            
            debug(`✅ Vzdálenost vypočítána: ${fromCity} → ${toCity} = ${distance} km`);
            return distance;

        } catch (error) {
            debugError('Chyba při výpočtu vzdálenosti:', error);
            
            // Fallback - základní odhad
            const fallbackDistance = this.estimateDistance(fromCity, toCity);
            debug(`📍 Používám fallback vzdálenost: ${fallbackDistance} km`);
            
            return fallbackDistance;
        }
    },

    // Výpočet vzdálenosti pomocí Google Maps API
    async getDistanceFromGoogleMaps(fromCity, toCity) {
        const apiKey = document.getElementById('mapsApiKey').value;
        if (!apiKey) {
            throw new Error('Google Maps API klíč není nastaven');
        }

        // Formátování názvu města pro API
        const origin = encodeURIComponent(`${fromCity}, Czech Republic`);
        const destination = encodeURIComponent(`${toCity}, Czech Republic`);

        // Pokus o přímé volání (může selhat kvůli CORS)
        try {
            const url = `https://maps.googleapis.com/maps/api/distancematrix/json?origins=${origin}&destinations=${destination}&units=metric&key=${apiKey}`;
            
            // Použijeme CORS proxy
            const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
            
            const response = await utils.retry(async () => {
                const res = await fetch(proxyUrl);
                if (!res.ok) {
                    throw new Error(`Maps API error: ${res.status}`);
                }
                return res;
            });

            const result = await response.json();
            const data = JSON.parse(result.contents);

            if (data.status !== 'OK') {
                throw new Error(`Maps API status: ${data.status}`);
            }

            const element = data.rows[0]?.elements[0];
            if (!element || element.status !== 'OK') {
                throw new Error(`No route found: ${element?.status}`);
            }

            // Vzdálenost v kilometrech
            const distanceInKm = Math.round(element.distance.value / 1000);
            
            debug(`🗺️ Google Maps vzdálenost: ${distanceInKm} km`);
            return distanceInKm;

        } catch (error) {
            debugWarn('Google Maps API nedostupné:', error.message);
            throw error;
        }
    },

    // Odhad vzdálenosti bez API (vzdušná čára + korekce)
    estimateDistance(fromCity, toCity) {
        const coordinates = this.getCityCoordinates();
        
        const fromCoords = this.findCityCoordinates(fromCity, coordinates);
        const toCoords = this.findCityCoordinates(toCity, coordinates);
        
        if (!fromCoords || !toCoords) {
            // Pokud neznáme souřadnice, použijeme tabulku vzdáleností
            return this.getDistanceFromTable(fromCity, toCity);
        }
        
        // Haversine formula pro vzdušnou čáru
        const airDistance = this.haversineDistance(
            fromCoords.lat, fromCoords.lon,
            toCoords.lat, toCoords.lon
        );
        
        // Korekce pro skutečnou vzdálenost po silnicích (přibližně +25%)
        const roadDistance = Math.round(airDistance * 1.25);
        
        debug(`📐 Odhadovaná vzdálenost (vzdušná čára + 25%): ${roadDistance} km`);
        return roadDistance;
    },

    // Haversine formula pro výpočet vzdálenosti mezi dvěma body
    haversineDistance(lat1, lon1, lat2, lon2) {
        const R = 6371; // Poloměr Země v km
        const dLat = this.toRadians(lat2 - lat1);
        const dLon = this.toRadians(lon2 - lon1);
        
        const a = Math.sin(dLat / 2) * Math.sin(dLat / 2) +
                  Math.cos(this.toRadians(lat1)) * Math.cos(this.toRadians(lat2)) *
                  Math.sin(dLon / 2) * Math.sin(dLon / 2);
        
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
        return R * c;
    },

    // Převod na radiány
    toRadians(degrees) {
        return degrees * (Math.PI / 180);
    },

    // Najití souřadnic města
    findCityCoordinates(cityName, coordinates) {
        const cityLower = utils.removeDiacritics(cityName.toLowerCase().trim());
        
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

    // Souřadnice českých měst
    getCityCoordinates() {
        return {
            'praha': { lat: 50.0755, lon: 14.4378 },
            'brno': { lat: 49.1951, lon: 16.6068 },
            'ostrava': { lat: 49.8209, lon: 18.2625 },
            'plzen': { lat: 49.7384, lon: 13.3736 },
            'plzeň': { lat: 49.7384, lon: 13.3736 },
            'liberec': { lat: 50.7663, lon: 15.0543 },
            'olomouc': { lat: 49.5938, lon: 17.2509 },
            'hradec kralove': { lat: 50.2103, lon: 15.8327 },
            'hradec králové': { lat: 50.2103, lon: 15.8327 },
            'ceske budejovice': { lat: 48.9847, lon: 14.4747 },
            'české budějovice': { lat: 48.9847, lon: 14.4747 },
            'pardubice': { lat: 50.0343, lon: 15.7812 },
            'usti nad labem': { lat: 50.6607, lon: 14.0323 },
            'ústí nad labem': { lat: 50.6607, lon: 14.0323 },
            'zlin': { lat: 49.2167, lon: 17.6667 },
            'zlín': { lat: 49.2167, lon: 17.6667 },
            'kladno': { lat: 50.1476, lon: 14.1037 },
            'most': { lat: 50.5035, lon: 13.6357 },
            'karvina': { lat: 49.8439, lon: 18.5586 },
            'karviná': { lat: 49.8439, lon: 18.5586 },
            'opava': { lat: 49.9387, lon: 17.9023 },
            'frydek-mistek': { lat: 49.6833, lon: 18.35 },
            'frýdek-místek': { lat: 49.6833, lon: 18.35 },
            'decin': { lat: 50.7663, lon: 14.2072 },
            'děčín': { lat: 50.7663, lon: 14.2072 },
            'teplice': { lat: 50.6404, lon: 13.8245 },
            'chomutov': { lat: 50.4607, lon: 13.4172 },
            'jihlava': { lat: 49.3961, lon: 15.5908 },
            'mlada boleslav': { lat: 50.4113, lon: 14.9034 },
            'mladá boleslav': { lat: 50.4113, lon: 14.9034 },
            'prostejov': { lat: 49.4719, lon: 17.1113 },
            'prostějov': { lat: 49.4719, lon: 17.1113 },
            'prerov': { lat: 49.4551, lon: 17.4509 },
            'přerov': { lat: 49.4551, lon: 17.4509 },
            'jablonec nad nisou': { lat: 50.7244, lon: 15.171 },
            'trebic': { lat: 49.2144, lon: 15.8819 },
            'třebíč': { lat: 49.2144, lon: 15.8819 },
            'karlovy vary': { lat: 50.2329, lon: 12.8713 },
            'ceska lipa': { lat: 50.6856, lon: 14.5375 },
            'česká lípa': { lat: 50.6856, lon: 14.5375 },
            'trinec': { lat: 49.6774, lon: 18.6718 },
            'třinec': { lat: 49.6774, lon: 18.6718 },
            'tabor': { lat: 49.4144, lon: 14.6578 },
            'tábor': { lat: 49.4144, lon: 14.6578 },
            'kolin': { lat: 50.0282, lon: 15.1998 },
            'kolín': { lat: 50.0282, lon: 15.1998 },
            'pribram': { lat: 49.6896, lon: 14.0105 },
            'příbram': { lat: 49.6896, lon: 14.0105 },
            'cheb': { lat: 50.0796, lon: 12.3744 },
            'trutnov': { lat: 50.5608, lon: 15.9128 },
            'znojmo': { lat: 48.8555, lon: 16.0488 },
            'marianske lazne': { lat: 49.9647, lon: 12.7015 },
            'mariánské lázně': { lat: 49.9647, lon: 12.7015 },
            'kutna hora': { lat: 49.9484, lon: 15.2679 },
            'kutná hora': { lat: 49.9484, lon: 15.2679 },
            'podebrady': { lat: 50.1423, lon: 15.1189 },
            'poděbrady': { lat: 50.1423, lon: 15.1189 },
            'vsetin': { lat: 49.3389, lon: 17.9961 },
            'vsetín': { lat: 49.3389, lon: 17.9961 },
            'kromeriz': { lat: 49.2975, lon: 17.3927 },
            'kroměříž': { lat: 49.2975, lon: 17.3927 },
            'jindrichuv hradec': { lat: 49.1441, lon: 15.0026 },
            'jindřichův hradec': { lat: 49.1441, lon: 15.0026 },
            'zdar nad sazavou': { lat: 49.5626, lon: 15.9393 },
            'žďár nad sázavou': { lat: 49.5626, lon: 15.9393 }
        };
    },

    // Tabulka vzdáleností z Prahy (fallback)
    getDistanceFromTable(fromCity, toCity) {
        // Pokud výchozí město není Praha, použijeme základní odhad
        if (fromCity.toLowerCase() !== 'praha') {
            return 150; // Průměrná vzdálenost mezi městy v ČR
        }

        const distances = {
            'brno': 200,
            'ostrava': 350,
            'plzen': 90,
            'plzeň': 90,
            'liberec': 110,
            'olomouc': 280,
            'budejovice': 150,
            'české budějovice': 150,
            'hradec kralove': 120,
            'hradec králové': 120,
            'usti nad labem': 80,
            'ústí nad labem': 80,
            'pardubice': 110,
            'zlin': 320,
            'zlín': 320,
            'kladno': 30,
            'most': 80,
            'karvina': 380,
            'karviná': 380,
            'opava': 350,
            'frydek-mistek': 360,
            'frýdek-místek': 360,
            'decin': 100,
            'děčín': 100,
            'teplice': 85,
            'chomutov': 100,
            'jihlava': 130,
            'mlada boleslav': 60,
            'mladá boleslav': 60,
            'prostejov': 250,
            'prostějov': 250,
            'prerov': 270,
            'přerov': 270,
            'jablonec nad nisou': 120,
            'trebic': 170,
            'třebíč': 170,
            'karlovy vary': 130,
            'ceska lipa': 80,
            'česká lípa': 80,
            'trinec': 380,
            'třinec': 380,
            'tabor': 90,
            'tábor': 90,
            'kolin': 60,
            'kolín': 60,
            'pribram': 70,
            'příbram': 70,
            'cheb': 170,
            'trutnov': 160,
            'znojmo': 220,
            'marianske lazne': 140,
            'mariánské lázně': 140,
            'kutna hora': 80,
            'kutná hora': 80,
            'podebrady': 50,
            'poděbrady': 50,
            'vsetin': 340,
            'vsetín': 340,
            'kromeriz': 290,
            'kroměříž': 290,
            'jindrichuv hradec': 140,
            'jindřichův hradec': 140,
            'zdar nad sazavou': 160,
            'žďár nad sázavou': 160
        };

        const cityLower = utils.removeDiacritics(toCity.toLowerCase());
        
        for (const [knownCity, distance] of Object.entries(distances)) {
            if (cityLower.includes(knownCity) || knownCity.includes(cityLower)) {
                return distance;
            }
        }

        // Fallback pro neznámá města
        return 150;
    },

    // Kontrola platnosti cache
    isCacheValid(cachedData) {
        return (Date.now() - cachedData.timestamp) < CONFIG.CACHE_TTL.distance;
    },

    // Vyčištění cache vzdáleností
    clearCache() {
        globalData.distanceCache.clear();
        debug('📍 Distance cache vyčištěna');
    }
};
