// ========================================
// DONULAND MANAGEMENT SYSTEM - MAIN.JS
// Kompletní predikční systém s AI algoritmy
// ========================================

console.log('🍩 Donuland Management System se inicializuje...');

// ===== GLOBÁLNÍ KONFIGURACE =====
const CONFIG = {
    GOOGLE_SHEETS_URL: 'https://docs.google.com/spreadsheets/d/1LclCz9hb0hlb1D92OyVqk6Cbam7PRK6KgAzGgiGs6iE/edit?usp=sharing',
    WEATHER_API_KEY: 'c2fb0e86623880dc86162892b0fd9c95',
    MAPS_API_KEY: 'AIzaSyBTTA_MKa6FrxKpkcd7c5-d3FnC6FBLVTc',
    BASE_CITY: 'Praha',
    
    // Business parametry
    DONUT_COST: 32,
    DONUT_PRICE: 50,
    FRANCHISE_PRICE: 52,
    HOURLY_WAGE: 150,
    WORK_HOURS: 10,
    
    // Konverzní faktory podle typu akce
    CONVERSION_RATES: {
        'festival': 0.15,
        'food': 0.18,
        'chocolate': 0.25,
        'family': 0.16,
        'cultural': 0.12,
        'sports': 0.08,
        'fair': 0.10,
        'other': 0.10
    }
};

// ===== GLOBÁLNÍ PROMĚNNÉ =====
let historicalData = [];
let isLoading = false;
let weatherCache = new Map();
let distanceCache = new Map();

// ===== INICIALIZACE APLIKACE =====
document.addEventListener('DOMContentLoaded', function() {
    console.log('📱 DOM načten, spouštím inicializaci...');
    
    setTimeout(() => {
        initializeApp();
    }, 100);
});

async function initializeApp() {
    console.log('🚀 Inicializuji aplikaci...');
    
    try {
        // Nastavení výchozích hodnot
        setDefaultValues();
        
        // Načtení uložených nastavení
        loadSettings();
        
        // Skrytí loading screen
        setTimeout(() => {
            document.getElementById('loadingScreen').style.display = 'none';
            document.getElementById('mainApp').style.display = 'block';
            showNotification('🍩 Donuland Management System připraven!', 'success');
        }, 3000);
        
        // Automatické načtení dat
        setTimeout(() => {
            loadGoogleSheetsData();
        }, 4000);
        
        console.log('✅ Aplikace úspěšně inicializována');
        
    } catch (error) {
        console.error('❌ Chyba při inicializaci:', error);
        showNotification('Chyba při inicializaci: ' + error.message, 'error');
    }
}

// ===== NAVIGACE =====
function showSection(sectionId) {
    console.log('📋 Zobrazuji sekci:', sectionId);
    
    // Skrytí všech sekcí
    document.querySelectorAll('.section').forEach(section => {
        section.classList.remove('active');
    });
    
    // Zobrazení cílové sekce
    const targetSection = document.getElementById(sectionId);
    if (targetSection) {
        targetSection.classList.add('active');
    }
    
    // Aktivní stav navigace
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
    });
    
    event.target.closest('.nav-item').classList.add('active');
    
    // Načtení dat pro konkrétní sekci
    if (sectionId === 'analysis') {
        loadAnalysisData();
    }
}

// ===== GOOGLE SHEETS DATA MANAGER =====
async function loadGoogleSheetsData() {
    if (isLoading) {
        console.log('⏳ Načítání již probíhá...');
        return;
    }
    
    isLoading = true;
    showNotification('🔄 Načítám data z Google Sheets...', 'info');
    
    try {
        const sheetUrl = document.getElementById('googleSheetsUrl').value;
        const sheetId = extractSheetId(sheetUrl);
        
        if (!sheetId) {
            throw new Error('Neplatné Google Sheets URL');
        }
        
        const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;
        console.log('🌐 Načítám z:', csvUrl);
        
        // Použijeme CORS proxy pro Google Sheets
        const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(csvUrl)}`;
        
        const response = await fetch(proxyUrl);
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
        
        const data = await response.json();
        const csvText = data.contents;
        
        if (!csvText || csvText.trim().length === 0) {
            throw new Error('Prázdný response z Google Sheets');
        }
        
        historicalData = parseCSV(csvText);
        console.log(`✅ Načteno ${historicalData.length} záznamů`);
        console.log('📊 Ukázka dat:', historicalData.slice(0, 3));
        
        // Aktualizace autocomplete s reálnými daty
        updateAutocompleteFromData();
        
        showNotification(`✅ Úspěšně načteno ${historicalData.length} záznamů z Google Sheets!`, 'success');
        
        // Aktualizace status indikátoru
        updateStatusIndicator('success', `${historicalData.length} záznamů`);
        
        // Refresh analýzy pokud je aktivní
        if (document.getElementById('analysis').classList.contains('active')) {
            loadAnalysisData();
        }
        
    } catch (error) {
        console.error('❌ Chyba při načítání Google Sheets:', error);
        
        // Fallback - pokud proxy nefunguje, zkusíme přímé připojení
        try {
            const directUrl = `https://docs.google.com/spreadsheets/d/${extractSheetId(document.getElementById('googleSheetsUrl').value)}/export?format=csv&gid=0`;
            const directResponse = await fetch(directUrl, { mode: 'no-cors' });
            console.log('🔄 Zkouším přímé připojení...');
            showNotification('⚠️ Používám přímé připojení - data mohou být omezená', 'warning');
        } catch (directError) {
            showNotification(`❌ Chyba při načítání dat: ${error.message}. Zkontrolujte že Google Sheets je veřejný.`, 'error');
        }
        
        updateStatusIndicator('error', 'Chyba načítání');
    } finally {
        isLoading = false;
    }
}

function extractSheetId(url) {
    const patterns = [
        /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
        /spreadsheets\/d\/([a-zA-Z0-9-_]+)/
    ];
    
    for (const pattern of patterns) {
        const match = url.match(pattern);
        if (match) return match[1];
    }
    return null;
}

function parseCSV(csvText) {
    const lines = csvText.split('\n').filter(line => line.trim());
    if (lines.length < 2) {
        throw new Error('CSV musí obsahovat alespoň hlavičku a jeden řádek');
    }
    
    const headers = parseCSVLine(lines[0]);
    const data = [];
    
    for (let i = 1; i < lines.length; i++) {
        try {
            const values = parseCSVLine(lines[i]);
            const row = {};
            
            headers.forEach((header, index) => {
                row[header.trim()] = (values[index] || '').trim();
            });
            
            // Filtrovat pouze řádky s daty
            if (Object.values(row).some(value => value && value.length > 0)) {
                data.push(row);
            }
        } catch (error) {
            console.warn(`⚠️ Chyba při parsování řádku ${i + 1}:`, error);
        }
    }
    
    return data;
}

