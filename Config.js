// ========================================
// DONULAND MANAGEMENT SYSTEM - CONFIG
// Globální konfigurace aplikace
// ========================================

const CONFIG = {
    // API URLs a klíče
    GOOGLE_SHEETS_URL: 'https://docs.google.com/spreadsheets/d/1LclCz9hb0hlb1D92OyVqk6Cbam7PRK6KgAzGgiGs6iE/edit?usp=sharing',
    WEATHER_API_KEY: 'c2fb0e86623880dc86162892b0fd9c95',
    MAPS_API_KEY: 'AIzaSyBTTA_MKa6FrxKpkcd7c5-d3FnC6FBLVTc',
    
    // Business parametry
    DONUT_COST: 32,           // Náklad na výrobu 1 donutu v Kč
    DONUT_PRICE: 50,          // Standardní prodejní cena v Kč
    FRANCHISE_PRICE: 52,      // Cena pro franšízanty v Kč
    HOURLY_WAGE: 150,         // Hodinová mzda v Kč
    WORK_HOURS: 10,           // Pracovní hodin na akci (včetně přestávek)
    FUEL_COST_PER_KM: 15,     // Náklady na dopravu v Kč/km (včetně amortizace)
    
    // Base město pro výpočet vzdálenosti
    BASE_CITY: 'Praha',
    
    // Konverzní faktory podle typu akce
    CONVERSION_FACTORS: {
        'čokofest': 2.0,              // ČokoFest akce jsou velmi úspěšné
        'cokofest': 2.0,
        'chocolate': 2.0,
        'čokolád': 2.0,
        'burger': 1.8,               // Burger festivaly
        'food festival': 1.5,        // Obecné food festivaly
        'gastro': 1.5,
        'street food': 1.4,
        'rodinný festival': 1.4,     // Rodinné akce
        'kulturní akce (rodinná)': 1.3,
        'veletrh': 1.2,
        'koncert': 0.9,              // Koncerty - lidé se fokusují na hudbu
        'majáles': 0.8,              // Studentské akce - méně peněz
        'Sportovní akce (dospělí)': 0.7,  // Sportovní akce
        'ostatní': 1.0               // Výchozí hodnota
    },
    
    // Faktory podle velikosti města (počet obyvatel)
    CITY_FACTORS: {
        'praha': 1.3,      // 1.3M obyvatel
        'brno': 1.2,       // 380k obyvatel  
        'ostrava': 1.1,    // 280k obyvatel
        'plzeň': 1.05,     // 175k obyvatel
        'liberec': 1.0,    // 105k obyvatel
        'olomouc': 1.0,    // 100k obyvatel
        'hradec králové': 0.95,  // 92k
        'pardubice': 0.95, // 92k
        'české budějovice': 0.9,  // 94k
        'ústí nad labem': 0.9,    // 92k
        'default': 0.85    // Menší města
    },
    
    // Faktory podle konkurence
    COMPETITION_FACTORS: {
        1: 1.3,  // Malá konkurence
        2: 1.0,  // Střední konkurence  
        3: 0.7   // Velká konkurence
    },
    
    // Faktory podle počasí
    WEATHER_FACTORS: {
        temperature: {
            ideal: { min: 18, max: 25, factor: 1.2 },
            hot: { min: 25, max: 35, factor: 0.8 },     // Čokoláda se taje
            cold: { min: -10, max: 10, factor: 0.7 }    // Méně lidí venku
        },
        conditions: {
            'Clear': 1.15,      // Slunečno
            'Clouds': 1.0,      // Oblačno
            'Rain': 0.5,        // Déšť výrazně snižuje návštěvnost
            'Drizzle': 0.6,     // Mrholení
            'Snow': 0.4,        // Sníh
            'Thunderstorm': 0.3, // Bouřka
            'Mist': 0.8,        // Mlha
            'Fog': 0.8          // Mlha
        }
    },
    
    // Mapování sloupců Google Sheets
    SHEET_COLUMNS: {
        date: ['Datum', 'B'],
        city: ['Lokalita', 'C'], 
        name: ['Název akce', 'D'],
        category: ['kategorie', 'E'],
        confirmed: ['POTVRZENO', 'F'],
        responsible: ['KDO MÁ NA STAROST', 'G'],
        region: ['Čechy / Morava', 'I'],
        visitors: ['návstěvnost', 'Q'],
        weather: ['počasí', 'R'],
        actualSales: ['realně prodáno', 'N'],
        rentCost: ['Cena nájmu', 'M'],
        competition: ['konkurence', 'W'],
        rating: ['hodnocení akce 1-5', 'X'],
        notes: ['poznámka', 'Y']
    },
    
    // Target list pro ukládání predikcí
    PREDICTIONS_SHEET: 'Predikce',   // Název listu pro ukládání predikcí
    DEBUG: true,
    
    // Cache TTL v milisekundách
    CACHE_TTL: {
        weather: 30 * 60 * 1000,    // 30 minut
        distance: 24 * 60 * 60 * 1000, // 24 hodin
        sheets: 5 * 60 * 1000       // 5 minut
    }
};

// Globální proměnné
let globalData = {
    historicalData: [],
    weatherCache: new Map(),
    distanceCache: new Map(),
    isLoading: false,
    lastDataLoad: null
};

// Utility funkce pro debug
function debug(...args) {
    if (CONFIG.DEBUG) {
        console.log('[DONULAND]', ...args);
    }
}

function debugError(...args) {
    console.error('[DONULAND ERROR]', ...args);
}

function debugWarn(...args) {
    console.warn('[DONULAND WARNING]', ...args);
}
