// Modern Zyrex API Interface
class ZyrexAPI {
    constructor() {
        this.apiKey = localStorage.getItem('zyrex_api_key') || '';
        this.settings = null;
        this.currentTheme = localStorage.getItem('theme') || 'light';
        this.init();
    }

    async init() {
        this.setupEventListeners();
        this.setupTheme();
        await this.loadSettings();
        this.hideLoadingScreen();
        this.setupApiKeyValidation();
    }

    setupEventListeners() {
        // Theme toggle
        document.getElementById('themeToggle').addEventListener('click', () => {
            this.toggleTheme();
        });

        // Mobile menu
        document.getElementById('mobileMenuBtn').addEventListener('click', () => {
            this.toggleMobileMenu();
        });

        // API Key input
        document.getElementById('apiKeyInput').addEventListener('input', (e) => {
            this.handleApiKeyInput(e.target.value);
        });

        // Search functionality
        document.getElementById('searchInput').addEventListener('input', (e) => {
            this.handleSearch(e.target.value);
        });

        // Modal close
        document.getElementById('closeModal').addEventListener('click', () => {
            this.closeModal();
        });

        // Test API button
        document.getElementById('testApiBtn').addEventListener('click', () => {
            this.testApi();
        });

        // Copy endpoint
        document.getElementById('copyEndpoint').addEventListener('click', () => {
            this.copyToClipboard(document.getElementById('modalEndpoint').value);
        });

        // Toast close
        document.getElementById('closeToast').addEventListener('click', () => {
            this.hideToast();
        });

        // Smooth scrolling for navigation
        document.querySelectorAll('a[href^="#"]').forEach(anchor => {
            anchor.addEventListener('click', (e) => {
                e.preventDefault();
                const target = document.querySelector(anchor.getAttribute('href'));
                if (target) {
                    target.scrollIntoView({ behavior: 'smooth' });
                }
            });
        });
    }

    setupTheme() {
        if (this.currentTheme === 'dark') {
            document.documentElement.classList.add('dark');
        } else {
            document.documentElement.classList.remove('dark');
        }
    }

    toggleTheme() {
        this.currentTheme = this.currentTheme === 'light' ? 'dark' : 'light';
        localStorage.setItem('theme', this.currentTheme);
        this.setupTheme();
        this.showToast('Theme changed to ' + this.currentTheme + ' mode', 'success');
    }

    toggleMobileMenu() {
        const mobileMenu = document.getElementById('mobileMenu');
        mobileMenu.classList.toggle('hidden');
    }

    async loadSettings() {
        try {
            const response = await fetch('/api/settings');
            this.settings = await response.json();
            this.updateUI();
            await this.loadApiCategories();
        } catch (error) {
            console.error('Error loading settings:', error);
            this.showToast('Error loading API settings', 'error');
        }
    }

    updateUI() {
        if (!this.settings) return;

        // Update basic info
        document.getElementById('apiName').textContent = this.settings.name || 'Zyrex API';
        document.getElementById('apiDescription').textContent = this.settings.description || 'Simple and powerful APIs for everyone';
        document.getElementById('apiStatus').textContent = this.settings.header?.status || 'Active';
        document.getElementById('apiVersion').textContent = this.settings.version || 'v1.0.0';
        
        // Update page title
        document.title = this.settings.name || 'Zyrex API';
    }

    async loadApiCategories() {
        const container = document.getElementById('apiCategories');
        if (!this.settings?.categories) return;

        let totalEndpoints = 0;
        container.innerHTML = '';

        this.settings.categories.forEach(category => {
            totalEndpoints += category.items?.length || 0;
            const categoryElement = this.createCategoryElement(category);
            container.appendChild(categoryElement);
        });

        document.getElementById('endpointCount').textContent = totalEndpoints;
    }

    createCategoryElement(category) {
        const categoryDiv = document.createElement('div');
        categoryDiv.className = 'api-category fade-in';
        
        categoryDiv.innerHTML = `
            <div class="api-category-header">
                <h3 class="api-category-title">${category.name}</h3>
                <p class="api-category-description">Explore ${category.name.toLowerCase()} endpoints</p>
            </div>
            <div class="api-grid">
                ${category.items?.map(item => this.createApiCard(item)).join('') || ''}
            </div>
        `;

        return categoryDiv;
    }