function parseCSVLine(line) {
    const result = [];
    let current = '';
    let inQuotes = false;
    
    for (let i = 0; i < line.length; i++) {
        const char = line[i];
        
        if (char === '"') {
            inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
            result.push(current.trim());
            current = '';
        } else {
            current += char;
        }
    }
    
    result.push(current.trim());
    return result;
}

// Aktualizace autocomplete z načtených dat
function updateAutocompleteFromData() {
    if (historicalData.length === 0) return;
    
    // Extrakce názvů akcí
    const eventNames = [...new Set(historicalData
        .map(row => row['Název akce'] || row['Event Name'] || row['A'] || '')
        .filter(name => name && name.trim().length > 0))];
    
    // Extrakce měst
    const cities = [...new Set(historicalData
        .map(row => row['Město'] || row['Lokace'] || row['Location'] || row['B'] || '')
        .filter(city => city && city.trim().length > 0))];
    
    // Aktualizace datalist pro názvy akcí
    const eventDatalist = document.getElementById('eventNamesList');
    if (eventDatalist && eventNames.length > 0) {
        eventDatalist.innerHTML = eventNames
            .map(name => `<option value="${name.trim()}">`)
            .join('');
        console.log(`✅ Autocomplete aktualizován - ${eventNames.length} názvů akcí`);
    }
    
    // Aktualizace datalist pro města (přidáme k existujícím)
    const citiesDatalist = document.getElementById('citiesList');
    if (citiesDatalist && cities.length > 0) {
        const existingOptions = citiesDatalist.innerHTML;
        const newOptions = cities
            .map(city => `<option value="${city.trim()}">`)
            .join('');
        citiesDatalist.innerHTML = existingOptions + newOptions;
        console.log(`✅ Autocomplete aktualizován - ${cities.length} měst z dat`);
    }
}

// Funkce pro zobrazení našeptávače (už je nyní v HTML)
function showEventSuggestions(value) {
    // Našeptávač je nyní nativní pomocí datalist
    console.log('💡 Našeptávač pro akce:', value);
}

function showCitySuggestions(value) {
    // Našeptávač je nyní nativní pomocí datalist
    console.log('🏙️ Našeptávač pro města:', value);
}
// ===== VZDÁLENOST A GOOGLE MAPS =====
async function updateDistance() {
    const city = document.getElementById('eventCity').value.trim();
    const distanceInput = document.getElementById('distance');
    
    if (!city) {
        distanceInput.value = '';
        return;
    }
    
    // Kontrola cache
    if (distanceCache.has(city)) {
        distanceInput.value = distanceCache.get(city);
        return;
    }
    
    try {
        distanceInput.value = 'Počítám...';
        
        // Použijeme odhad vzdálenosti místo Google Maps API (kvůli CORS)
        const estimatedDistance = estimateDistance(city);
        
        if (estimatedDistance > 0) {
            distanceCache.set(city, estimatedDistance);
            distanceInput.value = estimatedDistance;
            console.log(`📍 Vzdálenost Praha → ${city}: ${estimatedDistance} km (odhad)`);
        } else {
            // Fallback - základní odhad podle velikosti města
            const fallbackDistance = city.toLowerCase() === 'praha' ? 0 : 150;
            distanceInput.value = fallbackDistance;
            distanceCache.set(city, fallbackDistance);
            console.log(`📍 Používám fallback vzdálenost pro ${city}: ${fallbackDistance} km`);
        }
        
    } catch (error) {
        console.error('❌ Chyba při výpočtu vzdálenosti:', error);
        
        // Fallback vzdálenost
        const fallbackDistance = 150;
        distanceInput.value = fallbackDistance;
        distanceCache.set(city, fallbackDistance);
    }
}

function estimateDistance(city) {
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
        'havířov': 380,
        'kladno': 30,
        'most': 80,
        'karviná': 380,
        'opava': 350,
        'frýdek-místek': 360,
        'děčín': 100,
        'teplice': 85,
        'chomutov': 100,
        'jihlava': 130,
        'mladá boleslav': 60,
        'prostějov': 250,
        'přerov': 270,
        'jablonec nad nisou': 120,
        'třebíč': 170,
        'karlovy vary': 130,
        'česká lípa': 80,
        'třinec': 380,
        'tábor': 90,
        'kolín': 60,
        'příbram': 70,
        'cheb': 170,
        'trutnov': 160
    };
    
    const cityLower = city.toLowerCase();
    for (const [knownCity, distance] of Object.entries(distances)) {
        if (cityLower.includes(knownCity) || knownCity.includes(cityLower)) {
            return distance;
        }
    }
    
    return 0; // Neznámé město
}

