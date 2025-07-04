class LinkDirectory {
    constructor() {
        this.links = [];
        this.filteredLinks = [];
        this.currentCategory = 'all';
        this.currentTags = new Set();
        this.searchQuery = '';
        
        this.init();
    }
    
    async init() {
        await this.loadLinks();
        this.setupEventListeners();
        this.handleInitialHash();
        this.renderCategories();
        this.renderTags();
        this.renderLinks();
        this.hideLoading();
    }
    async loadLinks() {
    try {
        const response = await fetch('https://raw.githubusercontent.com/ayhan-dev/linkdirectory/main/tar.json');

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        this.links = await response.json();
        this.filteredLinks = [...this.links];
        console.log(`Loaded ${this.links.length} links from GitHub`);
    } catch (error) {
        console.error('Error loading links from GitHub:', error);
        this.links = [];
        this.filteredLinks = [];
        this.showToast?.('Failed to load links. Please check your connection or try again later.');
    }
}

    setupEventListeners() {
        const themeToggle = document.getElementById('themeToggle');
        themeToggle.addEventListener('click', this.toggleTheme.bind(this));
        const searchInput = document.getElementById('searchInput');
        searchInput.addEventListener('input', this.handleSearch.bind(this));
        window.addEventListener('hashchange', this.handleHashChange.bind(this));
        document.addEventListener('click', (e) => {
            if (e.target.classList.contains('copy-btn')) {
                this.copyLink(e.target.dataset.url);
            }
        });
        const donateBtn = document.getElementById('donateBtn');
        const donateModal = document.getElementById('donateModal');
        const closeModal = document.getElementById('closeModal');
        const copyWalletBtn = document.getElementById('copyWalletBtn');

        donateBtn.addEventListener('click', () => {
            donateModal.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        });

        closeModal.addEventListener('click', () => {
            donateModal.style.display = 'none';
            document.body.style.overflow = 'auto';
        });
        donateModal.addEventListener('click', (e) => {
            if (e.target === donateModal) {
                donateModal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });
        copyWalletBtn.addEventListener('click', () => {
            const walletAddress = document.getElementById('walletAddress').textContent;
            navigator.clipboard.writeText(walletAddress).then(() => {
                copyWalletBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                copyWalletBtn.style.background = 'var(--success-color)';
                
                setTimeout(() => {
                    copyWalletBtn.innerHTML = '<i class="fas fa-copy"></i> Copy Address';
                    copyWalletBtn.style.background = 'var(--accent-color)';
                }, 2000);
                
                this.showToast('Wallet address copied to clipboard! 💰');
            }).catch(() => {
                this.showToast('Failed to copy wallet address ❌');
            });
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && donateModal.style.display === 'flex') {
                donateModal.style.display = 'none';
                document.body.style.overflow = 'auto';
            }
        });
    }
    
    toggleTheme() {
        const currentTheme = document.documentElement.getAttribute('data-theme');
        const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
        
        document.documentElement.setAttribute('data-theme', newTheme);
        localStorage.setItem('theme', newTheme);
        
        const themeIcon = document.querySelector('.theme-toggle i');
        themeIcon.className = newTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
    }
    
    handleInitialHash() {
        const savedTheme = localStorage.getItem('theme') || 'light';
        document.documentElement.setAttribute('data-theme', savedTheme);
        const themeIcon = document.querySelector('.theme-toggle i');
        themeIcon.className = savedTheme === 'dark' ? 'fas fa-sun' : 'fas fa-moon';
        this.handleHashChange();
    }
    
    handleHashChange() {
        const hash = window.location.hash.slice(1);
        if (hash) {
            this.currentCategory = hash;
            this.filterLinks();
            this.updateCategoryButtons();
        }
    }
    
    handleSearch(e) {
        this.searchQuery = e.target.value.toLowerCase();
        this.filterLinks();
    }
    
    handleCategoryFilter(category) {
        this.currentCategory = category;
        if (category === 'all') {
            window.location.hash = '';
        } else {
            window.location.hash = category;
        }
        this.filterLinks();
        this.updateCategoryButtons();
    }
    
    handleTagFilter(tag) {
        if (this.currentTags.has(tag)) {
            this.currentTags.delete(tag);
        } else {
            this.currentTags.add(tag);
        }
        this.filterLinks();
        this.updateTagButtons();
    }
    filterLinks() {
        this.filteredLinks = this.links.filter(link => {
            const categoryMatch = this.currentCategory === 'all' || 
                                link.category.toLowerCase() === this.currentCategory.toLowerCase();
            const tagMatch = this.currentTags.size === 0 || 
                           [...this.currentTags].some(tag => 
                               link.tags.some(linkTag => linkTag.toLowerCase() === tag.toLowerCase())
                           );
            const searchMatch = this.searchQuery === '' ||
                              link.title.toLowerCase().includes(this.searchQuery) ||
                              link.description.toLowerCase().includes(this.searchQuery) ||
                              link.tags.some(tag => tag.toLowerCase().includes(this.searchQuery));
            
            return categoryMatch && tagMatch && searchMatch;
        });
        
        this.renderLinks();
    }
    
    renderCategories() {
        const categories = ['all', ...new Set(this.links.map(link => link.category))];
        const categoryFilters = document.getElementById('categoryFilters');
        
        categoryFilters.innerHTML = categories.map(category => `
            <button class="filter-btn ${category === this.currentCategory ? 'active' : ''}" 
                    data-category="${category}">
                ${this.getCategoryIcon(category)} ${this.capitalize(category)}
            </button>
        `).join('');
        categoryFilters.addEventListener('click', (e) => {
            if (e.target.classList.contains('filter-btn')) {
                this.handleCategoryFilter(e.target.dataset.category);
            }
        });
    }
    renderTags() {
        const allTags = [...new Set(this.links.flatMap(link => link.tags))];
        const tagFilters = document.getElementById('tagFilters');
        tagFilters.innerHTML = allTags.map(tag => `
            <button class="tag-btn ${this.currentTags.has(tag) ? 'active' : ''}" 
                    data-tag="${tag}">
                #${tag}
            </button>
        `).join('');
        tagFilters.addEventListener('click', (e) => {
            if (e.target.classList.contains('tag-btn')) {
                this.handleTagFilter(e.target.dataset.tag);
            }
        });
    }
    renderLinks() {
        const linksGrid = document.getElementById('linksGrid');
        const emptyState = document.getElementById('emptyState');
        if (this.filteredLinks.length === 0) {
            linksGrid.style.display = 'none';
            emptyState.style.display = 'block';
            return;
        }
        linksGrid.style.display = 'grid';
        emptyState.style.display = 'none';
        const existingCards = linksGrid.querySelectorAll('.link-card');
        existingCards.forEach(card => card.classList.add('fade-out'));
        setTimeout(() => {
            linksGrid.innerHTML = this.filteredLinks.map((link, index) => `
                <div class="link-card" style="animation-delay: ${index * 0.1}s">
                    <div class="card-header">
                        <div class="card-icon">${link.icon}</div>
                        <div class="card-content">
                            <a href="${link.url}" target="_blank" rel="noopener noreferrer" class="card-title">
                                ${link.title}
                            </a>
                            <p class="card-description">${link.description}</p>
                        </div>
                    </div>
                    <div class="card-tags">
                        ${link.tags.map(tag => `
                            <span class="tag" onclick="linkDirectory.handleTagFilter('${tag}')">#${tag}</span>
                        `).join('')}
                    </div>
                    <div class="card-actions">
                        <button class="copy-btn" data-url="${link.url}" title="Copy link">
                            <i class="fas fa-copy"></i> Copy
                        </button>
                    </div>
                </div>
            `).join('');
        }, 150);
    }
    updateCategoryButtons() {
        const buttons = document.querySelectorAll('.filter-btn');
        buttons.forEach(btn => {
            btn.classList.toggle('active', btn.dataset.category === this.currentCategory);
        });
    }
    updateTagButtons() {
        const buttons = document.querySelectorAll('.tag-btn');
        buttons.forEach(btn => {
            btn.classList.toggle('active', this.currentTags.has(btn.dataset.tag));
        });
    }
    getCategoryIcon(category) {
        const icons = {
            all: '<i class="fas fa-globe"></i>',
            games: '<i class="fas fa-gamepad"></i>',
            tools: '<i class="fas fa-tools"></i>',
            ai: '<i class="fas fa-brain"></i>',
            design: '<i class="fas fa-palette"></i>',
            development: '<i class="fas fa-code"></i>',
            productivity: '<i class="fas fa-bolt"></i>',
            education: '<i class="fas fa-book"></i>',
            entertainment: '<i class="fas fa-film"></i>',
            social: '<i class="fas fa-users"></i>'
        };
        return icons[category.toLowerCase()] || '<i class="fas fa-folder"></i>';
    }
    
    capitalize(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
    async copyLink(url) {
        try {
            await navigator.clipboard.writeText(url);
            this.showToast('Link copied to clipboard! 📋');
        } catch (error) {
            console.error('Failed to copy link:', error);
            this.showToast('Failed to copy link ❌');
        }
    }
    showToast(message) {
        const toast = document.createElement('div');
        toast.innerHTML = `<i class="fas fa-check-circle"></i> ${message}`;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: var(--accent-color);
            color: white;
            padding: 1rem 1.5rem;
            border-radius: var(--radius);
            box-shadow: var(--shadow-lg);
            z-index: 1000;
            animation: slideInRight 0.3s ease;
            display: flex;
            align-items: center;
            gap: 0.5rem;
            font-weight: 600;
        `;
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.style.animation = 'slideOutRight 0.3s ease';
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }
    hideLoading() {
        const loading = document.getElementById('loading');
        loading.style.display = 'none';
    }
}
const style = document.createElement('style');
style.textContent = `
    @keyframes slideInRight {
        from { transform: translateX(100%); opacity: 0; }
        to { transform: translateX(0); opacity: 1; }
    }

    @keyframes slideOutRight {
        from { transform: translateX(0); opacity: 1; }
        to { transform: translateX(100%); opacity: 0; }
    }
`;
document.head.appendChild(style);
const linkDirectory = new LinkDirectory();
