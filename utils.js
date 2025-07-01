// ========================================
// DONULAND MANAGEMENT SYSTEM - UTILS
// Společné utility funkce
// ========================================

const utils = {
    // Extrakce Sheet ID z Google Sheets URL
    extractSheetId(url) {
        const patterns = [
            /\/spreadsheets\/d\/([a-zA-Z0-9-_]+)/,
            /spreadsheets\/d\/([a-zA-Z0-9-_]+)/
        ];
        
        for (const pattern of patterns) {
            const match = url.match(pattern);
            if (match) return match[1];
        }
        return null;
    },

    // Parsování CSV dat
    parseCSV(csvText) {
        try {
            const lines = csvText.split('\n').filter(line => line.trim());
            if (lines.length < 2) {
                throw new Error('CSV musí obsahovat alespoň hlavičku a jeden řádek dat');
            }
            
            const headers = this.parseCSVLine(lines[0]);
            const data = [];
            
            for (let i = 1; i < lines.length; i++) {
                try {
                    const values = this.parseCSVLine(lines[i]);
                    const row = {};
                    
                    headers.forEach((header, index) => {
                        row[header.trim()] = (values[index] || '').trim();
                    });
                    
                    // Filtrovat pouze řádky s nějakými daty
                    if (Object.values(row).some(value => value && value.length > 0)) {
                        data.push(row);
                    }
                } catch (error) {
                    debugWarn(`Chyba při parsování řádku ${i + 1}:`, error);
                }
            }
            
            debug(`CSV úspěšně naparsován: ${data.length} řádků`);
            return data;
            
        } catch (error) {
            debugError('Chyba při parsování CSV:', error);
            throw error;
        }
    },

    // Parsování jednotlivého řádku CSV
    parseCSVLine(line) {
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
    },

    // Nalezení správného sloupce v datech
    findColumn(data, possibleNames) {
        if (!data || data.length === 0) return null;
        
        const headers = Object.keys(data[0]);
        
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
        
        return null;
    },

    // Formátování čísla s tisícovými oddělovači
    formatNumber(number) {
        return new Intl.NumberFormat('cs-CZ').format(number);
    },

    // Formátování měny
    formatCurrency(amount) {
        return new Intl.NumberFormat('cs-CZ', {
            style: 'currency',
            currency: 'CZK',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    },

    // Formátování data
    formatDate(date) {
        if (typeof date === 'string') {
            date = new Date(date);
        }
        
        return new Intl.DateTimeFormat('cs-CZ', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
        }).format(date);
    },

    // Výpočet počtu dní mezi daty
    daysBetween(date1, date2) {
        const oneDay = 24 * 60 * 60 * 1000;
        const firstDate = new Date(date1);
        const secondDate = new Date(date2);
        
        return Math.round(Math.abs((firstDate - secondDate) / oneDay));
    },

    // Kontrola, zda je datum v budoucnosti
    isFutureDate(date) {
        const targetDate = new Date(date);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Nastavit na začátek dne
        
        return targetDate >= today;
    },

    // Kontrola, zda je datum v minulosti
    isPastDate(date) {
        return !this.isFutureDate(date);
    },

    // Debounce funkce pro omezení množství volání
    debounce(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    },

    // Throttle funkce
    throttle(func, limit) {
        let inThrottle;
        return function() {
            const args = arguments;
            const context = this;
            if (!inThrottle) {
                func.apply(context, args);
                inThrottle = true;
                setTimeout(() => inThrottle = false, limit);
            }
        };
    },

    // Validace emailu
    isValidEmail(email) {
        const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return re.test(email);
    },

    // Validace URL
    isValidUrl(url) {
        try {
            new URL(url);
            return true;
        } catch {
            return false;
        }
    },

    // Escape HTML pro bezpečnost
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    },

    // Generování náhodného ID
    generateId() {
        return Math.random().toString(36).substr(2, 9);
    },

    // Storage funkce pro localStorage s TTL
    setWithTTL(key, value, ttl) {
        try {
            const item = {
                value: value,
                expiry: new Date().getTime() + ttl
            };
            localStorage.setItem(key, JSON.stringify(item));
        } catch (error) {
            debugWarn('Chyba při ukládání do localStorage:', error);
        }
    },

    getWithTTL(key) {
        try {
            const itemStr = localStorage.getItem(key);
            if (!itemStr) return null;
            
            const item = JSON.parse(itemStr);
            const now = new Date().getTime();
            
            if (now > item.expiry) {
                localStorage.removeItem(key);
                return null;
            }
            
            return item.value;
        } catch (error) {
            debugWarn('Chyba při čtení z localStorage:', error);
            return null;
        }
    },

    // Odstranění diakritiky
    removeDiacritics(str) {
        return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
    },

    // Fuzzy search pro vyhledávání v textu
    fuzzySearch(needle, haystack, threshold = 0.6) {
        const needleLower = this.removeDiacritics(needle.toLowerCase());
        const haystackLower = this.removeDiacritics(haystack.toLowerCase());
        
        if (haystackLower.includes(needleLower)) {
            return true;
        }
        
        // Levenshtein distance pro pokročilejší hledání
        const distance = this.levenshteinDistance(needleLower, haystackLower);
        const maxLength = Math.max(needleLower.length, haystackLower.length);
        const similarity = 1 - (distance / maxLength);
        
        return similarity >= threshold;
    },

    // Levenshtein distance algoritmus
    levenshteinDistance(str1, str2) {
        const matrix = [];
        
        for (let i = 0; i <= str2.length; i++) {
            matrix[i] = [i];
        }
        
        for (let j = 0; j <= str1.length; j++) {
            matrix[0][j] = j;
        }
        
        for (let i = 1; i <= str2.length; i++) {
            for (let j = 1; j <= str1.length; j++) {
                if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
                    matrix[i][j] = matrix[i - 1][j - 1];
                } else {
                    matrix[i][j] = Math.min(
                        matrix[i - 1][j - 1] + 1,
                        matrix[i][j - 1] + 1,
                        matrix[i - 1][j] + 1
                    );
                }
            }
        }
        
        return matrix[str2.length][str1.length];
    },

    // Retry funkce pro API volání
    async retry(fn, maxAttempts = 3, delay = 1000) {
        for (let attempt = 1; attempt <= maxAttempts; attempt++) {
            try {
                return await fn();
            } catch (error) {
                if (attempt === maxAttempts) {
                    throw error;
                }
                
                debugWarn(`Pokus ${attempt} selhal, zkouším znovu za ${delay}ms:`, error.message);
                await new Promise(resolve => setTimeout(resolve, delay));
                delay *= 2; // Exponential backoff
            }
        }
    },

    // Kontrola platnosti cache
    isCacheValid(cacheKey, ttl) {
        const cached = globalData[cacheKey];
        if (!cached || !cached.timestamp) {
            return false;
        }
        
        return (Date.now() - cached.timestamp) < ttl;
    },

    // Nastavení cache s timestamp
    setCache(cacheKey, data) {
        globalData[cacheKey] = {
            data: data,
            timestamp: Date.now()
        };
    },

    // Získání dat z cache
    getCache(cacheKey) {
        const cached = globalData[cacheKey];
        return cached ? cached.data : null;
    },

    // Vyčištění cache
    clearCache(cacheKey = null) {
        if (cacheKey) {
            delete globalData[cacheKey];
        } else {
            // Vyčistit všechny cache kromě základních dat
            globalData.weatherCache.clear();
            globalData.distanceCache.clear();
        }
    }
};
