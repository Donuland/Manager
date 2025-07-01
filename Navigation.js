// ========================================
// DONULAND MANAGEMENT SYSTEM - NAVIGATION
// Navigační systém aplikace
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
        
        // Aktualizace URL hash (volitelné)
        window.location.hash = sectionId;
    },

    // Načtení dat pro konkrétní sekci
    loadSectionData(sectionId) {
        switch(sectionId) {
            case 'prediction':
                // Predikce - žádné speciální načítání
                this.initializePredictionSection();
                break;
                
            case 'analysis':
                // Analýza - načtení dat pokud jsou k dispozici
                if (globalData.historicalData.length > 0) {
                    analysis.loadAnalysisData();
                } else {
                    ui.showLoading('overallStats', 'Načítání dat...');
                    // Pokus o automatické načtení dat
                    dataManager.loadData().then(() => {
                        analysis.loadAnalysisData();
                    }).catch(() => {
                        analysis.loadAnalysisData(); // Zobrazí chybovou zprávu
                    });
                }
                break;
                
            case 'calendar':
                // Kalendář - načtení dat pokud jsou k dispozici
                if (globalData.historicalData.length > 0) {
                    analysis.loadCalendarData();
                } else {
                    ui.showLoading('upcomingEvents', 'Načítání dat...');
                    ui.showLoading('recentEvents', 'Načítání dat...');
                    // Pokus o automatické načtení dat
                    dataManager.loadData().then(() => {
                        analysis.loadCalendarData();
                    }).catch(() => {
                        analysis.loadCalendarData(); // Zobrazí chybovou zprávu
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

    // Inicializace sekce predikce
    initializePredictionSection() {
        // Nastavení výchozích hodnot pokud nejsou nastaveny
        this.setDefaultFormValues();
        
        // Kontrola, zda máme data pro autocomplete
        if (globalData.historicalData.length === 0) {
            debug('🔄 Automaticky načítám data pro autocomplete...');
            dataManager.loadData().catch(error => {
                debugWarn('Nepodařilo se načíst data pro autocomplete:', error);
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
            priceInput.value = CONFIG.DONUT_PRICE;
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
                const debouncedSave = utils.debounce(() => {
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
                eventName: document.getElementById('eventName').value,
                eventCategory: document.getElementById('eventCategory').value,
                eventCity: document.getElementById('eventCity').value,
                eventDate: document.getElementById('eventDate').value,
                expectedVisitors: document.getElementById('expectedVisitors').value,
                eventDuration: document.getElementById('eventDuration').value,
                competition: document.getElementById('competition').value,
                businessModel: document.getElementById('businessModel').value,
                rentType: document.getElementById('rentType').value,
                donutPrice: document.getElementById('donutPrice').value,
                timestamp: Date.now()
            };

            utils.setWithTTL('donuland_form_data', formData, 24 * 60 * 60 * 1000); // 24 hodin
            debug('💾 Data formuláře automaticky uložena');

        } catch (error) {
            debugWarn('Chyba při automatickém ukládání:', error);
        }
    },

    // Načtení dat formuláře z localStorage
    loadFormData() {
        try {
            const formData = utils.getWithTTL('donuland_form_data');
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
                        dataManager.refreshData();
                        break;
                    case 's':
                        // Ctrl+S pro uložení predikce
                        event.preventDefault();
                        if (document.getElementById('prediction').classList.contains('active')) {
                            predictor.savePrediction();
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

    // Inicializace navigačního systému
    init() {
        debug('🧭 Inicializuji navigační systém...');
        
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
        
        debug('✅ Navigační systém inicializován');
    }
};