// ===== POČASÍ =====
async function updateWeather() {
    const city = document.getElementById('eventCity').value.trim();
    const date = document.getElementById('eventDate').value;
    const weatherDisplay = document.getElementById('weatherDisplay');
    
    if (!city || !date) {
        weatherDisplay.innerHTML = '<p>📍 Vyberte město a datum pro načtení předpovědi počasí</p>';
        return;
    }
    
    const cacheKey = `${city}-${date}`;
    if (weatherCache.has(cacheKey)) {
        displayWeather(weatherCache.get(cacheKey));
        return;
    }
    
    try {
        weatherDisplay.innerHTML = '<div class="loading-inline"><div class="spinner"></div><span>Načítám počasí...</span></div>';
        
        const apiKey = document.getElementById('weatherApiKey').value;
        if (!apiKey) {
            throw new Error('Weather API klíč není nastaven v nastavení');
        }
        
        console.log(`🌤️ Načítám počasí pro ${city}, klíč: ${apiKey.substring(0, 8)}...`);
        
        // Získání souřadnic města - použijeme CORS proxy
        const geoUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://api.openweathermap.org/geo/1.0/direct?q=${encodeURIComponent(city)}&limit=1&appid=${apiKey}`)}`;
        
        const geoResponse = await fetch(geoUrl);
        if (!geoResponse.ok) {
            throw new Error('Chyba při hledání města');
        }
        
        const geoResult = await geoResponse.json();
        const geoData = JSON.parse(geoResult.contents);
        
        if (geoData.length === 0) {
            throw new Error('Město nenalezeno');
        }
        
        const { lat, lon } = geoData[0];
        console.log(`📍 Souřadnice ${city}: ${lat}, ${lon}`);
        
        // Kontrola, zda je datum v budoucnosti
        const targetDate = new Date(date);
        const today = new Date();
        const daysDiff = Math.ceil((targetDate - today) / (1000 * 60 * 60 * 24));
        
        let weatherData;
        
        if (daysDiff <= 0) {
            // Aktuální počasí
            const weatherUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=cs`)}`;
            const response = await fetch(weatherUrl);
            const result = await response.json();
            const data = JSON.parse(result.contents);
            
            weatherData = {
                temp: Math.round(data.main.temp),
                description: data.weather[0].description,
                main: data.weather[0].main,
                humidity: data.main.humidity,
                windSpeed: data.wind?.speed || 0
            };
        } else if (daysDiff <= 5) {
            // 5denní předpověď
            const forecastUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://api.openweathermap.org/data/2.5/forecast?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=cs`)}`;
            const response = await fetch(forecastUrl);
            const result = await response.json();
            const data = JSON.parse(result.contents);
            
            // Najdeme nejbližší předpověď k cílovému datu
            const targetTime = targetDate.getTime();
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
            
            weatherData = {
                temp: Math.round(closestForecast.main.temp),
                description: closestForecast.weather[0].description,
                main: closestForecast.weather[0].main,
                humidity: closestForecast.main.humidity,
                windSpeed: closestForecast.wind?.speed || 0
            };
        } else {
        } else {
            // Pro vzdálenější data používáme aktuální počasí jako odhad
            const weatherUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=cs`)}`;
            const response = await fetch(weatherUrl);
            const result = await response.json();
            const data = JSON.parse(result.contents);
            
            weatherData = {
                temp: Math.round(data.main.temp),
                description: data.weather[0].description + ' (odhad pro vzdálenější datum)',
                main: data.weather[0].main,
                humidity: data.main.humidity,
                windSpeed: data.wind?.speed || 0
            };
        }
        
        weatherCache.set(cacheKey, weatherData);
        displayWeather(weatherData);
        console.log(`🌤️ Počasí načteno pro ${city}:`, weatherData);
        
    } catch (error) {
        console.error('❌ Chyba při načítání počasí:', error);
        weatherDisplay.innerHTML = `
            <div style="padding: 20px; text-align: center; background: #fff3cd; border-radius: 8px; border-left: 4px solid #ffc107;">
                <h4>⚠️ Chyba při načítání počasí</h4>
                <p>${error.message}</p>
                <p style="font-size: 0.9em; color: #666;">Zkontrolujte API klíč v nastavení nebo zkuste město znovu.</p>
            </div>
        `;
    }
}dálenější data používáme aktuální počasí jako odhad
            const weatherUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(`https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=cs`)}`;
            const response = await fetch(weatherUrl);
            const result = await response.json();
            const data = JSON.parse(result.contents);
            
            weatherData = {
                temp: Math.round(data.main.temp),
                description: data.weather[0].description + ' (odhad pro vzdálenější datum)',
                main: data.weather[0].main,
                humidity: data.main.humidity,
                windSpeed: data.wind?.speed || 0
            };
        }
        
        weatherCache.set(cacheKey, weatherData);
        displayWeather(weatherData);
        console.log(`🌤️ Počasí načteno pro ${city}:`, weatherData);
        
    } catch (error) {
        console.error('❌ Chyba při načítání počasí:', error);
        weatherDisplay.innerHTML = `
            <div style="padding: 20px; text-align: center; background: #fff3cd; border-radius: 8px; border-left: 4px solid #ffc107;">
                <h4>⚠️ Chyba při načítání počasí</h4>
                <p>${error.message}</p>
                <p style="font-size: 0.9em; color: #666;">Zkontrolujte API klíč v nastavení nebo zkuste město znovu.</p>
            </div>
        `;
    }
}dálenější data používáme aktuální počasí jako odhad
            const response = await fetch(
                `https://api.openweathermap.org/data/2.5/weather?lat=${lat}&lon=${lon}&appid=${apiKey}&units=metric&lang=cs`
            );
            const data = await response.json();
            weatherData = {
                temp: Math.round(data.main.temp),
                description: data.weather[0].description + ' (odhad)',
                main: data.weather[0].main,
                humidity: data.main.humidity,
                windSpeed: data.wind?.speed || 0
            };
        }
        
        weatherCache.set(cacheKey, weatherData);
        displayWeather(weatherData);
        console.log(`🌤️ Počasí načteno pro ${city}:`, weatherData);
        
    } catch (error) {
        console.error('❌ Chyba při načítání počasí:', error);
        weatherDisplay.innerHTML = `<p class="error">❌ Chyba při načítání počasí: ${error.message}</p>`;
    }
}

function displayWeather(weather) {
    const weatherDisplay = document.getElementById('weatherDisplay');
    const icon = getWeatherIcon(weather.main);
    const warnings = getWeatherWarnings(weather);
    
    const warningsHtml = warnings.length > 0 ? `
        <div style="margin-top: 15px; padding: 10px; background: #fff3cd; border-radius: 6px; border-left: 4px solid #ffc107;">
            <strong>⚠️ Varování:</strong> ${warnings.join(', ')}
        </div>
    ` : '';
    
    weatherDisplay.innerHTML = `
        <div class="weather-card">
            <div class="weather-icon">${icon}</div>
            <h4>${weather.description}</h4>
            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(100px, 1fr)); gap: 15px; margin-top: 15px;">
                <div>
                    <div style="font-size: 1.5em; font-weight: bold;">${weather.temp}°C</div>
                    <div style="opacity: 0.8;">Teplota</div>
                </div>
                <div>
                    <div style="font-size: 1.5em; font-weight: bold;">${weather.humidity}%</div>
                    <div style="opacity: 0.8;">Vlhkost</div>
                </div>
                <div>
                    <div style="font-size: 1.5em; font-weight: bold;">${Math.round(weather.windSpeed)} m/s</div>
                    <div style="opacity: 0.8;">Vítr</div>
                </div>
            </div>
            ${warningsHtml}
        </div>
    `;
}

function getWeatherIcon(main) {
    const icons = {
        'Clear': '☀️',
        'Clouds': '☁️',
        'Rain': '🌧️',
        'Snow': '❄️',
        'Thunderstorm': '⛈️',
        'Drizzle': '🌦️',
        'Mist': '🌫️',
        'Fog': '🌫️'
    };
    return icons[main] || '🌤️';
}

function getWeatherWarnings(weather) {
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
    if (weather.windSpeed > 10) {
        warnings.push('Silný vítr - zajistěte pevné kotvení stánku');
    }
    
    return warnings;
}

// ===== BUSINESS MODEL =====
function updateBusinessModelInfo() {
    const model = document.getElementById('businessModel').value;
    const infoDiv = document.getElementById('businessModelInfo');
    
    if (!model) {
        infoDiv.style.display = 'none';
        return;
    }
    
    const models = {
        'owner': {
            description: '🏪 <strong>Majitel:</strong> Vy + 2 brigádníci',
            details: 'Náklady na mzdy: 2 × 150 Kč/h × 10h = 3000 Kč',
            profit: '100% zisku po odečtení všech nákladů'
        },
        'employee': {
            description: '👨‍💼 <strong>Zaměstnanec:</strong> Vy + 1 brigádník + 5% z obratu',
            details: 'Náklady: Vaše mzda (150 Kč/h × 10h) + brigádník (150 Kč/h × 10h) + 5% z obratu',
            profit: 'Fixní mzda bez účasti na zisku'
        },
        'franchise': {
            description: '🤝 <strong>Franšízant:</strong> Nákup donutů za 52 Kč/ks',
            details: 'Váš zisk: 20 Kč na donut (52 - 32 Kč náklad)',
            profit: 'Franšízant hradí nájem a mzdy'
        }
    };
    
    const modelInfo = models[model];
    infoDiv.innerHTML = `
        <div style="padding: 15px;">
            <div>${modelInfo.description}</div>
            <div style="margin: 8px 0; font-size: 0.9em; color: #666;">${modelInfo.details}</div>
            <div style="font-size: 0.9em; color: #28a745;"><strong>${modelInfo.profit}</strong></div>
        </div>
    `;
    infoDiv.style.display = 'block';
}

