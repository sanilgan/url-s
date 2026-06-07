class UrlShortener {
    constructor() {
        this.baseUrl = window.location.origin;
        this.currentShortCode = null;
        this.authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken');
        this.currentUser = null;
        this.urlsData = [];
        this.currentSort = { type: null, direction: 'desc' };
        this.init();
    }

    init() {
        this.bindEvents();
        this.initializeData();
    }

    async initializeData() {
        await this.checkAuthStatus();
        await this.loadUrls();
    }

    // Authentication durumunu kontrol et
    async checkAuthStatus() {
        if (this.authToken) {
            try {
                const response = await fetch('/api/auth/profile', {
                    headers: { 'Authorization': `Bearer ${this.authToken}` }
                });

                if (response.ok) {
                    const result = await response.json();
                    this.currentUser = result.data;
                    this.updateAuthUI(true);
                } else {
                    this.logout();
                }
            } catch (error) {
                console.error('Auth check failed:', error);
                this.logout();
            }
        } else {
            this.updateAuthUI(false);
        }
    }

    // UI'ı güncelle
    updateAuthUI(isLoggedIn) {
        const welcomeMessage = document.getElementById('welcomeMessage');
        const authButtons = document.getElementById('authButtons');
        const userNameSpan = document.getElementById('userName');

        if (isLoggedIn && this.currentUser) {
            welcomeMessage.classList.remove('hidden');
            authButtons.classList.add('hidden');
            userNameSpan.textContent = this.currentUser.name;
        } else {
            welcomeMessage.classList.add('hidden');
            authButtons.classList.remove('hidden');
        }
    }

    // API istekleri için header oluştur
    getAuthHeaders() {
        const headers = { 'Content-Type': 'application/json' };
        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        return headers;
    }

    // Event listeners'ları bağla
    bindEvents() {
        // URL form
        const urlForm = document.getElementById('urlForm');
        if (urlForm) {
            urlForm.addEventListener('submit', (e) => this.handleSubmit(e));
        }

        // Advanced options toggle
        const advancedToggle = document.getElementById('advancedToggle');
        if (advancedToggle) {
            advancedToggle.addEventListener('click', () => this.toggleAdvancedOptions());
        }

        // Copy button
        const copyBtn = document.getElementById('copyBtn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => this.copyToClipboard());
        }

        // QR Code button
        const qrBtn = document.getElementById('qrBtn');
        if (qrBtn) {
            qrBtn.addEventListener('click', () => this.showQRCode());
        }

        // Close QR Modal
        const closeQrModal = document.getElementById('closeQrModal');
        if (closeQrModal) {
            closeQrModal.addEventListener('click', () => this.closeQRModal());
        }

        // Search
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.searchUrls(e.target.value));
        }

        // Refresh button
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadUrls());
        }

        // Modal close
        const closeModal = document.getElementById('closeModal');
        if (closeModal) {
            closeModal.addEventListener('click', () => this.closeStatsModal());
        }

        // Auth buttons
        this.bindAuthButtons();
        this.bindAuthEvents();
        this.bindSortEvents();
    }

    // Auth butonlarını bağla
    bindAuthButtons() {
        const loginBtn = document.getElementById('loginBtn');
        const signupBtn = document.getElementById('signupBtn');
        const logoutBtn = document.getElementById('logoutBtn');

        if (loginBtn) loginBtn.addEventListener('click', () => this.showLoginModal());
        if (signupBtn) signupBtn.addEventListener('click', () => this.showSignUpModal());
        if (logoutBtn) logoutBtn.addEventListener('click', () => this.logout());
    }

    // Auth event'lerini bağla
    bindAuthEvents() {
        // Login modal
        this.bindModalEvents('login', 'LoginModal', (e) => this.handleLogin(e));

        // Sign up modal
        this.bindModalEvents('signUp', 'SignUpModal', (e) => this.handleSignUp(e));

        // Forgot password modal
        this.bindModalEvents('forgotPassword', 'ForgotPasswordModal', (e) => this.handleForgotPassword(e));

        // Şifremi unuttum bağlantısı
        const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');
        if (forgotPasswordBtn) {
            forgotPasswordBtn.addEventListener('click', () => {
                this.hideLoginModal();
                this.showForgotPasswordModal();
            });
        }

        // Modal geçişleri
        const showSignUpFromLogin = document.getElementById('showSignUpModal');
        if (showSignUpFromLogin) {
            showSignUpFromLogin.addEventListener('click', () => {
                this.hideLoginModal();
                this.showSignUpModal();
            });
        }

        const showLoginFromSignUp = document.getElementById('showLoginModal');
        if (showLoginFromSignUp) {
            showLoginFromSignUp.addEventListener('click', () => {
                this.hideSignUpModal();
                this.showLoginModal();
            });
        }

        const backToLogin = document.getElementById('backToLogin');
        if (backToLogin) {
            backToLogin.addEventListener('click', () => {
                this.hideForgotPasswordModal();
                this.showLoginModal();
            });
        }

        // Modal overlay clicks
        document.querySelectorAll('.auth-modal').forEach(modal => {
            const overlay = modal.querySelector('.modal-overlay');
            if (overlay) {
                overlay.addEventListener('click', () => this.hideAllAuthModals());
            }
        });
    }

    // Modal event'lerini bağla (yardımcı fonksiyon)
    bindModalEvents(type, modalSuffix, handler) {
        const closeBtn = document.getElementById(`close${modalSuffix}`);
        const form = document.getElementById(`${type}Form`);

        if (closeBtn) closeBtn.addEventListener('click', () => this[`hide${modalSuffix}`]());
        if (form) form.addEventListener('submit', handler);
    }

    // Modal fonksiyonları
    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    }

    hideModal(modalId) {
        const modal = document.getElementById(modalId);
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }

    showLoginModal() { this.showModal('loginModal'); }
    hideLoginModal() { this.hideModal('loginModal'); }
    showSignUpModal() { this.showModal('signUpModal'); }
    hideSignUpModal() { this.hideModal('signUpModal'); }
    showForgotPasswordModal() { this.showModal('forgotPasswordModal'); }
    hideForgotPasswordModal() { this.hideModal('forgotPasswordModal'); }

    hideAllAuthModals() {
        this.hideLoginModal();
        this.hideSignUpModal();
        this.hideForgotPasswordModal();
    }

    // Auth handler'ları
    async handleLogin(e) {
        e.preventDefault();

        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email, password })
            });

            const result = await response.json();

            if (result.success) {
                this.authToken = result.data.token;
                this.currentUser = result.data.user;

                // Token'ı sakla
                localStorage.removeItem('authToken');
                sessionStorage.removeItem('authToken');
                if (rememberMe) {
                    localStorage.setItem('authToken', this.authToken);
                } else {
                    sessionStorage.setItem('authToken', this.authToken);
                }

                this.hideLoginModal();
                this.updateAuthUI(true);
                await this.loadUrls();
                this.showToast('You have successfully logged in!', 'success');
            } else {
                this.showToast(result.error || 'Failed to log in', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showToast('An error occurred. Please try again..', 'error');
        }
    }

    async handleSignUp(e) {
        e.preventDefault();

        const name = document.getElementById('signUpName').value.trim();
        const email = document.getElementById('signUpEmail').value;
        const password = document.getElementById('signUpPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (!name) {
            this.showToast('Username required', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showToast('Passwords do not match', 'error');
            return;
        }

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ name, email, password })
            });

            const result = await response.json();

            if (result.success) {
                this.hideSignUpModal();
                this.showToast('Your account has been successfully created! You can log in..', 'success');
                this.showLoginModal();
            } else {
                this.showToast(result.error || 'Failed to create account', 'error');
            }
        } catch (error) {
            console.error('SignUp error:', error);
            this.showToast('An error occurred. Please try again..', 'error');
        }
    }

    async handleForgotPassword(e) {
        e.preventDefault();

        const email = document.getElementById('forgotEmail').value;

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ email })
            });

            const result = await response.json();

            if (result.success) {
                this.hideForgotPasswordModal();
                this.showToast('Password reset link has been sent to your e-mail address.', 'success');
            } else {
                this.showToast(result.error || 'Password reset request failed to send', 'error');
            }
        } catch (error) {
            console.error('Forgot password error:', error);
            this.showToast('An error occurred. Please try again..', 'error');
        }
    }

    // URL kısaltma
    async handleSubmit(e) {
        e.preventDefault();

        const originalUrl = document.getElementById('originalUrl').value.trim();
        const urlTitle = document.getElementById('urlTitle').value.trim();
        const customCode = document.getElementById('customCode').value.trim();
        const selectedDomain = document.getElementById('domainSelect').value;

        if (!originalUrl) {
            this.showToast('Please enter a valid URL', 'error');
            return;
        }

        const submitBtn = document.getElementById('submitBtn');
        const originalText = submitBtn.textContent;

        try {
            submitBtn.textContent = 'Being shortened...';
            submitBtn.disabled = true;

            const requestBody = {
                original_url: originalUrl,
                title: urlTitle || 'Untitled',
                domain: selectedDomain
            };

            if (customCode) {
                requestBody.custom_code = customCode;
            }

            const response = await fetch('/api/urls/shorten', {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(requestBody)
            });

            const result = await response.json();

            if (result.success) {
                this.currentShortCode = result.data.short_code;
                this.showResult(result.data.short_url);
                this.loadUrls();
                document.getElementById('urlForm').reset();
                this.hideAdvancedOptions();
                this.showToast(`Link successfully shortened: ${urlTitle || 'Untitled'}`, 'success');
            } else {
                this.showToast(result.error || 'URL could not be shortened', 'error');
            }
        } catch (error) {
            console.error('Shorten URL error:', error);
            this.showToast('Connection error. Please try again.', 'error');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    // Sonuç göster
    showResult(shortUrl) {
        const resultSection = document.getElementById('resultSection');
        const shortUrlInput = document.getElementById('shortUrl');

        if (resultSection && shortUrlInput) {
            shortUrlInput.value = shortUrl;
            resultSection.classList.remove('hidden');
            resultSection.scrollIntoView({ behavior: 'smooth' });
        }
    }

    // QR Kod göster
    showQRCode() {
        const shortUrl = document.getElementById('shortUrl').value;
        if (!shortUrl) return;

        const qrModal = document.getElementById('qrModal');
        const qrContainer = document.getElementById('qrcode');
        const qrUrl = document.getElementById('qrUrl');

        // QR container'ı temizle
        qrContainer.innerHTML = '';

        // QR kodu oluştur (qrcode-generator kütüphanesi ile)
        const typeNumber = 4;
        const errorCorrectionLevel = 'L';
        const qr = qrcode(typeNumber, errorCorrectionLevel);
        qr.addData(shortUrl);
        qr.make();

        // QR kodu HTML olarak ekle
        qrContainer.innerHTML = qr.createImgTag(5);

        // URL'i göster
        qrUrl.textContent = shortUrl;

        // Modal'ı göster
        qrModal.classList.remove('hidden');
        qrModal.classList.add('show');
    }

    // QR Modal'ı kapat
    closeQRModal() {
        const qrModal = document.getElementById('qrModal');
        qrModal.classList.remove('show');
        setTimeout(() => {
            qrModal.classList.add('hidden');
        }, 300);
    }

    // Gelişmiş seçenekleri aç/kapat
    toggleAdvancedOptions() {
        const advancedOptions = document.getElementById('advancedOptions');
        const toggle = document.getElementById('advancedToggle');

        if (advancedOptions) {
            const isShown = advancedOptions.classList.contains('show');

            advancedOptions.classList.toggle('show', !isShown);
            advancedOptions.style.display = isShown ? 'none' : 'block';
            toggle.innerHTML = isShown ?
                '<i class="fas fa-cog"></i> Customize' :
                '<i class="fas fa-times"></i> Close';
        }
    }

    hideAdvancedOptions() {
        const advancedOptions = document.getElementById('advancedOptions');
        const toggle = document.getElementById('advancedToggle');

        if (advancedOptions) {
            advancedOptions.classList.remove('show');
            advancedOptions.style.display = 'none';
            toggle.innerHTML = '<i class="fas fa-cog"></i> Customize';
        }
    }

    // Kopyalama işlemi
    async copyToClipboard() {
        const shortUrlInput = document.getElementById('shortUrl');
        const copyBtn = document.getElementById('copyBtn');

        if (shortUrlInput) {
            try {
                await navigator.clipboard.writeText(shortUrlInput.value);
                this.updateCopyButton(copyBtn, true);
                this.showToast('Link copied!', 'success');
            } catch (error) {
                console.error('Copy failed:', error);
                // Fallback for older browsers
                shortUrlInput.select();
                document.execCommand('copy');
                this.showToast('Link copied!', 'success');
            }
        }
    }

    // Copy butonu görünümünü güncelle
    updateCopyButton(copyBtn, copied) {
        const originalText = copyBtn.innerHTML;

        if (copied) {
            copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
            copyBtn.classList.add('copied');

            setTimeout(() => {
                copyBtn.innerHTML = originalText;
                copyBtn.classList.remove('copied');
            }, 2000);
        }
    }

    // URL'leri yükle
    async loadUrls() {
        try {
            const response = await fetch('/api/urls/list', {
                headers: this.getAuthHeaders()
            });

            const result = await response.json();

            if (result.success) {
                this.renderUrls(result.data);
            } else {
                console.error('❌ Load URLs failed:', result.error);
                this.showToast(result.error || 'Could not load URL list', 'error');
            }
        } catch (error) {
            console.error('❌ Load URLs error:', error);
            this.showToast('Connection error', 'error');
        }
    }

    // URL'leri render et
    renderUrls(urls) {
        const urlsList = document.getElementById('urlsList');
        if (!urlsList) return;

        this.urlsData = urls || [];

        // Giriş yapmamış kullanıcı
        if (!this.authToken) {
            urlsList.innerHTML = this.getEmptyStateHTML('lock', 'Log in to view your links', 'Please sign in to view and manage your shortened links.');
            this.bindEmptyStateEvents();
            return;
        }

        // URL yok
        if (!urls || urls.length === 0) {
            urlsList.innerHTML = this.getEmptyStateHTML('link', 'No shortened links yet', 'Use the form above to shorten your first link.');
            return;
        }

        // Sıralama varsa
        if (this.currentSort.type) {
            this.sortAndRenderUrls();
            return;
        }

        this.renderUrlsFromData(urls);
    }

    // Empty state HTML'i oluştur
    getEmptyStateHTML(icon, title, description) {
        const loginButton = !this.authToken ? `
            <div style="margin-top: 20px;">
                <button class="btn-login-extra-small" id="emptyStateLoginBtn">
                    <i class="fas fa-log-in-alt"></i> Log In
                </button>
            </div>
        ` : '';

        return `
            <div class="empty-state">
                <div class="empty-icon">
                    <i class="fas fa-${icon}"></i>
                </div>
                <h3>${title}</h3>
                <p>${description}</p>
                ${loginButton}
            </div>
        `;
    }

    bindEmptyStateEvents() {
        const loginButton = document.getElementById('emptyStateLoginBtn');
        if (loginButton) {
            loginButton.addEventListener('click', () => this.showLoginModal());
        }
    }

    // Sıralama event'lerini bağla
    bindSortEvents() {
        const sortByClicks = document.getElementById('sortByClicks');
        const sortByDate = document.getElementById('sortByDate');

        if (sortByClicks) {
            sortByClicks.addEventListener('click', () => this.handleSort('clicks'));
        }

        if (sortByDate) {
            sortByDate.addEventListener('click', () => this.handleSort('date'));
        }
    }

    // Sıralama işlemi
    handleSort(sortType) {
        if (this.currentSort.type === sortType) {
            this.currentSort.direction = this.currentSort.direction === 'desc' ? 'asc' : 'desc';
        } else {
            this.currentSort.type = sortType;
            this.currentSort.direction = 'desc';
        }

        this.updateSortButtons();
        this.sortAndRenderUrls();
    }

    // Sıralama butonlarını güncelle
    updateSortButtons() {
        document.querySelectorAll('.sort-btn').forEach(btn => {
            btn.classList.remove('active', 'sort-asc', 'sort-desc');
        });

        if (this.currentSort.type) {
            const activeBtn = document.getElementById(`sortBy${this.currentSort.type === 'clicks' ? 'Clicks' : 'Date'}`);
            if (activeBtn) {
                activeBtn.classList.add('active');
                activeBtn.classList.add(this.currentSort.direction === 'asc' ? 'sort-asc' : 'sort-desc');
            }
        }
    }

    // Sıralama ve render
    sortAndRenderUrls() {
        if (!this.urlsData || this.urlsData.length === 0) return;

        const sortedUrls = [...this.urlsData].sort((a, b) => {
            let valueA, valueB;

            if (this.currentSort.type === 'clicks') {
                valueA = a.clicks || 0;
                valueB = b.clicks || 0;
            } else if (this.currentSort.type === 'date') {
                valueA = new Date(a.created_at);
                valueB = new Date(b.created_at);
            } else {
                return 0;
            }

            return this.currentSort.direction === 'asc'
                ? (valueA > valueB ? 1 : valueA < valueB ? -1 : 0)
                : (valueA < valueB ? 1 : valueA > valueB ? -1 : 0);
        });

        this.renderUrlsFromData(sortedUrls);
    }

    // URL verilerinden HTML oluştur
    renderUrlsFromData(urls) {
        const urlsList = document.getElementById('urlsList');
        if (!urlsList) return;

        urlsList.innerHTML = urls.map(url => {
            const rawShortUrl = url.short_url || `${window.location.origin}/${url.short_code}`;
            const shortUrl = this.safeHttpUrl(rawShortUrl);
            const displayUrl = this.escapeHtml(url.display_url || `x.ly/${url.short_code}`);
            const title = this.escapeHtml(url.title || 'Untitled');
            const titleAttribute = this.escapeAttribute(url.title || 'Untitled');
            const originalUrl = this.escapeHtml(url.original_url || '');
            const shortUrlAttribute = this.escapeAttribute(shortUrl);
            const urlId = Number.isInteger(Number(url.id)) ? Number(url.id) : 0;
            const clicks = Number.isFinite(Number(url.clicks)) ? Number(url.clicks) : 0;

            return `
                <div class="link-item" data-id="${urlId}">
                    <div class="link-header">
                        <div class="link-info">
                            <h3>${title}</h3>
                            <a href="${shortUrlAttribute}" target="_blank" rel="noopener noreferrer" class="link-url">${displayUrl}</a>
                            <div class="link-original">${originalUrl}</div>
                        </div>
                        <div class="link-actions">
                            <button class="btn btn-outline-sm copy-btn" data-url="${shortUrlAttribute}">
                                <i class="fas fa-copy"></i> Copy
                            </button>
                            <button class="btn btn-outline-sm edit-btn" data-id="${urlId}" data-title="${titleAttribute}">
                                <i class="fas fa-edit"></i> Edit
                            </button>
                            <button class="btn btn-outline-sm delete-btn" data-id="${urlId}" data-title="${titleAttribute}">
                                <i class="fas fa-trash"></i> Delete
                            </button>
                        </div>
                    </div>
                    <div class="link-stats">
                        <div class="stat-item">
                            <i class="fas fa-mouse-pointer"></i>
                            <span class="stat-value">${clicks}</span>
                            <span>click${clicks !== 1 ? 's' : ''}</span>
                        </div>
                        <div class="stat-item">
                            <i class="fas fa-calendar"></i>
                            <span>${this.formatDate(url.created_at)}</span>
                        </div>
                    </div>
                </div>
            `;
        }).join('');

        this.bindUrlListEvents();
    }

    escapeHtml(value) {
        return String(value)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    escapeAttribute(value) {
        return this.escapeHtml(value).replace(/`/g, '&#96;');
    }

    safeHttpUrl(value) {
        try {
            const url = new URL(value, window.location.origin);
            return ['http:', 'https:'].includes(url.protocol) ? url.href : '#';
        } catch (error) {
            return '#';
        }
    }

    // URL listesi event'lerini bağla
    bindUrlListEvents() {
        const urlsList = document.getElementById('urlsList');
        if (!urlsList) return;

        urlsList.removeEventListener('click', this.handleUrlListClick);

        this.handleUrlListClick = (e) => {
            e.preventDefault();
            e.stopPropagation();

            const target = e.target.closest('button');
            if (!target) return;

            const urlId = target.getAttribute('data-id');
            const shortUrl = target.getAttribute('data-url');
            const title = target.getAttribute('data-title');

            if (target.classList.contains('copy-btn')) {
                this.copyShortUrl(shortUrl);
            } else if (target.classList.contains('edit-btn')) {
                this.editTitle(urlId, title);
            } else if (target.classList.contains('delete-btn')) {
                this.confirmDeleteUrl(urlId, title);
            }
        };

        urlsList.addEventListener('click', this.handleUrlListClick);
    }

    // Kısa URL kopyala
    async copyShortUrl(shortUrl) {
        try {
            await navigator.clipboard.writeText(shortUrl);
            this.showToast('Short URL copied!', 'success');
        } catch (error) {
            console.error('Copy failed:', error);
            this.fallbackCopy(shortUrl);
        }
    }

    // Kopyalama fallback
    fallbackCopy(text) {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        document.body.appendChild(textArea);
        textArea.select();

        try {
            document.execCommand('copy');
            this.showToast('Short URL copied!', 'success');
        } catch (error) {
            this.showToast('Copy failed', 'error');
        }

        document.body.removeChild(textArea);
    }

    // Başlık düzenle
    editTitle(urlId, currentTitle) {
        const cleanTitle = currentTitle.replace(/&#39;/g, "'");
        const displayTitle = cleanTitle === 'Untitled' ? '' : cleanTitle;
        const newTitle = prompt('Enter new title:', displayTitle);

        if (newTitle !== null) {
            const finalTitle = newTitle.trim() || 'Untitled';
            this.updateUrlTitle(urlId, finalTitle);
        }
    }

    // URL başlığını güncelle
    async updateUrlTitle(urlId, newTitle) {
        try {
            const response = await fetch(`/api/urls/${urlId}`, {
                method: 'PUT',
                headers: this.getAuthHeaders(),
                body: JSON.stringify({ title: newTitle })
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('Title updated successfully!', 'success');
                this.loadUrls();
            } else {
                this.showToast(result.error || 'Title could not be updated', 'error');
            }
        } catch (error) {
            console.error('Update title error:', error);
            this.showToast('Title could not be updated', 'error');
        }
    }

    // URL silme onayı
    confirmDeleteUrl(urlId, urlTitle) {
        const confirmDelete = confirm(`"${urlTitle}" başlıklı URL'i silmek istediğinize emin misiniz?`);
        if (confirmDelete) {
            this.deleteUrl(urlId);
        }
    }

    // URL sil
    async deleteUrl(urlId) {
        try {
            const response = await fetch(`/api/urls/${urlId}`, {
                method: 'DELETE',
                headers: this.getAuthHeaders()
            });

            const result = await response.json();

            if (result.success) {
                this.showToast('The URL was deleted successfully.', 'success');
                this.loadUrls();
            } else {
                this.showToast(result.error || 'URL could not be deleted', 'error');
            }
        } catch (error) {
            console.error('Delete URL error:', error);
            this.showToast('URL could not be deleted', 'error');
        }
    }

    // Çıkış yap
    logout() {
        this.authToken = null;
        this.currentUser = null;
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('authToken');
        this.updateAuthUI(false);
        this.loadUrls();
        this.showToast('Successfully logged out.', 'info');
    }

    // Tarih formatla
    formatDate(dateString) {
        if (!dateString) return 'Bilinmiyor';

        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) return 'Bugün';
        if (diffDays === 2) return 'Dün';
        if (diffDays <= 7) return `${diffDays - 1} gün önce`;

        return date.toLocaleDateString('tr-TR');
    }

    // Modal kapat
    closeStatsModal() {
        const modal = document.getElementById('statsModal');
        if (modal) {
            modal.classList.add('hidden');
            modal.style.display = 'none';
        }
    }

    // URL arama
    searchUrls(searchTerm) {
        const linkItems = document.querySelectorAll('.link-item');
        const normalizedSearch = searchTerm.toLowerCase().trim();

        linkItems.forEach(item => {
            const title = item.querySelector('h3').textContent.toLowerCase();
            const url = item.querySelector('.link-url').textContent.toLowerCase();
            const originalUrl = item.querySelector('.link-original').textContent.toLowerCase();

            const matches = title.includes(normalizedSearch) ||
                url.includes(normalizedSearch) ||
                originalUrl.includes(normalizedSearch);

            item.style.display = matches ? 'block' : 'none';
        });
    }

    // Toast mesajları
    showToast(message, type = 'info') {
        const container = document.getElementById('toastContainer');
        if (!container) return;

        const toast = document.createElement('div');
        toast.className = `toast toast-${type}`;

        const iconMap = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-circle',
            warning: 'fas fa-exclamation-triangle',
            info: 'fas fa-info-circle'
        };

        const content = document.createElement('div');
        content.className = 'toast-content';

        const icon = document.createElement('i');
        icon.className = iconMap[type] || iconMap.info;

        const text = document.createElement('span');
        text.textContent = String(message);

        const closeButton = document.createElement('button');
        closeButton.className = 'toast-close';
        closeButton.type = 'button';
        closeButton.setAttribute('aria-label', 'Close notification');
        closeButton.textContent = '×';

        content.append(icon, text);
        toast.append(content, closeButton);

        container.appendChild(toast);
        setTimeout(() => toast.classList.add('show'), 100);

        const autoRemove = setTimeout(() => this.removeToast(toast), 5000);

        closeButton.addEventListener('click', () => {
            clearTimeout(autoRemove);
            this.removeToast(toast);
        });
    }

    removeToast(toast) {
        toast.classList.remove('show');
        setTimeout(() => {
            if (toast.parentNode) {
                toast.parentNode.removeChild(toast);
            }
        }, 300);
    }
}

// Uygulamayı başlat
const urlShortener = new UrlShortener();