    createApiCard(api) {
        const statusClass = api.status === 'ready' ? 'ready' : 'maintenance';
        const statusText = api.status === 'ready' ? 'Ready' : 'Maintenance';
        
        return `
            <div class="api-card" onclick="zyrexAPI.openApiModal('${api.name}', '${api.desc}', '${api.path}', ${JSON.stringify(api.params || {}).replace(/"/g, '&quot;')})">
                <div class="api-card-header">
                    <h4 class="api-card-title">${api.name}</h4>
                    <span class="api-status ${statusClass}">${statusText}</span>
                </div>
                <p class="api-card-description">${api.desc}</p>
            </div>
        `;
    }

    openApiModal(name, description, path, params) {
        document.getElementById('modalTitle').textContent = name;
        document.getElementById('modalDescription').textContent = description;
        document.getElementById('modalEndpoint').value = window.location.origin + path;
        
        this.currentApiPath = path;
        this.currentApiParams = params;
        
        this.setupParameterInputs(params);
        document.getElementById('apiModal').classList.remove('hidden');
        document.body.style.overflow = 'hidden';
    }

    setupParameterInputs(params) {
        const container = document.getElementById('parameterInputs');
        container.innerHTML = '';

        if (!params || Object.keys(params).length === 0) {
            document.getElementById('parametersSection').style.display = 'none';
            return;
        }

        document.getElementById('parametersSection').style.display = 'block';

        Object.entries(params).forEach(([key, description]) => {
            const inputDiv = document.createElement('div');
            inputDiv.innerHTML = `
                <label class="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">${key}</label>
                <input type="text" id="param_${key}" placeholder="${description}" 
                       class="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent">
            `;
            container.appendChild(inputDiv);
        });
    }

    async testApi() {
        if (!this.apiKey) {
            this.showToast('Please enter your API key first', 'error');
            return;
        }

        const loadingElement = document.getElementById('loadingResponse');
        const responseElement = document.getElementById('responseSection');
        
        loadingElement.classList.remove('hidden');
        responseElement.classList.add('hidden');

        try {
            let url = window.location.origin + this.currentApiPath;
            
            // Add parameters to URL
            if (this.currentApiParams && Object.keys(this.currentApiParams).length > 0) {
                const params = new URLSearchParams();
                Object.keys(this.currentApiParams).forEach(key => {
                    const value = document.getElementById(`param_${key}`)?.value;
                    if (value) {
                        if (this.currentApiPath.includes(`${key}=`)) {
                            url += value;
                        } else {
                            params.append(key, value);
                        }
                    }
                });
                
                if (params.toString()) {
                    url += (url.includes('?') ? '&' : '?') + params.toString();
                }
            }

            const response = await fetch(url, {
                headers: {
                    'X-API-Key': this.apiKey,
                    'Content-Type': 'application/json'
                }
            });

            const data = await response.json();
            
            loadingElement.classList.add('hidden');
            responseElement.classList.remove('hidden');
            
            document.getElementById('responseContent').textContent = JSON.stringify(data, null, 2);
            
            if (response.ok) {
                this.showToast('API test successful', 'success');
            } else {
                this.showToast('API test failed: ' + (data.message || 'Unknown error'), 'error');
            }
        } catch (error) {
            loadingElement.classList.add('hidden');
            responseElement.classList.remove('hidden');
            document.getElementById('responseContent').textContent = 'Error: ' + error.message;
            this.showToast('API test failed: ' + error.message, 'error');
        }
    }

    closeModal() {
        document.getElementById('apiModal').classList.add('hidden');
        document.body.style.overflow = 'auto';
        document.getElementById('responseSection').classList.add('hidden');
        document.getElementById('loadingResponse').classList.add('hidden');
    }

    handleApiKeyInput(value) {
        this.apiKey = value;
        localStorage.setItem('zyrex_api_key', value);
        
        const input = document.getElementById('apiKeyInput');
        if (value) {
            input.classList.remove('api-key-invalid');
            input.classList.add('api-key-valid');
        } else {
            input.classList.remove('api-key-valid', 'api-key-invalid');
        }
    }