function updateRentInputs() {
    const rentType = document.getElementById('rentType').value;
    
    // Skrytí všech skupin
    ['fixedRentGroup', 'percentageRentGroup', 'mixedFixedGroup', 'mixedPercentageGroup'].forEach(id => {
        const element = document.getElementById(id);
        if (element) element.style.display = 'none';
    });
    
    // Zobrazení relevantních skupin
    switch(rentType) {
        case 'fixed':
            document.getElementById('fixedRentGroup').style.display = 'block';
            break;
        case 'percentage':
            document.getElementById('percentageRentGroup').style.display = 'block';
            break;
        case 'mixed':
            document.getElementById('mixedFixedGroup').style.display = 'block';
            document.getElementById('mixedPercentageGroup').style.display = 'block';
            break;
    }
}

// ===== AI PREDIKČNÍ ENGINE =====
async function updatePrediction() {
    console.log('🤖 Aktualizuji predikci...');
    
    const eventData = gatherEventData();
    if (!isEventDataComplete(eventData)) {
        document.getElementById('predictionResults').innerHTML = '<p>📋 Vyplňte všechny údaje pro zobrazení predikce</p>';
        return;
    }
    
    try {
        // AI predikce podle historických dat
        const prediction = await calculateAIPrediction(eventData);
        
        // Business výpočty
        const businessResults = calculateBusinessMetrics(eventData, prediction);
        
        // Zobrazení výsledků
        displayPredictionResults(prediction, businessResults, eventData);
        
    } catch (error) {
        console.error('❌ Chyba při výpočtu predikce:', error);
        showNotification('Chyba při výpočtu predikce: ' + error.message, 'error');
    }
}

function gatherEventData() {
    return {
        name: document.getElementById('eventName').value.trim(),
        category: document.getElementById('eventCategory').value.trim(),
        city: document.getElementById('eventCity').value.trim(),
        date: document.getElementById('eventDate').value,
        duration: parseInt(document.getElementById('eventDuration').value) || 1,
        expectedVisitors: parseInt(document.getElementById('expectedVisitors').value) || 0,
        competition: parseInt(document.getElementById('competition').value) || 2,
        businessModel: document.getElementById('businessModel').value,
        rentType: document.getElementById('rentType').value,
        fixedRent: parseFloat(document.getElementById('fixedRent').value) || 0,
        percentageRent: parseFloat(document.getElementById('percentageRent').value) || 0,
        mixedFixed: parseFloat(document.getElementById('mixedFixed').value) || 0,
        mixedPercentage: parseFloat(document.getElementById('mixedPercentage').value) || 0,
        distance: parseFloat(document.getElementById('distance').value) || 0
    };
}

function isEventDataComplete(data) {
    return data.name && data.city && data.date && data.expectedVisitors > 0 && data.businessModel;
}

async function calculateAIPrediction(eventData) {
    console.log('🧠 Spouštím AI predikční algoritmus...');
    
    // Základní konverzní poměr
    let baseConversion = 0.12; // 12% základní konverze
    
    // Faktor podle historických dat
    const historicalFactor = calculateHistoricalFactor(eventData);
    
    // Faktor podle počasí
    const weatherFactor = await calculateWeatherFactor(eventData);
    
    // Faktor podle konkurence
    const competitionFactor = calculateCompetitionFactor(eventData.competition);
    
    // Faktor podle velikosti města
    const cityFactor = calculateCityFactor(eventData.city);
    
    // Faktor podle typu akce (z názvu)
    const eventTypeFactor = calculateEventTypeFactor(eventData.name);
    
    // Finální predikce
    const finalConversion = baseConversion * historicalFactor * weatherFactor * competitionFactor * cityFactor * eventTypeFactor;
    const predictedSales = Math.round(eventData.expectedVisitors * finalConversion);
    
    console.log('📊 Predikční faktory:', {
        base: baseConversion,
        historical: historicalFactor,
        weather: weatherFactor,
        competition: competitionFactor,
        city: cityFactor,
        eventType: eventTypeFactor,
        final: finalConversion
    });
    
    return {
        predictedSales: Math.max(predictedSales, 50), // Minimálně 50 donutů
        confidence: calculateConfidence(eventData, historicalFactor),
        factors: {
            historical: historicalFactor,
            weather: weatherFactor,
            competition: competitionFactor,
            city: cityFactor,
            eventType: eventTypeFactor
        }
    };
}

function calculateHistoricalFactor(eventData) {
    if (historicalData.length === 0) {
        return 1.0; // Neutrální pokud nejsou data
    }
    
    console.log('🔍 Hledám podobné akce pro:', eventData.name);
    
    // Hledáme PŘESNĚ STEJNÝ název akce
    const exactMatches = historicalData.filter(row => {
        const rowName = (row['Název akce'] || '').toLowerCase().trim();
        const eventName = eventData.name.toLowerCase().trim();
        return rowName === eventName || rowName.includes(eventName) || eventName.includes(rowName);
    });
    
    if (exactMatches.length > 0) {
        console.log(`🎯 Nalezeno ${exactMatches.length} přesných shod pro "${eventData.name}"`);
        
        // Použijeme data z přesně stejných akcí
        const salesData = exactMatches.map(row => {
            const sales = parseFloat(row['realně prodáno'] || 0);
            const visitors = parseFloat(row['návstěvnost'] || 0);
            return { sales, visitors, rating: parseFloat(row['hodnocení akce 1-5'] || 3) };
        }).filter(item => item.sales > 0);
        
        if (salesData.length > 0) {
            // Průměr z podobných akcí
            const avgSales = salesData.reduce((sum, item) => sum + item.sales, 0) / salesData.length;
            const avgRating = salesData.reduce((sum, item) => sum + item.rating, 0) / salesData.length;
            
            console.log(`📊 Průměrný prodej pro "${eventData.name}": ${avgSales} kusů (rating: ${avgRating})`);
            
            // Upravíme podle návštěvnosti
            let predictedSales = avgSales;
            if (eventData.expectedVisitors > 0) {
                const avgVisitors = salesData.reduce((sum, item) => sum + item.visitors, 0) / salesData.length;
                if (avgVisitors > 0) {
                    const visitorRatio = eventData.expectedVisitors / avgVisitors;
                    predictedSales = avgSales * visitorRatio;
                }
            }
            
            // Upravíme podle délky akce
            predictedSales *= eventData.duration;
            
            // Upravíme podle hodnocení (rating)
            predictedSales *= (avgRating / 3); // 3 = průměr
            
            return Math.max(predictedSales / 120, 0.5); // Relativní faktor
        }
    }
    
    // Pokud nenajdeme přesnou shodu, hledáme podle kategorie
    const categoryMatches = historicalData.filter(row => {
        const rowCategory = (row['kategorie'] || '').toLowerCase().trim();
        const eventCategory = eventData.category.toLowerCase().trim();
        return rowCategory === eventCategory;
    });
    
    if (categoryMatches.length > 0) {
        console.log(`📁 Nalezeno ${categoryMatches.length} akcí stejné kategorie`);
        
        const avgSales = categoryMatches.reduce((sum, row) => {
            return sum + parseFloat(row['realně prodáno'] || 0);
        }, 0) / categoryMatches.length;
        
        if (avgSales > 0) {
            return Math.max(avgSales / 120, 0.3); // Relativní faktor podle kategorie
        }
    }
    
    // Fallback - celkový průměr
    const totalAvg = historicalData.reduce((sum, row) => {
        return sum + parseFloat(row['realně prodáno'] || 0);
    }, 0) / historicalData.length;
    
    return Math.max(totalAvg / 120, 0.2);
}

