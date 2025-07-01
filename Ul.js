// ========================================
// DONULAND MANAGEMENT SYSTEM - UI UTILITIES
// Utility funkce pro UI komponenty
// ========================================

const ui = {
    // Zobrazení notifikace
    showNotification(message, type = 'info', duration = 5000) {
        // Odebrání existujících notifikací
        document.querySelectorAll('.notification').forEach(n => n.remove());
        
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        
        const icons = {
            'success': '✅',
            'error': '❌',
            'warning': '⚠️',
            'info': 'ℹ️'
        };
        
        const icon = icons[type] || 'ℹ️';
        
        notification.innerHTML = `
            <div class="notification-content">
                <span class="notification-icon">${icon}</span>
                <div class="notification-text">
                    <div class="notification-title">${type.charAt(0).toUpperCase() + type.slice(1)}</div>
                    <div class="notification-message">${message}</div>
                </div>
                <span class="notification-close" onclick="this.parentElement.parentElement.remove()">✕</span>
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
        
        debug(`Notifikace [${type}]: ${message}`);
    },

    // Aktualizace status indikátoru
    updateStatusIndicator(status, message) {
        const indicator = document.getElementById('statusIndicator');
        if (!indicator) return;
        
        const dot = indicator.querySelector('.status-dot');
        const text = indicator.querySelector('span:last-child');
        
        // Odebrání všech tříd
        indicator.classList.remove('online', 'error', 'loading');
        
        switch(status) {
            case 'online':
            case 'success':
                indicator.classList.add('online');
                break;
            case 'error':
                indicator.classList.add('error');
                break;
            case 'loading':
                indicator.classList.add('loading');
                break;
        }
        
        if (text) {
            text.textContent = message || 'Online';
        }
    },

    // Zobrazení loading stavu
    showLoading(elementId, message = 'Načítám...') {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        element.innerHTML = `
            <div class="loading-inline">
                <div class="spinner"></div>
                <span>${message}</span>
            </div>
        `;
    },

    // Zobrazení chybového stavu
    showError(elementId, title, message, actionButton = null) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const actionHtml = actionButton ? `
            <button class="btn btn-primary" onclick="${actionButton.onclick}">
                ${actionButton.text}
            </button>
        ` : '';
        
        element.innerHTML = `
            <div class="error-state">
                <div class="error-state-icon">❌</div>
                <div class="error-state-title">${title}</div>
                <div class="error-state-message">${message}</div>
                ${actionHtml}
            </div>
        `;
    },

    // Zobrazení prázdného stavu
    showEmpty(elementId, title, message, actionButton = null) {
        const element = document.getElementById(elementId);
        if (!element) return;
        
        const actionHtml = actionButton ? `
            <button class="btn btn-primary" onclick="${actionButton.onclick}">
                ${actionButton.text}
            </button>
        ` : '';
        
        element.innerHTML = `
            <div class="empty-state">
                <div class="empty-state-icon">📭</div>
                <div class="empty-state-title">${title}</div>
                <div class="empty-state-message">${message}</div>
                ${actionHtml}
            </div>
        `;
    },

    // Vytvoření rating hvězdiček
    createStarRating(rating, maxStars = 5) {
        const fullStars = Math.floor(rating);
        const hasHalfStar = rating % 1 >= 0.5;
        const emptyStars = maxStars - fullStars - (hasHalfStar ? 1 : 0);
        
        let stars = '';
        
        // Plné hvězdičky
        for (let i = 0; i < fullStars; i++) {
            stars += '⭐';
        }
        
        // Poloviční hvězdička
        if (hasHalfStar) {
            stars += '✨';
        }
        
        // Prázdné hvězdičky
        for (let i = 0; i < emptyStars; i++) {
            stars += '☆';
        }
        
        return `<span class="rating-stars" title="${rating}/${maxStars}">${stars}</span>`;
    },

    // Vytvoření progress baru
    createProgressBar(value, max, label = '') {
        const percentage = Math.min((value / max) * 100, 100);
        
        return `
            <div class="progress-bar">
                <div class="progress-bar-label">${label}</div>
                <div class="progress-bar-track">
                    <div class="progress-bar-fill" style="width: ${percentage}%"></div>
                </div>
                <div class="progress-bar-text">${utils.formatNumber(value)} / ${utils.formatNumber(max)}</div>
            </div>
        `;
    },

    // Vytvoření karty události
    createEventCard(event, type = 'default') {
        const cardClass = type === 'upcoming' ? 'event-card upcoming' : 
                         type === 'completed' ? 'event-card completed' : 'event-card';
        
        const rating = event.rating > 0 ? this.createStarRating(event.rating) : '';
        const sales = event.sales > 0 ? `${utils.formatNumber(event.sales)} 🍩` : 'Bez dat';
        const revenue = event.sales > 0 ? utils.formatCurrency(event.sales * (event.price || 50)) : '';
        
        return `
            <div class="${cardClass}">
                <div class="event-header">
                    <div class="event-title">${utils.escapeHtml(event.name)}</div>
                    <div class="event-date">${utils.formatDate(event.date)}</div>
                </div>
                <div class="event-details">
                    <div class="event-detail">
                        <div class="event-detail-value">📍</div>
                        <div class="event-detail-label">${utils.escapeHtml(event.city)}</div>
                    </div>
                    <div class="event-detail">
                        <div class="event-detail-value">${sales}</div>
                        <div class="event-detail-label">Prodáno</div>
                    </div>
                    ${revenue ? `
                    <div class="event-detail">
                        <div class="event-detail-value">${revenue}</div>
                        <div class="event-detail-label">Obrat</div>
                    </div>
                    ` : ''}
                    ${rating ? `
                    <div class="event-detail">
                        <div class="event-detail-value">${rating}</div>
                        <div class="event-detail-label">Hodnocení</div>
                    </div>
                    ` : ''}
                    ${event.visitors ? `
                    <div class="event-detail">
                        <div class="event-detail-value">${utils.formatNumber(event.visitors)}</div>
                        <div class="event-detail-label">Návštěvníků</div>
                    </div>
                    ` : ''}
                </div>
                ${event.notes ? `
                <div class="event-notes">
                    <em>${utils.escapeHtml(event.notes)}</em>
                </div>
                ` : ''}
            </div>
        `;
    },

    // Vytvoření analýzy karty
    createAnalysisCard(item, index, type = 'default') {
        const isTop = index < 3;
        const cardClass = isTop ? 'analysis-card top' : 'analysis-card';
        
        let valueDisplay, subValueDisplay;
        
        if (type === 'city') {
            valueDisplay = `${Math.round(item.avgSales)} 🍩/akci`;
            subValueDisplay = `Celkem: ${item.totalSales} 🍩`;
        } else {
            valueDisplay = `${item.sales} 🍩`;
            subValueDisplay = utils.formatCurrency(item.sales * 50);
        }
        
        const rating = item.rating > 0 ? ` | ${this.createStarRating(item.rating)}` : '';
        
        return `
            <div class="${cardClass}">
                <div class="analysis-info">
                    <div class="analysis-name">${index + 1}. ${utils.escapeHtml(item.name)}</div>
                    <div class="analysis-details">
                        📍 ${utils.escapeHtml(item.city || item.location || '')}
                        ${item.events ? ` | ${item.events} ${item.events === 1 ? 'akce' : item.events < 5 ? 'akce' : 'akcí'}` : ''}
                        ${rating}
                    </div>
                </div>
                <div class="analysis-results">
                    <div class="analysis-value">${valueDisplay}</div>
                    <div class="analysis-subvalue">${subValueDisplay}</div>
                </div>
            </div>
        `;
    },

    // Aktualizace formulářových polí podle business modelu
    updateBusinessModelInfo(model) {
        const infoDiv = document.getElementById('businessModelInfo');
        if (!infoDiv) return;
        
        if (!model) {
            infoDiv.style.display = 'none';
            return;
        }
        
        const models = {
            'owner': {
                description: '🏪 <strong>Majitel:</strong> Vy + 2 brigádníci',
                details: `Náklady na mzdy: 2 × ${CONFIG.HOURLY_WAGE} Kč/h × ${CONFIG.WORK_HOURS}h = ${2 * CONFIG.HOURLY_WAGE * CONFIG.WORK_HOURS} Kč`,
                profit: '100% zisku po odečtení všech nákladů'
            },
            'employee': {
                description: '👨‍💼 <strong>Zaměstnanec:</strong> Vy + 1 brigádník + 5% z obratu',
                details: `Náklady: Vaše mzda (${CONFIG.HOURLY_WAGE} Kč/h × ${CONFIG.WORK_HOURS}h) + brigádník (${CONFIG.HOURLY_WAGE} Kč/h × ${CONFIG.WORK_HOURS}h) + 5% z obratu`,
                profit: 'Fixní mzda bez účasti na zisku'
            },
            'franchise': {
                description: '🤝 <strong>Franšízant:</strong> Nákup donutů za 52 Kč/ks',
                details: `Váš zisk: ${CONFIG.FRANCHISE_PRICE - CONFIG.DONUT_COST} Kč na donut`,
                profit: 'Franšízant hradí nájem a mzdy'
            }
        };
        
        const modelInfo = models[model];
        if (modelInfo) {
            infoDiv.innerHTML = `
                <div style="padding: 15px;">
                    <div>${modelInfo.description}</div>
                    <div style="margin: 8px 0; font-size: 0.9em; color: #666;">${modelInfo.details}</div>
                    <div style="font-size: 0.9em; color: #28a745;"><strong>${modelInfo.profit}</strong></div>
                </div>
            `;
            infoDiv.style.display = 'block';
        }
    },

    // Aktualizace vstupních polí pro nájem
    updateRentInputs(rentType) {
        const groups = ['fixedRentGroup', 'percentageRentGroup', 'mixedFixedGroup', 'mixedPercentageGroup'];
        
        // Skrytí všech skupin
        groups.forEach(id => {
            const element = document.getElementById(id);
            if (element) element.style.display = 'none';
        });
        
    // Aktualizace vstupních polí pro nájem
    updateRentInputs(rentType) {
        const groups = ['fixedRentGroup', 'percentageRentGroup', 'mixedFixedGroup', 'mixedPercentageGroup'];
        
        // Skrytí všech skupin
        groups.forEach(id => {
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
            case 'free':
                // Žádné další pole není potřeba
                break;
        }
    },

    // Validace formuláře
    validateForm() {
        const requiredFields = [
            { id: 'eventName', name: 'Název akce' },
            { id: 'eventCategory', name: 'Kategorie akce' },
            { id: 'eventCity', name: 'Město akce' },
            { id: 'eventDate', name: 'Datum akce' },
            { id: 'expectedVisitors', name: 'Očekávaná návštěvnost' },
            { id: 'competition', name: 'Konkurence' },
            { id: 'businessModel', name: 'Business model' },
            { id: 'rentType', name: 'Typ nájmu' }
        ];

        const errors = [];

        for (const field of requiredFields) {
            const element = document.getElementById(field.id);
            if (!element || !element.value.trim()) {
                errors.push(field.name);
                if (element) {
                    element.style.borderColor = '#dc3545';
                }
            } else {
                if (element) {
                    element.style.borderColor = '#e9ecef';
                }
            }
        }

        // Validace nákladů podle typu nájmu
        const rentType = document.getElementById('rentType').value;
        if (rentType) {
            switch(rentType) {
                case 'fixed':
                    const fixedRent = document.getElementById('fixedRent');
                    if (!fixedRent.value || parseFloat(fixedRent.value) < 0) {
                        errors.push('Fixní nájem musí být zadán');
                        fixedRent.style.borderColor = '#dc3545';
                    }
                    break;
                case 'percentage':
                    const percentageRent = document.getElementById('percentageRent');
                    if (!percentageRent.value || parseFloat(percentageRent.value) < 0 || parseFloat(percentageRent.value) > 100) {
                        errors.push('% z obratu musí být 0-100');
                        percentageRent.style.borderColor = '#dc3545';
                    }
                    break;
                case 'mixed':
                    const mixedFixed = document.getElementById('mixedFixed');
                    const mixedPercentage = document.getElementById('mixedPercentage');
                    if (!mixedFixed.value || parseFloat(mixedFixed.value) < 0) {
                        errors.push('Fixní část nájmu musí být zadána');
                        mixedFixed.style.borderColor = '#dc3545';
                    }
                    if (!mixedPercentage.value || parseFloat(mixedPercentage.value) < 0 || parseFloat(mixedPercentage.value) > 100) {
                        errors.push('% část nájmu musí být 0-100');
                        mixedPercentage.style.borderColor = '#dc3545';
                    }
                    break;
            }
        }

        // Validace čísla návštěvníků
        const visitors = document.getElementById('expectedVisitors');
        if (visitors && visitors.value && parseInt(visitors.value) < 50) {
            errors.push('Návštěvnost musí být alespoň 50');
            visitors.style.borderColor = '#dc3545';
        }

        // Validace data (nesmí být v minulosti)
        const eventDate = document.getElementById('eventDate');
        if (eventDate && eventDate.value) {
            const selectedDate = new Date(eventDate.value);
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            
            if (selectedDate < today) {
                errors.push('Datum akce nemůže být v minulosti');
                eventDate.style.borderColor = '#dc3545';
            }
        }

        return errors;
    },

    // Zobrazení výsledků predikce
    displayPredictionResults(prediction, businessResults, eventData) {
        const resultsDiv = document.getElementById('predictionResults');
        if (!resultsDiv) return;

        const isProfit = businessResults.profit > 0;
        const profitClass = isProfit ? 'positive' : 'negative';
        
        // Breakdown nákladů podle business modelu
        let costsBreakdown;
        
        if (eventData.businessModel === 'franchise') {
            costsBreakdown = `
                <div class="cost-item">
                    <span>🏪 Váš zisk z franšízy:</span>
                    <span><strong>${utils.formatCurrency(businessResults.franchiseProfit)}</strong></span>
                </div>
                <div class="cost-item">
                    <span>📦 Prodej donutů franšízantovi (${prediction.predictedSales} × ${CONFIG.FRANCHISE_PRICE} Kč):</span>
                    <span>${utils.formatCurrency(prediction.predictedSales * CONFIG.FRANCHISE_PRICE)}</span>
                </div>
            `;
        } else {
            costsBreakdown = `
                <div class="cost-item">
                    <span>📦 Výroba donutů (${prediction.predictedSales} × ${CONFIG.DONUT_COST} Kč):</span>
                    <span>${utils.formatCurrency(businessResults.costs.production)}</span>
                </div>
                <div class="cost-item">
                    <span>🚚 Doprava (${eventData.distance} km × 2 × ${CONFIG.FUEL_COST_PER_KM} Kč/km):</span>
                    <span>${utils.formatCurrency(businessResults.costs.transport)}</span>
                </div>
                <div class="cost-item">
                    <span>👥 Mzdy (${CONFIG.WORK_HOURS}h):</span>
                    <span>${utils.formatCurrency(businessResults.costs.labor)}</span>
                </div>
                ${businessResults.costs.revenueShare > 0 ? `
                <div class="cost-item">
                    <span>📈 Podíl z obratu (5%):</span>
                    <span>${utils.formatCurrency(businessResults.costs.revenueShare)}</span>
                </div>
                ` : ''}
                <div class="cost-item">
                    <span>🏪 Nájem ${this.getRentDescription(eventData)}:</span>
                    <span>${utils.formatCurrency(businessResults.costs.rent)}</span>
                </div>
                <div class="cost-item">
                    <span><strong>📊 Celkové náklady:</strong></span>
                    <span><strong>${utils.formatCurrency(businessResults.costs.total)}</strong></span>
                </div>
            `;
        }
        
        // Doporučení
        const recommendations = this.generateRecommendations(prediction, businessResults, eventData);
        
        resultsDiv.innerHTML = `
            <div class="results-grid">
                <div class="result-item">
                    <div class="result-value">${utils.formatNumber(prediction.predictedSales)}</div>
                    <div class="result-label">🍩 Doporučené množství donutů</div>
                </div>
                
                <div class="result-item">
                    <div class="result-value">${utils.formatCurrency(businessResults.revenue)}</div>
                    <div class="result-label">💰 Očekávaný obrat</div>
                </div>
                
                <div class="result-item">
                    <div class="result-value ${profitClass}">${utils.formatCurrency(businessResults.profit)}</div>
                    <div class="result-label">📊 ${eventData.businessModel === 'franchise' ? 'Váš zisk' : 'Čistý zisk'}</div>
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
                    <div class="result-value">${utils.formatCurrency(businessResults.revenue / prediction.predictedSales)}</div>
                    <div class="result-label">💱 Průměrná cena za donut</div>
                </div>
            </div>
            
            <div class="costs-breakdown">
                <h4>💰 Rozpis nákladů</h4>
                ${costsBreakdown}
            </div>
            
            ${recommendations.length > 0 ? `
            <div class="recommendations">
                <h4>💡 Doporučení</h4>
                <ul>
                    ${recommendations.map(rec => `<li>${rec}</li>`).join('')}
                </ul>
            </div>
            ` : ''}
            
            <div style="margin-top: 20px; text-align: center;">
                <button class="btn btn-success" onclick="predictor.savePrediction()">
                    💾 Uložit predikci do Google Sheets
                </button>
                <button class="btn btn-secondary" onclick="predictor.exportPrediction()" style="margin-left: 10px;">
                    📄 Export do PDF
                </button>
            </div>
        `;
    },

    // Generování doporučení
    generateRecommendations(prediction, businessResults, eventData) {
        const recommendations = [];
        
        // Finanční doporučení
        if (businessResults.profit <= 0) {
            recommendations.push('🚨 Záporný zisk! Zvyšte cenu donutů nebo snižte náklady');
        } else if (businessResults.profitMargin < 15) {
            recommendations.push('⚠️ Nízká marže. Doporučujeme zvýšit cenu o 5-10 Kč na donut');
        }
        
        // Počasí doporučení
        const cacheKey = `${eventData.city}-${eventData.date}`;
        const weather = globalData.weatherCache.get(cacheKey);
        if (weather) {
            if (weather.temp > 25) {
                recommendations.push('🌡️ Vysoké teploty: Připravte chladící zařízení pro čokoládové polevy');
            }
            if (weather.main === 'Rain' || weather.main === 'Drizzle') {
                recommendations.push('🌧️ Déšť v předpovědi: Snižte objednávku o 30-50% a připravte krytí');
            }
            if (weather.temp < 5) {
                recommendations.push('🥶 Nízké teploty: Očekávejte nižší návštěvnost, připravte horké nápoje');
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
        
        // Konkurence doporučení
        if (eventData.competition == 3) {
            recommendations.push('⚔️ Velká konkurence: Zaměřte se na jedinečnost a kvalitu, zvažte speciální nabídky');
        }
        
        // Nájem doporučení
        if (businessResults.costs.rent > businessResults.revenue * 0.25) {
            recommendations.push('🏪 Vysoký nájem: Nájem přesahuje 25% obratu, vyjednejte lepší podmínky');
        }
        
        if (eventData.rentType === 'percentage' && eventData.percentageRent > 20) {
            recommendations.push('📊 Vysoké % z obratu: Zvažte fixní nájem pokud očekáváte vysoký obrat');
        }
        
        return recommendations;
    },

    // Popis typu nájmu pro zobrazení
    getRentDescription(eventData) {
        switch(eventData.rentType) {
            case 'fixed':
                return `(fixní ${utils.formatCurrency(eventData.fixedRent)})`;
            case 'percentage':
                return `(${eventData.percentageRent}% z obratu)`;
            case 'mixed':
                return `(${utils.formatCurrency(eventData.mixedFixed)} + ${eventData.mixedPercentage}% z obratu)`;
            case 'free':
                return '(zdarma)';
            default:
                return '';
        }
    },

    // Zobrazení historických dat pro akci
    displayHistoricalInsights(historicalData) {
        const insightsDiv = document.getElementById('historicalInsights');
        const dataDiv = document.getElementById('historicalData');
        
        if (!insightsDiv || !dataDiv) return;
        
        if (!historicalData.matches || historicalData.matches.length === 0) {
            insightsDiv.style.display = 'none';
            return;
        }
        
        const { matches, summary } = historicalData;
        
        // Zobrazení shrnutí
        let summaryHtml = '';
        if (summary) {
            summaryHtml = `
                <div class="historical-summary">
                    <h4>📊 Shrnutí z ${summary.count} podobných akcí:</h4>
                    <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 15px; margin-top: 10px;">
                        <div style="text-align: center;">
                            <div style="font-size: 1.5em; font-weight: bold; color: #28a745;">${summary.avgSales}</div>
                            <div style="color: #666;">Průměr donutů</div>
                        </div>
                        <div style="text-align: center;">
                            <div style="font-size: 1.5em; font-weight: bold; color: #2196f3;">${summary.totalSales}</div>
                            <div style="color: #666;">Celkem prodáno</div>
                        </div>
                        ${summary.avgRating > 0 ? `
                        <div style="text-align: center;">
                            <div style="font-size: 1.5em; font-weight: bold;">${this.createStarRating(summary.avgRating)}</div>
                            <div style="color: #666;">Průměrné hodnocení</div>
                        </div>
                        ` : ''}
                        ${summary.avgVisitors > 0 ? `
                        <div style="text-align: center;">
                            <div style="font-size: 1.5em; font-weight: bold; color: #ff9800;">${utils.formatNumber(summary.avgVisitors)}</div>
                            <div style="color: #666;">Průměr návštěvníků</div>
                        </div>
                        ` : ''}
                    </div>
                </div>
            `;
        }
        
        // Zobrazení jednotlivých záznamů (max 5)
        const displayMatches = matches.slice(0, 5);
        const matchesHtml = displayMatches.map(match => {
            const salesColumn = utils.findColumn([match], ['realně prodáno', 'N'])[0] || 'N';
            const ratingColumn = utils.findColumn([match], ['hodnocení akce 1-5', 'X'])[0] || 'X';
            const dateColumn = utils.findColumn([match], ['Datum', 'B'])[0] || 'B';
            const notesColumn = utils.findColumn([match], ['poznámka', 'Y'])[0] || 'Y';
            
            const sales = parseInt(match[salesColumn] || 0);
            const rating = parseFloat(match[ratingColumn] || 0);
            const date = match[dateColumn] || '';
            const notes = match[notesColumn] || '';
            
            return `
                <div class="historical-item">
                    <div style="display: flex; justify-content: space-between; align-items: center;">
                        <div>
                            <strong>${utils.escapeHtml(match['Název akce'] || match['D'] || 'Neznámá akce')}</strong>
                            <div style="font-size: 0.9em; color: #666;">
                                📅 ${date} | 📍 ${utils.escapeHtml(match['Lokalita'] || match['C'] || 'Neznámé město')}
                            </div>
                            ${notes ? `<div style="font-size: 0.8em; color: #999; margin-top: 5px;"><em>${utils.escapeHtml(notes)}</em></div>` : ''}
                        </div>
                        <div style="text-align: right;">
                            <div style="font-size: 1.2em; font-weight: bold; color: #28a745;">${sales} 🍩</div>
                            ${rating > 0 ? `<div>${this.createStarRating(rating)}</div>` : ''}
                        </div>
                    </div>
                </div>
            `;
        }).join('');
        
        dataDiv.innerHTML = summaryHtml + matchesHtml;
        
        if (matches.length > 5) {
            dataDiv.innerHTML += `
                <div style="text-align: center; margin-top: 15px; color: #666;">
                    ... a ${matches.length - 5} dalších podobných akcí
                </div>
            `;
        }
        
        insightsDiv.style.display = 'block';
    }
};
