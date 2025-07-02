// ========================================
// DONULAND MANAGEMENT SYSTEM - OPRAVENÁ NAVIGACE
// Navigační systém s opravenými funkcemi
// ========================================

const navigation = {
    // Zobrazení konkrétní sekce
    showSection(sectionId) {
        debug('📋 Zobrazuji sekci:', sectionId);
        
        // Skrytí všech sekcí
        document.querySelectorAll('.section').forEach(section => {
            section.classList.remove('active');
        });
        
        // Zobrazení cílové sekce
        const targetSection = document.getElementById(sectionId);
        if (targetSection) {
            targetSection.classList.add('active');
        } else {
            debugError('Sekce nenalezena:', sectionId);
            return;
        }
        
        // Aktivní stav navigace
        document.querySelectorAll('.nav-item').forEach(item => {
            item.classList.remove('active');
        });
        
        // Najdeme a aktivujeme odpovídající navigační položku
        const navItems = document.querySelectorAll('.nav-item');
        navItems.forEach(item => {
            const onclick = item.getAttribute('onclick');
            if (onclick && onclick.includes(`'${sectionId}'`)) {
                item.classList.add('active');
            }
        });
        
        // Načtení dat pro konkrétní sekci
        this.loadSectionData(sectionId);
        
        // Aktualizace URL hash
        window.location.hash = sectionId;
    },

    // Načtení dat pro konkrétní sekci
    loadSectionData(sectionId) {
        switch(sectionId) {
            case 'prediction':
                this.initializePredictionSection();
                break;
                
            case 'analysis':
                if (window.donulandApp.data.historicalData.length > 0) {
                    if (typeof analysis !== 'undefined') {
                        analysis.loadAnalysisData();
                    }
                } else {
                    this.showLoadingForSection('analysis');
                    this.autoLoadDataAndThen(() => {
                        if (typeof analysis !== 'undefined') {
                            analysis.loadAnalysisData();
                        }
                    });
                }
                break;
                
            case 'calendar':
                if (window.donulandApp.data.historicalData.length > 0) {
                    if (typeof analysis !== 'undefined') {
                        analysis.loadCalendarData();
                    }
                } else {
                    this.showLoadingForSection('calendar');
                    this.autoLoadDataAndThen(() => {
                        if (typeof analysis !== 'undefined') {
                            analysis.loadCalendarData();
                        }
                    });
                }
                break;
                
            case 'settings':
                // Nastavení - žádné speciální načítání
                break;
                
            default:
                debugWarn('Neznámá sekce:', sectionId);
        }
    },

    // Zobrazení loading stavu pro sekci
    showLoadingForSection(sectionId) {
        const loadingElements = {
            'analysis': ['overallStats', 'topEvents', 'topCities', 'categoryAnalysis'],
            'calendar': ['upcomingEvents', 'recentEvents']
        };

        const elements = loadingElements[sectionId] || [];
        elements.forEach(elementId => {
            if (typeof ui !== 'undefined') {
                ui.showLoading(elementId, 'Načítám data...');
            }
        });
    },

    // Automatické načtení dat a poté spuštění callbacku
    autoLoadDataAndThen(callback) {
        if (typeof loadDataFromSheets !== 'undefined') {
            loadDataFromSheets()
                .then(() => {
                    if (callback) callback();
                })
                .catch((error) => {
                    debugError('Chyba při automatickém načítání dat:', error);
                    if (callback) callback(); // Spustíme callback i při chybě
                });
        }
    },

    // Inicializace sekce predikce
    initializePredictionSection() {
        this.setDefaultFormValues();
        
        // Kontrola, zda máme data pro autocomplete
        if (window.donulandApp.data.historicalData.length === 0) {
            debug('🔄 Automaticky načítám data pro autocomplete...');
            this.autoLoadDataAndThen(() => {
                debug('✅ Data načtena pro autocomplete');
            });
        }
    },

    // Nastavení výchozích hodnot formuláře
    setDefaultFormValues() {
        // Nastavení zítřejšího data pokud není nastaveno
        const dateInput = document.getElementById('eventDate');
        if (dateInput && !dateInput.value) {
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1);
            const tomorrowStr = tomorrow.toISOString().split('T')[0];
            dateInput.value = tomorrowStr;
            
            // Nastavení minimálního data na dnes
            const today = new Date().toISOString().split('T')[0];
            dateInput.min = today;
        }

        // Nastavení výchozí ceny donutu pokud není nastavena
        const priceInput = document.getElementById('donutPrice');
        if (priceInput && !priceInput.value) {
            priceInput.value = window.donulandApp.config.DONUT_PRICE;
        }

        // Nastavení výchozí délky akce
        const durationSelect = document.getElementById('eventDuration');
        if (durationSelect && !durationSelect.value) {
            durationSelect.value = '1';
        }
    },

    // Kontrola změn v formuláři a automatické ukládání
    setupFormAutoSave() {
        const formElements = [
            'eventName', 'eventCategory', 'eventCity', 'eventDate',
            'expectedVisitors', 'eventDuration', 'competition',
            'businessModel', 'rentType', 'donutPrice'
        ];

        formElements.forEach(elementId => {
            const element = document.getElementById(elementId);
            if (element) {
                // Debounced funkce pro automatické ukládání
                const debouncedSave = this.debounce(() => {
                    this.saveFormData();
                }, 1000);

                element.addEventListener('input', debouncedSave);
                element.addEventListener('change', debouncedSave);
            }
        });
    },

    // Uložení dat formuláře do localStorage
    saveFormData() {
        try {
            const formData = {
                eventName: document.getElementById('eventName')?.value || '',
                eventCategory: document.getElementById('eventCategory')?.value || '',
                eventCity: document.getElementById('eventCity')?.value || '',
                eventDate: document.getElementById('eventDate')?.value || '',
                expectedVisitors: document.getElementById('expectedVisitors')?.value || '',
                eventDuration: document.getElementById('eventDuration')?.value || '',
                competition: document.getElementById('competition')?.value || '',
                businessModel: document.getElementById('businessModel')?.value || '',
                rentType: document.getElementById('rentType')?.value || '',
                donutPrice: document.getElementById('donutPrice')?.value || '',
                timestamp: Date.now()
            };

            this.setWithTTL('donuland_form_data', formData, 24 * 60 * 60 * 1000); // 24 hodin
            debug('💾 Data formuláře automaticky uložena');

        } catch (error) {
            debugWarn('Chyba při automatickém ukládání:', error);
        }
    },

    // Načtení dat formuláře z localStorage
    loadFormData() {
        try {
            const formData = this.getWithTTL('donuland_form_data');
            if (!formData) return;

            // Obnovení hodnot pokud jsou elementy prázdné
            Object.entries(formData).forEach(([key, value]) => {
                if (key === 'timestamp') return;
                
                const element = document.getElementById(key);
                if (element && !element.value && value) {
                    element.value = value;
                    
                    // Trigger change event pro aktualizaci UI
                    element.dispatchEvent(new Event('change'));
                }
            });

            debug('🔄 Data formuláře obnovena z cache');

        } catch (error) {
            debugWarn('Chyba při načítání dat formuláře:', error);
        }
    },

    // Navigace pomocí klávesových zkratek
    setupKeyboardShortcuts() {
        document.addEventListener('keydown', (event) => {
            // Ctrl/Cmd + číslo pro přepínání sekcí
            if ((event.ctrlKey || event.metaKey) && !event.shiftKey && !event.altKey) {
                switch(event.key) {
                    case '1':
                        event.preventDefault();
                        this.showSection('prediction');
                        break;
                    case '2':
                        event.preventDefault();
                        this.showSection('analysis');
                        break;
                    case '3':
                        event.preventDefault();
                        this.showSection('calendar');
                        break;
                    case '4':
                        event.preventDefault();
                        this.showSection('settings');
                        break;
                    case 'r':
                        // Ctrl+R pro refresh dat
                        event.preventDefault();
                        if (typeof loadDataFromSheets !== 'undefined') {
                            loadDataFromSheets();
                        }
                        break;
                    case 's':
                        // Ctrl+S pro uložení predikce
                        event.preventDefault();
                        if (document.getElementById('prediction').classList.contains('active')) {
                            if (typeof predictor !== 'undefined' && predictor.savePrediction) {
                                predictor.savePrediction();
                            }
                        }
                        break;
                }
            }

            // Escape pro zavření notifikací
            if (event.key === 'Escape') {
                document.querySelectorAll('.notification').forEach(notification => {
                    notification.remove();
                });
            }
        });

        debug('⌨️ Klávesové zkratky aktivovány');
    },

    // Breadcrumbs navigace
    updateBreadcrumbs(sectionId) {
        const breadcrumbMap = {
            'prediction': ['🏠 Hlavní', '🤖 AI Predikce'],
            'analysis': ['🏠 Hlavní', '📊 Analýza akcí'],
            'calendar': ['🏠 Hlavní', '📅 Kalendář akcí'],
            'settings': ['🏠 Hlavní', '⚙️ Nastavení']
        };

        const breadcrumbs = breadcrumbMap[sectionId] || ['🏠 Hlavní'];
        
        // Aktualizace title stránky
        document.title = `${breadcrumbs[breadcrumbs.length - 1]} - Donuland Management System`;
    },

    // Detekce změn v URL hash
    setupHashNavigation() {
        window.addEventListener('hashchange', () => {
            const hash = window.location.hash.substring(1);
            if (hash && ['prediction', 'analysis', 'calendar', 'settings'].includes(hash)) {
                this.showSection(hash);
            }
        });

        // Načtení sekce podle hash při startu
        const initialHash = window.location.hash.substring(1);
        if (initialHash && ['prediction', 'analysis', 'calendar', 'settings'].includes(initialHash)) {
            // Delay pro zajištění, že DOM je připraven
            setTimeout(() => {
                this.showSection(initialHash);
            }, 100);
        }
    },

    // Mobile responsive menu
    setupMobileMenu() {
        // Na mobilních zařízeních přidáme tlačítko pro toggle menu
        if (window.innerWidth <= 768) {
            const sidebar = document.querySelector('.sidebar');
            if (sidebar) {
                sidebar.style.display = 'none';
                
                // Přidání mobile menu button do headeru
                const headerControls = document.querySelector('.header-controls');
                if (headerControls) {
                    const menuButton = document.createElement('button');
                    menuButton.className = 'btn btn-secondary mobile-menu-toggle';
                    menuButton.innerHTML = '📱 Menu';
                    menuButton.onclick = () => {
                        const isVisible = sidebar.style.display !== 'none';
                        sidebar.style.display = isVisible ? 'none' : 'block';
                        menuButton.innerHTML = isVisible ? '📱 Menu' : '✕ Zavřít';
                    };
                    
                    headerControls.insertBefore(menuButton, headerControls.firstChild);
                }
            }
        }
    },

    // Utility funkce - debounce
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

    // Inicializace navigačního systému
    init() {
        debug('🧭 Inicializuji navigační systém...');
        
        try {
            // Nastavení výchozích hodnot
            this.setDefaultFormValues();
            
            // Načtení uložených dat formuláře
            this.loadFormData();
            
            // Nastavení auto-save
            this.setupFormAutoSave();
            
            // Klávesové zkratky
            this.setupKeyboardShortcuts();
            
            // Hash navigace
            this.setupHashNavigation();
            
            // Mobile menu
            this.setupMobileMenu();
            
            // Nastavení globální funkce showSection pro kompatibilitu
            window.showSection = (sectionId) => this.showSection(sectionId);
            
            debug('✅ Navigační systém inicializován');
            
        } catch (error) {
            debugError('Chyba při inicializaci navigačního systému:', error);
        }
    }
};