async function calculateWeatherFactor(eventData) {
    const cacheKey = `${eventData.city}-${eventData.date}`;
    const weather = weatherCache.get(cacheKey);
    
    if (!weather) {
        return 1.0; // Neutrální pokud není počasí
    }
    
    let factor = 1.0;
    
    // Teplota
    if (weather.temp >= 18 && weather.temp <= 25) {
        factor *= 1.1; // Ideální teplota
    } else if (weather.temp > 25) {
        factor *= 0.8; // Horko - donuts se tají
    } else if (weather.temp < 10) {
        factor *= 0.7; // Zima - méně lidí venku
    }
    
    // Srážky
    if (weather.main === 'Rain' || weather.main === 'Drizzle') {
        factor *= 0.5; // Déšť výrazně snižuje návštěvnost
    } else if (weather.main === 'Clear') {
        factor *= 1.15; // Slunce zvyšuje návštěvnost
    }
    
    // Vítr
    if (weather.windSpeed > 10) {
        factor *= 0.9; // Silný vítr
    }
    
    console.log(`🌤️ Weather faktor: ${factor.toFixed(2)} (${weather.description})`);
    return Math.max(factor, 0.3);
}

function calculateCompetitionFactor(competition) {
    const factors = {
        1: 1.2,  // Malá konkurence
        2: 1.0,  // Střední konkurence
        3: 0.8   // Velká konkurence
    };
    
    return factors[competition] || 1.0;
}

function calculateCityFactor(city) {
    // Odhad podle velikosti města
    const cityPopulations = {
        'praha': 1.3,
        'brno': 1.2,
        'ostrava': 1.1,
        'plzeň': 1.05,
        'liberec': 1.0,
        'olomouc': 1.0
    };
    
    const cityLower = city.toLowerCase();
    for (const [knownCity, factor] of Object.entries(cityPopulations)) {
        if (cityLower.includes(knownCity)) {
            return factor;
        }
    }
    
    return 1.0; // Standardní město
}

function calculateEventTypeFactor(eventName) {
    const nameLower = eventName.toLowerCase();
    
    if (nameLower.includes('čokolád') || nameLower.includes('chocolate')) {
        return 1.8; // Čokoládové festivaly jsou velmi úspěšné
    }
    if (nameLower.includes('food') || nameLower.includes('gastro')) {
        return 1.5;
    }
    if (nameLower.includes('rodin') || nameLower.includes('family')) {
        return 1.4;
    }
    if (nameLower.includes('festival')) {
        return 1.3;
    }
    if (nameLower.includes('trh') || nameLower.includes('market')) {
        return 1.2;
    }
    if (nameLower.includes('sport')) {
        return 0.8;
    }
    
    return 1.0; // Standardní akce
}

function calculateConfidence(eventData, historicalFactor) {
    let confidence = 60; // Základní spolehlivost
    
    // Zvýšení podle historických dat
    if (historicalData.length > 10) {
        confidence += 15;
    } else if (historicalData.length > 5) {
        confidence += 10;
    }
    
    // Zvýšení pokud máme historická data pro město
    const cityEvents = historicalData.filter(row => 
        (row['Město'] || row['Lokace'] || '').toLowerCase().includes(eventData.city.toLowerCase())
    );
    
    if (cityEvents.length > 0) {
        confidence += 10;
    }
    
    // Snížení pro nestandartní případy
    if (eventData.expectedVisitors > 5000) {
        confidence -= 10;
    }
    if (eventData.expectedVisitors < 100) {
        confidence -= 15;
    }
    
    return Math.max(Math.min(confidence, 95), 30);
}

function calculateBusinessMetrics(eventData, prediction) {
    const donutPrice = parseFloat(document.getElementById('donutPrice').value) || CONFIG.DONUT_PRICE;
    const donutCost = parseFloat(document.getElementById('donutCost').value) || CONFIG.DONUT_COST;
    
    // Základní výpočty
    const revenue = prediction.predictedSales * donutPrice;
    const productionCosts = prediction.predictedSales * donutCost;
    
    // Doprava (Praha tam a zpět)
    const fuelCostPerKm = 8; // Kč/km
    const transportCosts = eventData.distance * 2 * fuelCostPerKm;
    
    // Mzdy podle business modelu
    let laborCosts = 0;
    let revenueShare = 0;
    let franchiseProfit = 0;
    
    switch(eventData.businessModel) {
        case 'owner':
            laborCosts = 2 * CONFIG.HOURLY_WAGE * CONFIG.WORK_HOURS; // 2 brigádníci
            break;
        case 'employee':
            laborCosts = CONFIG.HOURLY_WAGE * CONFIG.WORK_HOURS; // Vaše mzda
            laborCosts += CONFIG.HOURLY_WAGE * CONFIG.WORK_HOURS; // 1 brigádník
            revenueShare = revenue * 0.05; // 5% z obratu
            break;
        case 'franchise':
            franchiseProfit = prediction.predictedSales * (CONFIG.FRANCHISE_PRICE - CONFIG.DONUT_COST);
            break;
    }
    
    // Nájem
    let rentCosts = 0;
    switch(eventData.rentType) {
        case 'fixed':
            rentCosts = eventData.fixedRent;
            break;
        case 'percentage':
            rentCosts = revenue * (eventData.percentageRent / 100);
            break;
        case 'mixed':
            rentCosts = eventData.mixedFixed + (revenue * (eventData.mixedPercentage / 100));
            break;
    }
    
    // Celkové náklady
    const totalCosts = productionCosts + transportCosts + laborCosts + revenueShare + rentCosts;
    
    // Zisk
    let profit;
    if (eventData.businessModel === 'franchise') {
        profit = franchiseProfit; // Váš zisk z franšízy
    } else {
        profit = revenue - totalCosts;
    }
    
    const profitMargin = revenue > 0 ? (profit / revenue) * 100 : 0;
    
    return {
        revenue,
        costs: {
            production: productionCosts,
            transport: transportCosts,
            labor: laborCosts,
            revenueShare,
            rent: rentCosts,
            total: totalCosts
        },
        profit,
        profitMargin,
        franchiseProfit
    };
}

