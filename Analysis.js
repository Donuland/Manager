// ========================================
// DONULAND MANAGEMENT SYSTEM - ANALYSIS
// Analýza dat a kalendář akcí
// ========================================

const analysis = {
    // Načtení a zobrazení analýzy dat
    async loadAnalysisData() {
        if (globalData.historicalData.length === 0) {
            this.showNoDataMessage();
            return;
        }

        debug('📊 Spouštím analýzu dat...');

        try {
            // Celkové statistiky
            this.displayOverallStats();
            
            // Nejúspěšnější akce
            this.displayTopEvents();
            
            // Nejlepší města
            this.displayTopCities();
            
            // Analýza podle kategorií
            this.displayCategoryAnalysis();

        } catch (error) {
            debugError('Chyba při analýze dat:', error);
            ui.showError('overallStats', 'Chyba při analýze', error.message);
        }
    },

    // Zobrazení zprávy o chybějících datech
    showNoDataMessage() {
        const sections = ['overallStats', 'topEvents', 'topCities', 'categoryAnalysis'];
        
        sections.forEach(sectionId => {
            ui.showEmpty(sectionId, 
                'Nejsou k dispozici žádná data',
                'Nejdříve načtěte historická data z Google Sheets',
                { text: '🔄 Načíst data nyní', onclick: 'dataManager.loadData()' }
            );
        });
    },

    // Celkové statistiky
    displayOverallStats() {
        try {
            const salesColumn = utils.findColumn(globalData.historicalData, ['realně prodáno', 'N']);
            const dateColumn = utils.findColumn(globalData.historicalData, ['Datum', 'B']);
            const ratingColumn = utils.findColumn(globalData.historicalData, ['hodnocení akce 1-5', 'X']);

            // Filtrování událostí s validními daty
            const validEvents = globalData.historicalData
                .filter(row => parseFloat(row[salesColumn] || 0) > 0);

            // Seskupení podle měst
            const cityStats = {};
            validEvents.forEach(row => {
                const city = (row[cityColumn] || 'Neznámé město').trim();
                const sales = parseFloat(row[salesColumn] || 0);
                const rating = parseFloat(row[ratingColumn] || 0);

                if (!cityStats[city]) {
                    cityStats[city] = { 
                        totalSales: 0, 
                        events: 0, 
                        totalRating: 0,
                        ratingCount: 0
                    };
                }

                cityStats[city].totalSales += sales;
                cityStats[city].events += 1;
                
                if (rating > 0) {
                    cityStats[city].totalRating += rating;
                    cityStats[city].ratingCount += 1;
                }
            });

            const topCities = Object.entries(cityStats)
                .map(([city, stats]) => ({
                    name: city.substring(0, 30),
                    city: city,
                    avgSales: Math.round(stats.totalSales / stats.events),
                    events: stats.events,
                    totalSales: stats.totalSales,
                    rating: stats.ratingCount > 0 ? stats.totalRating / stats.ratingCount : 0
                }))
                .filter(city => city.events >= 1) // Alespoň 1 akce
                .sort((a, b) => b.avgSales - a.avgSales)
                .slice(0, 10);

            if (topCities.length === 0) {
                ui.showEmpty('topCities', 'Žádná města s daty', 'Zatím nejsou k dispozici data o městech');
                return;
            }

            const citiesHtml = topCities.map((city, index) => 
                ui.createAnalysisCard(city, index, 'city')
            ).join('');

            document.getElementById('topCities').innerHTML = `
                <div style="max-height: 500px; overflow-y: auto;">
                    ${citiesHtml}
                </div>
            `;

        } catch (error) {
            debugError('Chyba při zobrazování top měst:', error);
            ui.showError('topCities', 'Chyba při analýze měst', error.message);
        }
    },

    // Analýza podle kategorií
    displayCategoryAnalysis() {
        try {
            const salesColumn = utils.findColumn(globalData.historicalData, ['realně prodáno', 'N']);
            const categoryColumn = utils.findColumn(globalData.historicalData, ['kategorie', 'E']);
            const ratingColumn = utils.findColumn(globalData.historicalData, ['hodnocení akce 1-5', 'X']);

            const validEvents = globalData.historicalData
                .filter(row => parseFloat(row[salesColumn] || 0) > 0);

            // Seskupení podle kategorií
            const categoryStats = {};
            validEvents.forEach(row => {
                const category = (row[categoryColumn] || 'Ostatní').trim();
                const sales = parseFloat(row[salesColumn] || 0);
                const rating = parseFloat(row[ratingColumn] || 0);

                if (!categoryStats[category]) {
                    categoryStats[category] = { 
                        totalSales: 0, 
                        events: 0, 
                        totalRating: 0,
                        ratingCount: 0
                    };
                }

                categoryStats[category].totalSales += sales;
                categoryStats[category].events += 1;
                
                if (rating > 0) {
                    categoryStats[category].totalRating += rating;
                    categoryStats[category].ratingCount += 1;
                }
            });

            const sortedCategories = Object.entries(categoryStats)
                .map(([category, stats]) => ({
                    name: category,
                    avgSales: Math.round(stats.totalSales / stats.events),
                    events: stats.events,
                    totalSales: stats.totalSales,
                    rating: stats.ratingCount > 0 ? stats.totalRating / stats.ratingCount : 0,
                    revenue: stats.totalSales * CONFIG.DONUT_PRICE
                }))
                .sort((a, b) => b.avgSales - a.avgSales);

            if (sortedCategories.length === 0) {
                ui.showEmpty('categoryAnalysis', 'Žádné kategorie s daty', 'Zatím nejsou k dispozici data o kategoriích');
                return;
            }

            const categoriesHtml = sortedCategories.map((category, index) => `
                <div class="analysis-card ${index < 3 ? 'top' : ''}">
                    <div class="analysis-info">
                        <div class="analysis-name">${index + 1}. ${utils.escapeHtml(category.name)}</div>
                        <div class="analysis-details">
                            ${category.events} ${category.events === 1 ? 'akce' : category.events < 5 ? 'akce' : 'akcí'}
                            ${category.rating > 0 ? ` | ${ui.createStarRating(category.rating)} (${category.rating.toFixed(1)})` : ''}
                        </div>
                    </div>
                    <div class="analysis-results">
                        <div class="analysis-value">${category.avgSales} 🍩/akci</div>
                        <div class="analysis-subvalue">Celkem: ${utils.formatNumber(category.totalSales)} 🍩</div>
                    </div>
                </div>
            `).join('');

            document.getElementById('categoryAnalysis').innerHTML = `
                <div style="max-height: 500px; overflow-y: auto;">
                    ${categoriesHtml}
                </div>
            `;

        } catch (error) {
            debugError('Chyba při zobrazování analýzy kategorií:', error);
            ui.showError('categoryAnalysis', 'Chyba při analýze kategorií', error.message);
        }
    },

    // Načtení kalendáře akcí
    loadCalendarData() {
        if (globalData.historicalData.length === 0) {
            ui.showEmpty('upcomingEvents', 'Nejsou k dispozici žádná data', 'Nejdříve načtěte data z Google Sheets');
            ui.showEmpty('recentEvents', 'Nejsou k dispozici žádná data', 'Nejdříve načtěte data z Google Sheets');
            return;
        }

        debug('📅 Načítám kalendář akcí...');

        try {
            this.displayUpcomingEvents();
            this.displayRecentEvents();
        } catch (error) {
            debugError('Chyba při načítání kalendáře:', error);
            ui.showError('upcomingEvents', 'Chyba při načítání kalendáře', error.message);
        }
    },

    // Nadcházející akce
    displayUpcomingEvents() {
        try {
            const dateColumn = utils.findColumn(globalData.historicalData, ['Datum', 'B']);
            const nameColumn = utils.findColumn(globalData.historicalData, ['Název akce', 'D']);
            const cityColumn = utils.findColumn(globalData.historicalData, ['Lokalita', 'C']);
            const categoryColumn = utils.findColumn(globalData.historicalData, ['kategorie', 'E']);
            const confirmedColumn = utils.findColumn(globalData.historicalData, ['POTVRZENO', 'F']);
            const visitorsColumn = utils.findColumn(globalData.historicalData, ['návstěvnost', 'Q']);

            const today = new Date();
            today.setHours(0, 0, 0, 0);

            const upcomingEvents = globalData.historicalData
                .filter(row => {
                    const dateStr = row[dateColumn] || '';
                    if (!dateStr.trim()) return false;
                    
                    // Pokus o parsování různých formátů data
                    let eventDate;
                    try {
                        // Zkusíme formát DD.MM.YYYY
                        if (dateStr.includes('.')) {
                            const parts = dateStr.split('.');
                            if (parts.length >= 3) {
                                eventDate = new Date(parts[2], parts[1] - 1, parts[0]);
                            }
                        } else {
                            eventDate = new Date(dateStr);
                        }
                        
                        return eventDate && eventDate >= today;
                    } catch (error) {
                        return false;
                    }
                })
                .map(row => {
                    const dateStr = row[dateColumn] || '';
                    let eventDate;
                    
                    if (dateStr.includes('.')) {
                        const parts = dateStr.split('.');
                        eventDate = new Date(parts[2], parts[1] - 1, parts[0]);
                    } else {
                        eventDate = new Date(dateStr);
                    }

                    return {
                        name: row[nameColumn] || 'Neznámá akce',
                        city: row[cityColumn] || 'Neznámé město',
                        date: eventDate,
                        category: row[categoryColumn] || '',
                        confirmed: row[confirmedColumn] === 'ANO',
                        visitors: parseFloat(row[visitorsColumn] || 0),
                        sales: 0, // Budoucí akce nemají prodeje
                        notes: ''
                    };
                })
                .sort((a, b) => a.date - b.date)
                .slice(0, 10);

            if (upcomingEvents.length === 0) {
                ui.showEmpty('upcomingEvents', 
                    'Žádné nadcházející akce', 
                    'V databázi nejsou žádné budoucí akce nebo není vyplněn sloupec s daty'
                );
                return;
            }

            const eventsHtml = upcomingEvents.map(event => {
                const daysDiff = Math.ceil((event.date - today) / (1000 * 60 * 60 * 24));
                const urgencyClass = daysDiff <= 7 ? ' style="border-left-color: #ff9800;"' : '';
                
                return `
                    <div class="event-card upcoming"${urgencyClass}>
                        <div class="event-header">
                            <div class="event-title">
                                ${utils.escapeHtml(event.name)}
                                ${!event.confirmed ? ' <span style="color: #ff9800;">⚠️ NEPOTVRZENO</span>' : ''}
                            </div>
                            <div class="event-date">
                                ${utils.formatDate(event.date)}
                                ${daysDiff <= 7 ? ` <span style="color: #ff9800;">(za ${daysDiff} ${daysDiff === 1 ? 'den' : daysDiff < 5 ? 'dny' : 'dní'})</span>` : ''}
                            </div>
                        </div>
                        <div class="event-details">
                            <div class="event-detail">
                                <div class="event-detail-value">📍</div>
                                <div class="event-detail-label">${utils.escapeHtml(event.city)}</div>
                            </div>
                            <div class="event-detail">
                                <div class="event-detail-value">📂</div>
                                <div class="event-detail-label">${utils.escapeHtml(event.category)}</div>
                            </div>
                            ${event.visitors > 0 ? `
                            <div class="event-detail">
                                <div class="event-detail-value">${utils.formatNumber(event.visitors)}</div>
                                <div class="event-detail-label">Očekávaní návštěvníci</div>
                            </div>
                            ` : ''}
                            <div class="event-detail">
                                <div class="event-detail-value">${event.confirmed ? '✅' : '❓'}</div>
                                <div class="event-detail-label">${event.confirmed ? 'Potvrzeno' : 'Nepotvrzeno'}</div>
                            </div>
                        </div>
                    </div>
                `;
            }).join('');

            document.getElementById('upcomingEvents').innerHTML = eventsHtml;

        } catch (error) {
            debugError('Chyba při zobrazování nadcházejících akcí:', error);
            ui.showError('upcomingEvents', 'Chyba při načítání nadcházejících akcí', error.message);
        }
    },

    // Nedávné akce s výsledky
    displayRecentEvents() {
        try {
            const dateColumn = utils.findColumn(globalData.historicalData, ['Datum', 'B']);
            const nameColumn = utils.findColumn(globalData.historicalData, ['Název akce', 'D']);
            const cityColumn = utils.findColumn(globalData.historicalData, ['Lokalita', 'C']);
            const salesColumn = utils.findColumn(globalData.historicalData, ['realně prodáno', 'N']);
            const ratingColumn = utils.findColumn(globalData.historicalData, ['hodnocení akce 1-5', 'X']);
            const visitorsColumn = utils.findColumn(globalData.historicalData, ['návstěvnost', 'Q']);
            const notesColumn = utils.findColumn(globalData.historicalData, ['poznámka', 'Y']);

            const today = new Date();
            const thirtyDaysAgo = new Date(today.getTime() - (30 * 24 * 60 * 60 * 1000));

            const recentEvents = globalData.historicalData
                .filter(row => {
                    const dateStr = row[dateColumn] || '';
                    const sales = parseFloat(row[salesColumn] || 0);
                    
                    if (!dateStr.trim() || sales <= 0) return false;
                    
                    let eventDate;
                    try {
                        if (dateStr.includes('.')) {
                            const parts = dateStr.split('.');
                            if (parts.length >= 3) {
                                eventDate = new Date(parts[2], parts[1] - 1, parts[0]);
                            }
                        } else {
                            eventDate = new Date(dateStr);
                        }
                        
                        return eventDate && eventDate >= thirtyDaysAgo && eventDate <= today;
                    } catch (error) {
                        return false;
                    }
                })
                .map(row => {
                    const dateStr = row[dateColumn] || '';
                    let eventDate;
                    
                    if (dateStr.includes('.')) {
                        const parts = dateStr.split('.');
                        eventDate = new Date(parts[2], parts[1] - 1, parts[0]);
                    } else {
                        eventDate = new Date(dateStr);
                    }

                    return {
                        name: row[nameColumn] || 'Neznámá akce',
                        city: row[cityColumn] || 'Neznámé město',
                        date: eventDate,
                        sales: parseFloat(row[salesColumn] || 0),
                        rating: parseFloat(row[ratingColumn] || 0),
                        visitors: parseFloat(row[visitorsColumn] || 0),
                        notes: row[notesColumn] || '',
                        price: CONFIG.DONUT_PRICE
                    };
                })
                .sort((a, b) => b.date - a.date)
                .slice(0, 10);

            if (recentEvents.length === 0) {
                ui.showEmpty('recentEvents', 
                    'Žádné nedávné akce s výsledky', 
                    'V posledních 30 dnech nebyly žádné akce s daty o prodeji'
                );
                return;
            }

            const eventsHtml = recentEvents.map(event => 
                ui.createEventCard(event, 'completed')
            ).join('');

            document.getElementById('recentEvents').innerHTML = eventsHtml;

        } catch (error) {
            debugError('Chyba při zobrazování nedávných akcí:', error);
            ui.showError('recentEvents', 'Chyba při načítání nedávných akcí', error.message);
        }
    }
};.filter(row => {
                const sales = parseFloat(row[salesColumn] || 0);
                return sales > 0;
            });

            const totalEvents = globalData.historicalData.length;
            const validEventsCount = validEvents.length;
            
            const totalSales = validEvents.reduce((sum, row) => 
                sum + parseFloat(row[salesColumn] || 0), 0
            );
            
            const avgSalesPerEvent = validEventsCount > 0 ? totalSales / validEventsCount : 0;
            const totalRevenue = totalSales * CONFIG.DONUT_PRICE;
            const totalProfit = totalSales * (CONFIG.DONUT_PRICE - CONFIG.DONUT_COST);

            // Nejlepší a nejhorší akce
            const sortedEvents = validEvents
                .map(row => parseFloat(row[salesColumn] || 0))
                .sort((a, b) => b - a);
            
            const bestEvent = sortedEvents[0] || 0;
            const worstEvent = sortedEvents[sortedEvents.length - 1] || 0;

            // Průměrné hodnocení
            const ratingsSum = validEvents.reduce((sum, row) => {
                const rating = parseFloat(row[ratingColumn] || 0);
                return sum + (rating > 0 ? rating : 0);
            }, 0);
            const ratingsCount = validEvents.filter(row => parseFloat(row[ratingColumn] || 0) > 0).length;
            const avgRating = ratingsCount > 0 ? ratingsSum / ratingsCount : 0;

            // Časové rozmezí dat
            const dates = globalData.historicalData
                .map(row => row[dateColumn])
                .filter(date => date && date.trim())
                .sort();

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
                        <div class="result-value">${utils.formatNumber(totalSales)}</div>
                        <div class="result-label">🍩 Celkem prodáno donutů</div>
                    </div>
                    <div class="result-item">
                        <div class="result-value">${Math.round(avgSalesPerEvent)}</div>
                        <div class="result-label">📊 Průměr donutů na akci</div>
                    </div>
                    <div class="result-item">
                        <div class="result-value">${utils.formatCurrency(totalRevenue)}</div>
                        <div class="result-label">💰 Celkový obrat</div>
                    </div>
                    <div class="result-item">
                        <div class="result-value">${utils.formatCurrency(totalProfit)}</div>
                        <div class="result-label">📈 Hrubý zisk</div>
                    </div>
                    <div class="result-item">
                        <div class="result-value">${utils.formatNumber(bestEvent)}</div>
                        <div class="result-label">🏆 Nejlepší akce</div>
                    </div>
                    <div class="result-item">
                        <div class="result-value">${avgRating > 0 ? ui.createStarRating(avgRating) : 'N/A'}</div>
                        <div class="result-label">⭐ Průměrné hodnocení</div>
                    </div>
                </div>
                
                ${dates.length > 0 ? `
                <div style="margin-top: 20px; text-align: center; color: #666;">
                    📈 Data od ${utils.formatDate(dates[0])} do ${utils.formatDate(dates[dates.length - 1])}
                </div>
                ` : ''}
            `;

        } catch (error) {
            debugError('Chyba při zobrazování celkových statistik:', error);
            ui.showError('overallStats', 'Chyba při výpočtu statistik', error.message);
        }
    },

    // Nejúspěšnější akce
    displayTopEvents() {
        try {
            const salesColumn = utils.findColumn(globalData.historicalData, ['realně prodáno', 'N']);
            const nameColumn = utils.findColumn(globalData.historicalData, ['Název akce', 'D']);
            const cityColumn = utils.findColumn(globalData.historicalData, ['Lokalita', 'C']);
            const dateColumn = utils.findColumn(globalData.historicalData, ['Datum', 'B']);
            const ratingColumn = utils.findColumn(globalData.historicalData, ['hodnocení akce 1-5', 'X']);
            const categoryColumn = utils.findColumn(globalData.historicalData, ['kategorie', 'E']);

            const validEvents = globalData.historicalData
                .filter(row => parseFloat(row[salesColumn] || 0) > 0)
                .map(row => ({
                    name: (row[nameColumn] || 'Neznámá akce').substring(0, 50),
                    city: (row[cityColumn] || 'Neznámé město').substring(0, 30),
                    date: row[dateColumn] || '',
                    sales: parseFloat(row[salesColumn] || 0),
                    rating: parseFloat(row[ratingColumn] || 0),
                    category: row[categoryColumn] || '',
                    revenue: parseFloat(row[salesColumn] || 0) * CONFIG.DONUT_PRICE
                }))
                .sort((a, b) => b.sales - a.sales)
                .slice(0, 10);

            if (validEvents.length === 0) {
                ui.showEmpty('topEvents', 'Žádné akce s validními daty', 'Zatím nejsou k dispozici data o prodeji');
                return;
            }

            const eventsHtml = validEvents.map((event, index) => 
                ui.createAnalysisCard(event, index, 'event')
            ).join('');

            document.getElementById('topEvents').innerHTML = `
                <div style="max-height: 500px; overflow-y: auto;">
                    ${eventsHtml}
                </div>
            `;

        } catch (error) {
            debugError('Chyba při zobrazování top akcí:', error);
            ui.showError('topEvents', 'Chyba při analýze akcí', error.message);
        }
    },

    // Nejlepší města
    displayTopCities() {
        try {
            const salesColumn = utils.findColumn(globalData.historicalData, ['realně prodáno', 'N']);
            const cityColumn = utils.findColumn(globalData.historicalData, ['Lokalita', 'C']);
            const ratingColumn = utils.findColumn(globalData.historicalData, ['hodnocení akce 1-5', 'X']);

            const validEvents = globalData.historicalData