    setupApiKeyValidation() {
        const savedKey = localStorage.getItem('zyrex_api_key');
        if (savedKey) {
            document.getElementById('apiKeyInput').value = savedKey;
            this.handleApiKeyInput(savedKey);
        }
    }

    handleSearch(query) {
        const apiCards = document.querySelectorAll('.api-card');
        const categories = document.querySelectorAll('.api-category');
        
        if (!query.trim()) {
            apiCards.forEach(card => card.style.display = 'block');
            categories.forEach(category => category.style.display = 'block');
            return;
        }

        const searchTerm = query.toLowerCase();
        
        categories.forEach(category => {
            const categoryCards = category.querySelectorAll('.api-card');
            let hasVisibleCards = false;
            
            categoryCards.forEach(card => {
                const title = card.querySelector('.api-card-title').textContent.toLowerCase();
                const description = card.querySelector('.api-card-description').textContent.toLowerCase();
                
                if (title.includes(searchTerm) || description.includes(searchTerm)) {
                    card.style.display = 'block';
                    hasVisibleCards = true;
                } else {
                    card.style.display = 'none';
                }
            });
            
            category.style.display = hasVisibleCards ? 'block' : 'none';
        });
    }

    copyToClipboard(text) {
        navigator.clipboard.writeText(text).then(() => {
            this.showToast('Copied to clipboard', 'success');
        }).catch(() => {
            this.showToast('Failed to copy to clipboard', 'error');
        });
    }

    showToast(message, type = 'info') {
        const toast = document.getElementById('toast');
        const toastMessage = document.getElementById('toastMessage');
        const toastIcon = document.getElementById('toastIcon');
        
        toastMessage.textContent = message;
        
        // Set icon based on type
        const icons = {
            success: 'fas fa-check-circle text-green-600',
            error: 'fas fa-exclamation-circle text-red-600',
            warning: 'fas fa-exclamation-triangle text-yellow-600',
            info: 'fas fa-info-circle text-blue-600'
        };
        
        toastIcon.innerHTML = `<i class="${icons[type] || icons.info}"></i>`;
        
        // Show toast
        toast.classList.remove('translate-x-full');
        toast.classList.add('translate-x-0');
        
        // Auto hide after 3 seconds
        setTimeout(() => {
            this.hideToast();
        }, 3000);
    }

    hideToast() {
        const toast = document.getElementById('toast');
        toast.classList.remove('translate-x-0');
        toast.classList.add('translate-x-full');
    }

    hideLoadingScreen() {
        setTimeout(() => {
            document.getElementById('loadingScreen').style.display = 'none';
        }, 1000);
    }
}

// Initialize the application
const zyrexAPI = new ZyrexAPI();

// Add some additional interactive features
document.addEventListener('DOMContentLoaded', () => {
    // Add scroll animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('slide-up');
            }
        });
    }, observerOptions);

    // Observe elements for animation
    document.querySelectorAll('.stat-card, .api-category, .doc-card').forEach(el => {
        observer.observe(el);
    });

    // Add parallax effect to hero section
    window.addEventListener('scroll', () => {
        const scrolled = window.pageYOffset;
        const parallax = document.querySelector('.floating-shape');
        if (parallax) {
            const speed = scrolled * 0.5;
            parallax.style.transform = `translateY(${speed}px)`;
        }
    });

    // Add typing effect to hero title
    const heroTitle = document.getElementById('apiName');
    if (heroTitle) {
        const text = heroTitle.textContent;
        heroTitle.textContent = '';
        let i = 0;
        
        const typeWriter = () => {
            if (i < text.length) {
                heroTitle.textContent += text.charAt(i);
                i++;
                setTimeout(typeWriter, 100);
            }
        };
        
        setTimeout(typeWriter, 1500);
    }
});

// Add keyboard shortcuts
document.addEventListener('keydown', (e) => {
    // Escape key to close modal
    if (e.key === 'Escape') {
        zyrexAPI.closeModal();
    }
    
    // Ctrl/Cmd + K to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        document.getElementById('searchInput').focus();
    }
});

// Add service worker for offline functionality (optional)
if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('/sw.js')
            .then(registration => {
                console.log('SW registered: ', registration);
            })
            .catch(registrationError => {
                console.log('SW registration failed: ', registrationError);
            });
    });
}