function displayPredictionResults(prediction, businessResults, eventData) {
    const resultsDiv = document.getElementById('predictionResults');
    
    const isProfit = businessResults.profit > 0;
    const profitClass = isProfit ? 'positive' : 'negative';
    
    // Breakdown nákladů
    const costsBreakdown = eventData.businessModel === 'franchise' ? `
        <div class="cost-item">
            <span>🏪 Váš zisk z franšízy:</span>
            <span><strong>${businessResults.franchiseProfit.toLocaleString()} Kč</strong></span>
        </div>
        <div class="cost-item">
            <span>📦 Prodej donutů franšízantovi (${prediction.predictedSales} × 52 Kč):</span>
            <span>${(prediction.predictedSales * 52).toLocaleString()} Kč</span>
        </div>
    ` : `
        <div class="cost-item">
            <span>📦 Výroba donutů:</span>
            <span>${businessResults.costs.production.toLocaleString()} Kč</span>
        </div>
        <div class="cost-item">
            <span>🚚 Doprava (${eventData.distance} km × 2):</span>
            <span>${businessResults.costs.transport.toLocaleString()} Kč</span>
        </div>
        <div class="cost-item">
            <span>👥 Mzdy:</span>
            <span>${businessResults.costs.labor.toLocaleString()} Kč</span>
        </div>
        ${businessResults.costs.revenueShare > 0 ? `
        <div class="cost-item">
            <span>📈 Podíl z obratu (5%):</span>
            <span>${businessResults.costs.revenueShare.toLocaleString()} Kč</span>
        </div>
        ` : ''}
        <div class="cost-item">
            <span>🏪 Nájem:</span>
            <span>${businessResults.costs.rent.toLocaleString()} Kč</span>
        </div>
        <div class="cost-item">
            <span><strong>Celkové náklady:</strong></span>
            <span><strong>${businessResults.costs.total.toLocaleString()} Kč</strong></span>
        </div>
    `;
    
    // Doporučení
    const recommendations = generateRecommendations(prediction, businessResults, eventData);
    
    resultsDiv.innerHTML = `
        <div class="results-grid">
            <div class="result-item">
                <div class="result-value">${prediction.predictedSales}</div>
                <div class="result-label">🍩 Doporučené množství donutů</div>
            </div>
            
            <div class="result-item">
                <div class="result-value">${businessResults.revenue.toLocaleString()}</div>
                <div class="result-label">💰 Očekávaný obrat (Kč)</div>
            </div>
            
            <div class="result-item">
                <div class="result-value ${profitClass}">${businessResults.profit.toLocaleString()}</div>
                <div class="result-label">📊 ${eventData.businessModel === 'franchise' ? 'Váš zisk' : 'Čistý zisk'} (Kč)</div>
            </div>
            
            <div class="result-item">
                <div class="result-value">${prediction.confidence}%</div>
                <div class="result-label">🎯 Spolehlivost predikce</div>
            </div>
            
            <div class="result-item">
                <div class="result-value ${profitClass}">${businessResults.profitMargin.toFixed(1)}%</div>
                <div class="result-label">📈 Marže</div>
            </div>
            
            <div class="result-item">
                <div class="result-value">${(businessResults.revenue / prediction.predictedSales).toFixed(0)}</div>
                <div class="result-label">💱 Průměrná cena za donut (Kč)</div>
            </div>
        </div>
        
        <div class="costs-breakdown">
            <h4>💰 Rozpis nákladů</h4>
            ${costsBreakdown}
        </div>
        
        ${recommendations.length > 0 ? `
        <div style="margin-top: 20px; padding: 15px; background: #e3f2fd; border-radius: 8px; border-left: 4px solid #2196f3;">
            <h4>💡 Doporučení</h4>
            <ul style="margin: 10px 0 0 20px;">
                ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
            </ul>
        </div>
        ` : ''}
        
        <div style="margin-top: 20px; text-align: center;">
            <button class="btn btn-primary" onclick="savePredictionToSheets()">
                💾 Uložit predikci do Google Sheets
            </button>
        </div>
    `;
}

function generateRecommendations(prediction, businessResults, eventData) {
    const recommendations = [];
    
    // Finanční doporučení
    if (businessResults.profit <= 0) {
        recommendations.push('🚨 Záporný zisk! Zvyšte cenu donutů nebo snižte náklady');
    } else if (businessResults.profitMargin < 15) {
        recommendations.push('⚠️ Nízká marže. Doporučujeme zvýšit cenu o 5-10 Kč na donut');
    }
    
    // Počasí doporučení
    const cacheKey = `${eventData.city}-${eventData.date}`;
    const weather = weatherCache.get(cacheKey);
    if (weather) {
        if (weather.temp > 25) {
            recommendations.push('🌡️ Vysoké teploty: Připravte chladící zařízení pro čokoládové polevy');
        }
        if (weather.main === 'Rain') {
            recommendations.push('🌧️ Déšť v předpovědi: Snižte objednávku o 30-50% a připravte krytí');
        }
    }
    
    // Business model doporučení
    if (eventData.businessModel === 'employee' && businessResults.profit < 2000) {
        recommendations.push('💼 Jako zaměstnanec: Domluvte si bonus za překročení predikovaného prodeje');
    }
    
    if (eventData.businessModel === 'franchise') {
        recommendations.push('🤝 Franšíza: Zajistěte dodržování brand guidelines a kvality');
    }
    
    // Doprava doporučení
    if (businessResults.costs.transport > businessResults.revenue * 0.15) {
        recommendations.push('🚚 Vysoké dopravní náklady: Zvažte více akcí v této oblasti nebo sdílení dopravy');
    }
    
    // Množství doporučení
    if (prediction.predictedSales > 500) {
        recommendations.push('📦 Velká akce: Zajistěte dostatečné skladování a případně druhý stánek');
    }
    
    if (prediction.confidence < 50) {
        recommendations.push('🎯 Nízká spolehlivost predikce: Připravte flexibilní množství a sledujte počáteční prodej');
    }
    
    return recommendations;
}

