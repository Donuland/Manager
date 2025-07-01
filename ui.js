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
        
        console.log(`Notifikace [${type}]: ${message}`);
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

    // Vytvoření karty události
    createEventCard(event, type = 'default') {
        const cardClass = type === 'upcoming' ? 'event-card upcoming' : 
                         type === 'completed' ? 'event-card completed' : 'event-card';
        
        const rating = event.rating > 0 ? this.createStarRating(event.rating) : '';
        const sales = event.sales > 0 ? `${this.formatNumber(event.sales)} 🍩` : 'Bez dat';
        const revenue = event.sales > 0 ? this.formatCurrency(event.sales * (event.price || 50)) : '';
        
        return `
            <div class="${cardClass}">
                <div class="event-header">
                    <div class="event-title">${this.escapeHtml(event.name)}</div>
                    <div class="event-date">${this.formatDate(event.date)}</div>
                </div>
                <div class="event-details">
                    <div class="event-detail">
                        <div class="event-detail-value">📍</div>
                        <div class="event-detail-label">${this.escapeHtml(event.city)}</div>
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
                        <div class="event-detail-value">${this.formatNumber(event.visitors)}</div>
                        <div class="event-detail-label">Návštěvníků</div>
                    </div>
                    ` : ''}
                </div>
                ${event.notes ? `
                <div class="event-notes">
                    <em>${this.escapeHtml(event.notes)}</em>
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
            subValueDisplay = this.formatCurrency(item.sales * 50);
        }
        
        const rating = item.rating > 0 ? ` | ${this.createStarRating(item.rating)}` : '';
        
        return `
            <div class="${cardClass}">
                <div class="analysis-info">
                    <div class="analysis-name">${index + 1}. ${this.escapeHtml(item.name)}</div>
                    <div class="analysis-details">
                        📍 ${this.escapeHtml(item.city || item.location || '')}
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
                details: `Náklady na mzdy: 2 × 150 Kč/h × 10h = 3000 Kč`,
                profit: '100% zisku po odečtení všech nákladů'
            },
            'employee': {
                description: '👨‍💼 <strong>Zaměstnanec:</strong> Vy + 1 brigádník + 5% z obratu',
                details: `Náklady: Vaše mzda (150 Kč/h × 10h) + brigádník (150 Kč/h × 10h) + 5% z obratu`,
                profit: 'Fixní mzda bez účasti na zisku'
            },
            'franchise': {
                description: '🤝 <strong>Franšízant:</strong> Nákup donutů za 52 Kč/ks',
                details: `Váš zisk: 20 Kč na donut`,
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
        
        // Zobrazení relevantních skupin
        switch(rentType) {
            case 'fixed':
                const fixedGroup = document.getElementById('fixedRentGroup');
                if (fixedGroup) fixedGroup.style.display = 'block';
                break;
            case 'percentage':
                const percentageGroup = document.getElementById('percentageRentGroup');
                if (percentageGroup) percentageGroup.style.display = 'block';
                break;
            case 'mixed':
                const mixedFixedGroup = document.getElementById('mixedFixedGroup');
                const mixedPercentageGroup = document.getElementById('mixedPercentageGroup');
                if (mixedFixedGroup) mixedFixedGroup.style.display = 'block';
                if (mixedPercentageGroup) mixedPercentageGroup.style.display = 'block';
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
                    if (fixedRent && (!fixedRent.value || parseFloat(fixedRent.value) < 0)) {
                        errors.push('Fixní nájem musí být zadán');
                        fixedRent.style.borderColor = '#dc3545';
                    }
                    break;
                case 'percentage':
                    const percentageRent = document.getElementById('percentageRent');
                    if (percentageRent && (!percentageRent.value || parseFloat(percentageRent.value) < 0 || parseFloat(percentageRent.value) > 100)) {
                        errors.push('% z obratu musí být 0-100');
                        percentageRent.style.borderColor = '#dc3545';
                    }
                    break;
                case 'mixed':
                    const mixedFixed = document.getElementById('mixedFixed');
                    const mixedPercentage = document.getElementById('mixedPercentage');
                    if (mixedFixed && (!mixedFixed.value || parseFloat(mixedFixed.value) < 0)) {
                        errors.push('Fixní část nájmu musí být zadána');
                        mixedFixed.style.borderColor = '#dc3545';
                    }
                    if (mixedPercentage && (!mixedPercentage.value || parseFloat(mixedPercentage.value) < 0 || parseFloat(mixedPercentage.value) > 100)) {
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

    // Helper funkce pro formátování
    formatNumber(number) {
        return new Intl.NumberFormat('cs-CZ').format(number);
    },

    formatCurrency(amount) {
        return new Intl.NumberFormat('cs-CZ', {
            style: 'currency',
            currency: 'CZK',
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }).format(amount);
    },

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

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
};