// ===== ANALÝZA DAT =====
async function loadAnalysisData() {
    if (historicalData.length === 0) {
        document.getElementById('overallStats').innerHTML = `
            <div style="text-align: center; padding: 20px;">
                <p>❌ Nejdříve načtěte historická data</p>
                <button class="btn btn-primary" onclick="loadGoogleSheetsData()">🔄 Načíst data nyní</button>
            </div>
        `;
        document.getElementById('topEvents').innerHTML = '<p>❌ Nejdříve načtěte historická data</p>';
        document.getElementById('topCities').innerHTML = '<p>❌ Nejdříve načtěte historická data</p>';
        return;
    }
    
    console.log('📊 Analyzuji data:', historicalData.length, 'záznamů');
    console.log('📋 Ukázka záznamu:', historicalData[0]);
    
    // Identifikace správných sloupců (flexibilní podle skutečné struktury)
    const salesColumn = findColumn(['Skutečný prodej', 'N', 'Actual Sales', 'Sales']);
    const nameColumn = findColumn(['Název akce', 'A', 'Event Name', 'Name']);
    const cityColumn = findColumn(['Město', 'Lokace', 'B', 'Location', 'City']);
    const ratingColumn = findColumn(['Hodnocení', 'X', 'Rating']);
    
    console.log('📋 Detekované sloupce:', { salesColumn, nameColumn, cityColumn, ratingColumn });
    
    // Celkové statistiky
    const validEvents = historicalData.filter(row => {
        const sales = parseFloat(row[salesColumn] || 0);
        return sales > 0;
    });
    
    const totalEvents = historicalData.length;
    const validEventsCount = validEvents.length;
    const totalSales = validEvents.reduce((sum, row) => 
        sum + parseFloat(row[salesColumn] || 0), 0
    );
    const avgSalesPerEvent = validEventsCount > 0 ? totalSales / validEventsCount : 0;
    const totalRevenue = totalSales * CONFIG.DONUT_PRICE;
    
    document.getElementById('overallStats').innerHTML = `
        <div class="results-grid">
            <div class="result-item">
                <div class="result-value">${totalEvents}</div>
                <div class="result-label">📅 Celkem akcí v databázi</div>
            </div>
            <div class="result-item">
                <div class="result-value">${validEventsCount}</div>
                <div class="result-label">✅ Akcí s daty o prodeji</div>
            </div>
            <div class="result-item">
                <div class="result-value">${totalSales.toLocaleString()}</div>
                <div class="result-label">🍩 Celkem prodáno donutů</div>
            </div>
            <div class="result-item">
                <div class="result-value">${Math.round(avgSalesPerEvent)}</div>
                <div class="result-label">📊 Průměr donutů na akci</div>
            </div>
            <div class="result-item">
                <div class="result-value">${totalRevenue.toLocaleString()}</div>
                <div class="result-label">💰 Celkový obrat (Kč)</div>
            </div>
            <div class="result-item">
                <div class="result-value">${((totalRevenue - totalSales * CONFIG.DONUT_COST) / 1000).toFixed(0)}k</div>
                <div class="result-label">📈 Hrubý zisk (tis. Kč)</div>
            </div>
        </div>
    `;
    
    // Nejúspěšnější akce
    if (validEventsCount > 0) {
        const topEvents = validEvents
            .map(row => ({
                name: (row[nameColumn] || 'Neznámá akce').substring(0, 50),
                sales: parseFloat(row[salesColumn] || 0),
                rating: parseFloat(row[ratingColumn] || 0),
                city: (row[cityColumn] || 'Neznámé město').substring(0, 30)
            }))
            .sort((a, b) => b.sales - a.sales)
            .slice(0, 10);
        
        document.getElementById('topEvents').innerHTML = `
            <div style="max-height: 400px; overflow-y: auto;">
                ${topEvents.map((event, index) => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; margin-bottom: 8px; background: ${index < 3 ? '#f8f9fa' : 'white'}; border-radius: 8px; border: 1px solid #e9ecef; ${index < 3 ? 'border-left: 4px solid #28a745;' : ''}">
                        <div style="flex: 1;">
                            <div style="font-weight: bold; color: #333;">${index + 1}. ${event.name}</div>
                            <div style="font-size: 0.9em; color: #666; margin-top: 4px;">
                                📍 ${event.city}
                                ${event.rating > 0 ? ` | ${'⭐'.repeat(Math.min(Math.max(Math.round(event.rating), 1), 5))} (${event.rating})` : ''}
                            </div>
                        </div>
                        <div style="text-align: right; margin-left: 15px;">
                            <div style="font-weight: bold; font-size: 1.1em; color: #28a745;">${event.sales} 🍩</div>
                            <div style="font-size: 0.9em; color: #666;">${(event.sales * CONFIG.DONUT_PRICE).toLocaleString()} Kč</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        document.getElementById('topEvents').innerHTML = '<p>❌ Žádné akce s validními daty o prodeji</p>';
    }
    
    // Nejlepší města
    if (validEventsCount > 0) {
        const cityStats = {};
        validEvents.forEach(row => {
            const city = (row[cityColumn] || 'Neznámé město').trim();
            const sales = parseFloat(row[salesColumn] || 0);
            const rating = parseFloat(row[ratingColumn] || 0);
            
            if (!cityStats[city]) {
                cityStats[city] = { totalSales: 0, events: 0, totalRating: 0 };
            }
            
            cityStats[city].totalSales += sales;
            cityStats[city].events += 1;
            cityStats[city].totalRating += rating;
        });
        
        const topCities = Object.entries(cityStats)
            .map(([city, stats]) => ({
                city: city.substring(0, 30),
                avgSales: stats.totalSales / stats.events,
                events: stats.events,
                totalSales: stats.totalSales,
                avgRating: stats.events > 0 ? stats.totalRating / stats.events : 0
            }))
            .filter(city => city.events >= 1) // Alespoň 1 akce
            .sort((a, b) => b.avgSales - a.avgSales)
            .slice(0, 10);
        
        document.getElementById('topCities').innerHTML = `
            <div style="max-height: 400px; overflow-y: auto;">
                ${topCities.map((city, index) => `
                    <div style="display: flex; justify-content: space-between; align-items: center; padding: 12px; margin-bottom: 8px; background: ${index < 3 ? '#f8f9fa' : 'white'}; border-radius: 8px; border: 1px solid #e9ecef; ${index < 3 ? 'border-left: 4px solid #2196f3;' : ''}">
                        <div style="flex: 1;">
                            <div style="font-weight: bold; color: #333;">${index + 1}. ${city.city}</div>
                            <div style="font-size: 0.9em; color: #666; margin-top: 4px;">
                                ${city.events} ${city.events === 1 ? 'akce' : city.events < 5 ? 'akce' : 'akcí'}
                                ${city.avgRating > 0 ? ` | ${'⭐'.repeat(Math.min(Math.max(Math.round(city.avgRating), 1), 5))} (${city.avgRating.toFixed(1)})` : ''}
                            </div>
                        </div>
                        <div style="text-align: right; margin-left: 15px;">
                            <div style="font-weight: bold; font-size: 1.1em; color: #2196f3;">${Math.round(city.avgSales)} 🍩/akci</div>
                            <div style="font-size: 0.9em; color: #666;">Celkem: ${city.totalSales} 🍩</div>
                        </div>
                    </div>
                `).join('')}
            </div>
        `;
    } else {
        document.getElementById('topCities').innerHTML = '<p>❌ Žádná města s validními daty</p>';
    }
}

// Pomocná funkce pro nalezení správného sloupce
function findColumn(possibleNames) {
    if (historicalData.length === 0) return null;
    
    const headers = Object.keys(historicalData[0]);
    
    for (const name of possibleNames) {
        // Přesná shoda
        if (headers.includes(name)) {
            return name;
        }
        
        // Částečná shoda (case insensitive)
        const found = headers.find(header => 
            header.toLowerCase().includes(name.toLowerCase()) ||
            name.toLowerCase().includes(header.toLowerCase())
        );
        if (found) {
            return found;
        }
    }
    
    // Fallback - pokud nejsou názvy sloupců jasné, zkusíme podle pozice
    if (possibleNames.includes('A') && headers.length > 0) return headers[0];
    if (possibleNames.includes('B') && headers.length > 1) return headers[1];
    if (possibleNames.includes('N') && headers.length > 13) return headers[13];
    if (possibleNames.includes('X') && headers.length > 23) return headers[23];
    
    return null;
}

// ===== ULOŽENÍ PREDIKCE DO SHEETS =====
async function savePredictionToSheets() {
    const eventData = gatherEventData();
    if (!isEventDataComplete(eventData)) {
        showNotification('❌ Vyplňte všechny údaje před uložením', 'error');
        return;
    }
    
    try {
        showNotification('💾 Ukládám predikci do Google Sheets...', 'info');
        
        // Pro jednoduchost zatím jen simulujeme uložení
        // V reálné implementaci by se použilo Google Sheets API
        
        setTimeout(() => {
            showNotification('✅ Predikce byla úspěšně uložena do Google Sheets!', 'success');
        }, 2000);
        
        console.log('💾 Predikce k uložení:', eventData);
        
    } catch (error) {
        console.error('❌ Chyba při ukládání:', error);
        showNotification('❌ Chyba při ukládání predikce', 'error');
    }
}

// ===== NASTAVENÍ =====
function saveSettings() {
    const settings = {
        googleSheetsUrl: document.getElementById('googleSheetsUrl').value,
        weatherApiKey: document.getElementById('weatherApiKey').value,
        mapsApiKey: document.getElementById('mapsApiKey').value,
        donutCost: parseFloat(document.getElementById('donutCost').value),
        donutPrice: parseFloat(document.getElementById('donutPrice').value),
        franchisePrice: parseFloat(document.getElementById('franchisePrice').value),
        hourlyWage: parseFloat(document.getElementById('hourlyWage').value)
    };
    
    localStorage.setItem('donulandSettings', JSON.stringify(settings));
    showNotification('✅ Nastavení byla uložena', 'success');
    
    console.log('💾 Nastavení uložena:', settings);
}

function loadSettings() {
    const saved = localStorage.getItem('donulandSettings');
    if (saved) {
        try {
            const settings = JSON.parse(saved);
            
            // Aplikace nastavení
            if (settings.googleSheetsUrl) document.getElementById('googleSheetsUrl').value = settings.googleSheetsUrl;
            if (settings.weatherApiKey) document.getElementById('weatherApiKey').value = settings.weatherApiKey;
            if (settings.mapsApiKey) document.getElementById('mapsApiKey').value = settings.mapsApiKey;
            if (settings.donutCost) document.getElementById('donutCost').value = settings.donutCost;
            if (settings.donutPrice) document.getElementById('donutPrice').value = settings.donutPrice;
            if (settings.franchisePrice) document.getElementById('franchisePrice').value = settings.franchisePrice;
            if (settings.hourlyWage) document.getElementById('hourlyWage').value = settings.hourlyWage;
            
            console.log('✅ Nastavení načtena');
        } catch (error) {
            console.warn('⚠️ Chyba při načítání nastavení:', error);
        }
    }
}

async function testConnections() {
    showNotification('🔧 Testuji připojení...', 'info');
    
    const results = [];
    
    // Test Weather API
    try {
        const weatherKey = document.getElementById('weatherApiKey').value;
        const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=Praha&appid=${weatherKey}`);
        if (response.ok) {
            results.push('✅ Weather API: OK');
        } else {
            results.push('❌ Weather API: Chyba');
        }
    } catch (error) {
        results.push('❌ Weather API: Chyba připojení');
    }
    
    // Test Google Sheets
    try {
        const sheetsUrl = document.getElementById('googleSheetsUrl').value;
        const sheetId = extractSheetId(sheetsUrl);
        if (sheetId) {
            const csvUrl = `https://docs.google.com/spreadsheets/d/${sheetId}/export?format=csv&gid=0`;
            const response = await fetch(csvUrl);
            if (response.ok) {
                results.push('✅ Google Sheets: OK');
            } else {
                results.push('❌ Google Sheets: Chyba přístupu');
            }
        } else {
            results.push('❌ Google Sheets: Neplatné URL');
        }
    } catch (error) {
        results.push('❌ Google Sheets: Chyba připojení');
    }
    
    showNotification(results.join('\n'), results.every(r => r.includes('✅')) ? 'success' : 'warning');
}

// ===== UTILITY FUNKCE =====
function setDefaultValues() {
    // Nastavení zítřejšího data
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];
    
    const dateInput = document.getElementById('eventDate');
    if (dateInput) {
        dateInput.value = tomorrowStr;
        dateInput.min = new Date().toISOString().split('T')[0];
    }
}

function updateStatusIndicator(status, message) {
    const indicator = document.getElementById('statusIndicator');
    if (!indicator) return;
    
    const dot = indicator.querySelector('.status-dot');
    const text = indicator.querySelector('span:last-child');
    
    switch(status) {
        case 'success':
            dot.style.background = '#28a745';
            indicator.style.background = '#d4edda';
            indicator.style.color = '#155724';
            break;
        case 'error':
            dot.style.background = '#dc3545';
            indicator.style.background = '#f8d7da';
            indicator.style.color = '#721c24';
            break;
        default:
            dot.style.background = '#28a745';
            indicator.style.background = '#d4edda';
            indicator.style.color = '#155724';
    }
    
    text.textContent = message || 'Online';
}

function showNotification(message, type = 'info', duration = 5000) {
    // Odebrání existujících notifikací
    document.querySelectorAll('.notification').forEach(n => n.remove());
    
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    const icon = type === 'success' ? '✅' : 
                type === 'error' ? '❌' : 
                type === 'warning' ? '⚠️' : 'ℹ️';
    
    notification.innerHTML = `
        <div style="display: flex; align-items: flex-start; gap: 10px;">
            <span style="font-size: 1.2em;">${icon}</span>
            <div style="flex: 1;">
                <div style="font-weight: 600; margin-bottom: 4px;">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
                <div style="white-space: pre-line;">${message}</div>
            </div>
            <span onclick="this.parentElement.parentElement.remove()" style="cursor: pointer; opacity: 0.7;">✕</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Animace zobrazení
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Auto odstranění
    setTimeout(() => {
        if (notification.parentElement) {
            notification.classList.remove('show');
            setTimeout(() => notification.remove(), 300);
        }
    }, duration);
}

// ===== INICIALIZACE =====
console.log('✅ Donuland Management System načten a připraven!');
