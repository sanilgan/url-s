//agron2

class UrlShortener {
    constructor() {
        this.baseUrl = window.location.origin; // baseURL: "http://localhost:3001"
        this.currentShortCode = null;   //currentShortCode: En son oluşturulan kısa kodun tutulduğu yer
        //localStorage ve sessionStorage token kontrol eder
        this.authToken = localStorage.getItem('authToken') || sessionStorage.getItem('authToken'); //token kontrol eder beni hatırla özelliği için
       //authToken:  Kullanıcının giriş bilgisini saklayan "anahtar"
        this.currentUser = null; //giriş yapmış kullanıcı bilgileri
        this.init();  //uygulamayı başlat (init : başlatma)
    }

    init() {
        this.bindEvents(); //tüm butonları dinlemeye başla
        this.checkAuthStatus(); //kullanıcının giriş yapıp yapmadığını kontrol et
        this.loadUrls();  //mevcut URL'leri yükle
    }

    // Authentication (kimlik doğrulama) durumunu kontrol et
    //sayfa yenilendiğinde kullanıcının giriş yapıp yapmadığını kontrol eder
    //token süresi dolmuşsa otomatik log out yapar
    async checkAuthStatus() {
        if (this.authToken) {
            try {
                const response = await fetch('/api/auth/profile', {
                    headers: {
                        'Authorization': `Bearer ${this.authToken}`
                    }
                });
                // Eğer token geçerliyse kullanıcı bilgilerini al

                if (response.ok) {
                    const result = await response.json();
                    this.currentUser = result.data;
                    this.updateAuthUI(true); // UI'ı güncelle
                } else {
                    // Token geçersiz
                    this.logout();
                }
            } catch (error) {  //token süresi dolmuşsa temizle
                console.error('Auth check failed:', error);
                this.logout();
            }
        } else {
            this.updateAuthUI(false); // Giriş yapılmamış durumu
        }
    }
    //Sayfa yenilendiğinde "kullanıcı hala giriş yapmış mı?" kontrol eder
    //Token süresi dolmuşsa otomatik çıkış yapar
    //Güvenlik sağlar

    // Auth UI'ını güncelle
    updateAuthUI(isLoggedIn) {
        const welcomeMessage = document.getElementById('welcomeMessage');
        const authButtons = document.getElementById('authButtons');
        const userNameSpan = document.getElementById('userName');

        if (isLoggedIn && this.currentUser) {
            // Giriş yapılmış durumu - "Hoş geldiniz kullanıcı_adı" göster
            welcomeMessage.classList.remove('hidden');
            authButtons.classList.add('hidden');// Login/Signup butonlarını gizle
            userNameSpan.textContent = this.currentUser.name;
        } else {
            // Giriş yapılmamış durumu- login/signup butonlarını göster
            welcomeMessage.classList.add('hidden');
            authButtons.classList.remove('hidden');
        }
    }//giriş yapmışsa hoş geldin yapmamışsa giriş yap butonlarını gösterir

    // API istekleri için header oluştur
    //her apı isteğinde kullanılır. -giriş yapmışsa token'ı da gönderir
    //Token, kullanıcı giriş yaptıktan sonra verilen gizli bir koddur.
    // API’ye veri çekme/gönderme isteklerinde, bu token genellikle Authorization başlığında (header) yer alır.
    // Bu sayede sunucu, "Bu kullanıcı gerçekten giriş yapmış mı ve yetkisi var mı?" diye kontrol edebilir.
    getAuthHeaders() {
        const headers = {
            'Content-Type': 'application/json'
        };
        if (this.authToken) {
            headers['Authorization'] = `Bearer ${this.authToken}`;
        }
        return headers;
    }
    //Token nedir?
    // Kullanıcı giriş yaptığında verilen gizli "anahtar"
    // Server'a "Bu kullanıcı gerçekten giriş yapmış" diye kanıtlar
    // Her API isteğinde bu anahtarı gönderir

    bindEvents() { //olay dinleyicileri
        // URL kısaltma formu
        const urlForm = document.getElementById('urlForm');
        if (urlForm) {
            urlForm.addEventListener('submit', (e) => this.handleSubmit(e));
        }// form gönderildiğinde handleSubmit fonksiyonunu çağırır

        // Gelişmiş seçenekler toggle
        const advancedToggle = document.getElementById('advancedToggle');
        if (advancedToggle) {
            advancedToggle.addEventListener('click', () => this.toggleAdvancedOptions());
        }

        // cop butonu tıklandığında kopyala
        const copyBtn = document.getElementById('copyBtn');
        if (copyBtn) {
            copyBtn.addEventListener('click', () => this.copyToClipboard());
        }

        // Arama
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', (e) => this.searchUrls(e.target.value));
        }

        // Yenile butonu
        const refreshBtn = document.getElementById('refreshBtn');
        if (refreshBtn) {
            refreshBtn.addEventListener('click', () => this.loadUrls());
        }

        // Modal kapatma
        const closeModal = document.getElementById('closeModal');
        if (closeModal) {
            closeModal.addEventListener('click', () => this.closeStatsModal());
        }

        // Login/Signup/Logout butonları
        const loginBtn = document.getElementById('loginBtn');
        const signupBtn = document.getElementById('signupBtn');
        const logoutBtn = document.getElementById('logoutBtn');

        if (loginBtn) {
            loginBtn.addEventListener('click', () => this.showLoginModal());
        }

        if (signupBtn) {
            signupBtn.addEventListener('click', () => this.showSignUpModal());
        }

        if (logoutBtn) {
            logoutBtn.addEventListener('click', () => this.logout());
        }

        // Auth modal event listeners
        this.bindAuthEvents();
    }
    //Event Listener nedir?
    // "Bu butona tıklandığında şu fonksiyonu çalıştır" demek
    // HTML'deki butonları JavaScript'e bağlar
    // if kontrolü: Buton yoksa hata vermesin

    bindAuthEvents() {    // neden ayrı fonksiyon ? ana events ve auth events ayrı olsun diye
        //Login/Signup/ForgotPassword işlemlerini gruplar
        // Login modal kapatma
        const loginModal = document.getElementById('loginModal');
        const closeLoginModal = document.getElementById('closeLoginModal');
        const loginForm = document.getElementById('loginForm');
        const showSignUpFromLogin = document.getElementById('showSignUpModal');
        const forgotPasswordBtn = document.getElementById('forgotPasswordBtn');

        if (closeLoginModal) {   // Login modal kapatma butonu
            closeLoginModal.addEventListener('click', () => this.hideLoginModal());
        }

        if (loginForm) {  // Login form gönderme
            loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        }

        if (showSignUpFromLogin) {
            showSignUpFromLogin.addEventListener('click', () => {
                this.hideLoginModal();
                this.showSignUpModal();
            });
        }

        if (forgotPasswordBtn) {   // Şifremi unuttum linki
            forgotPasswordBtn.addEventListener('click', () => {
                this.hideLoginModal();
                this.showForgotPasswordModal();
            });
        }

        // Sign up modal
        const signUpModal = document.getElementById('signUpModal');
        const closeSignUpModal = document.getElementById('closeSignUpModal');
        const signUpForm = document.getElementById('signUpForm');
        const showLoginFromSignUp = document.getElementById('showLoginModal');

        if (closeSignUpModal) {
            closeSignUpModal.addEventListener('click', () => this.hideSignUpModal());
        }

        if (signUpForm) {
            signUpForm.addEventListener('submit', (e) => this.handleSignUp(e));
        }

        if (showLoginFromSignUp) {
            showLoginFromSignUp.addEventListener('click', () => {
                this.hideSignUpModal();
                this.showLoginModal();
            });
        }

        // Forgot password modal
        const forgotPasswordModal = document.getElementById('forgotPasswordModal');
        const closeForgotPasswordModal = document.getElementById('closeForgotPasswordModal');
        const forgotPasswordForm = document.getElementById('forgotPasswordForm');
        const backToLogin = document.getElementById('backToLogin');

        if (closeForgotPasswordModal) {
            closeForgotPasswordModal.addEventListener('click', () => this.hideForgotPasswordModal());
        }

        if (forgotPasswordForm) {
            forgotPasswordForm.addEventListener('submit', (e) => this.handleForgotPassword(e));
        }

        if (backToLogin) {
            backToLogin.addEventListener('click', () => {
                this.hideForgotPasswordModal();
                this.showLoginModal();
            });
        }

        // Modal overlay clicks
        const authModals = document.querySelectorAll('.auth-modal');
        authModals.forEach(modal => {
            const overlay = modal.querySelector('.modal-overlay');
            if (overlay) {
                overlay.addEventListener('click', () => {
                    this.hideAllAuthModals();
                });
            }
        });
    }

    // Auth modal functions -
    //Login/Signup/ForgotPassword popup pencerelerini açıp kapatır.
    // Kullanıcı deneyimi için arkadaki sayfayı scroll edilemez yapar.
    showLoginModal() {
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.classList.remove('hidden'); // Modal'ı görünür yap
            document.body.style.overflow = 'hidden';  // Arka plan kaydırmayı engelle
        }
    }

    hideLoginModal() {
        const modal = document.getElementById('loginModal');
        if (modal) {
            modal.classList.add('hidden');  // Modal'ı gizle
            document.body.style.overflow = ''; // scrolu geri aç
        }
    }
    //Modal nedir?
    // Sayfanın üstünde açılan popup pencere
    // Login, Signup, Şifre Sıfırlama formları için kullanılır
    // Arka plan scroll kapatılır (kullanıcı deneyimi için)

    showSignUpModal() {
        const modal = document.getElementById('signUpModal');
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    }

    hideSignUpModal() {
        const modal = document.getElementById('signUpModal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }

    showForgotPasswordModal() {
        const modal = document.getElementById('forgotPasswordModal');
        if (modal) {
            modal.classList.remove('hidden');
            document.body.style.overflow = 'hidden';
        }
    }

    hideForgotPasswordModal() {
        const modal = document.getElementById('forgotPasswordModal');
        if (modal) {
            modal.classList.add('hidden');
            document.body.style.overflow = '';
        }
    }

    hideAllAuthModals() {
        this.hideLoginModal();
        this.hideSignUpModal();
        this.hideForgotPasswordModal();
    }
    //Bir modal açıkken diğerini açarsa öncekini kapatır
    // Kod tekrarını önle

    // Auth handlers
    async handleLogin(e) {
        e.preventDefault();  //Sayfanın yenilenmesini engelle

        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        const rememberMe = document.getElementById('rememberMe').checked;

        try {
            const response = await fetch('/api/auth/login', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const result = await response.json();

            if (result.success) {
                this.authToken = result.data.token;
                this.currentUser = result.data.user;

                if (rememberMe) {
                    localStorage.setItem('authToken', this.authToken); //Tarayıcı kapansa bile token kalır ("Beni Hatırla")
                } else {
                    sessionStorage.setItem('authToken', this.authToken); //Tarayıcı kapanınca token silinir
                }

                this.hideLoginModal();
                this.updateAuthUI(true); // UI'ı güncelle
                await this.loadUrls();
                this.showToast('Başarıyla giriş yaptınız!', 'success');
            } else {
                this.showToast(result.error || 'Giriş yapılamadı', 'error');
            }
        } catch (error) {
            console.error('Login error:', error);
            this.showToast('Bir hata oluştu. Lütfen tekrar deneyin.', 'error');
        }
    }
//Neden var: Kullanıcı giriş formunu doldurduğunda server'a göndermek için.
// "Beni Hatırla" işaretliyse localStorage'a, değilse sessionStorage'a kaydeder.
    async handleSignUp(e) {
        e.preventDefault();  //  form gönnderildiğinde sayfanın yenilenmesini engeller
        //javascript'te form submit edildiğinde sayfa yenilenir. Bunu engellemek için e.preventDefault() kullanılır.

        const name = document.getElementById('signUpName').value.trim();
        const email = document.getElementById('signUpEmail').value;
        const password = document.getElementById('signUpPassword').value;
        const confirmPassword = document.getElementById('confirmPassword').value;

        if (!name) {
            this.showToast('Kullanıcı adı gereklidir', 'error');
            return;
        }

        if (password !== confirmPassword) {
            this.showToast('Şifreler eşleşmiyor', 'error');
            return;
        }

        try {
            const response = await fetch('/api/auth/register', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ name, email, password })
            });

            const result = await response.json();

            if (result.success) {
                this.hideSignUpModal();
                this.showToast('Hesabınız başarıyla oluşturuldu! Giriş yapabilirsiniz.', 'success');
                this.showLoginModal();
            } else {
                this.showToast(result.error || 'Hesap oluşturulamadı', 'error');
            }
        } catch (error) {
            console.error('SignUp error:', error);
            this.showToast('Bir hata oluştu. Lütfen tekrar deneyin.', 'error');
        }
    }
//Yeni hesap oluşturma. Şifre kontrolü yapar, başarılıysa Login modal'ına yönlendirir.
    async handleForgotPassword(e) {
        e.preventDefault();

        const email = document.getElementById('forgotEmail').value;

        try {
            const response = await fetch('/api/auth/forgot-password', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email })
            });

            const result = await response.json();

            if (result.success) {
                this.hideForgotPasswordModal();
                this.showToast('Şifre sıfırlama bağlantısı e-mail adresinize gönderildi.', 'success');
            } else {
                this.showToast(result.error || 'Şifre sıfırlama isteği gönderilemedi', 'error');
            }
        } catch (error) {
            console.error('Forgot password error:', error);
            this.showToast('Bir hata oluştu. Lütfen tekrar deneyin.', 'error');
        }
    }

    // URL kısaltma işlemini gerçekleştir
    async handleSubmit(e) {
        e.preventDefault();

        const originalUrl = document.getElementById('originalUrl').value.trim();
        //trim() nedir?
        // Başındaki ve sonundaki boşlukları temizler
        // " google.com " → "google.com"
        const urlTitle = document.getElementById('urlTitle').value.trim();
        const customCode = document.getElementById('customCode').value.trim();
        const selectedDomain = document.getElementById('domainSelect').value; // Domain seçimi eklendi
// URL boş mu kontrol et
        if (!originalUrl) {
            this.showToast('Lütfen geçerli bir URL girin', 'error');
            return;
        }

        const submitBtn = document.getElementById('submitBtn');
        const originalText = submitBtn.textContent;

        try {
            submitBtn.textContent = 'Kısaltılıyor...';
            submitBtn.disabled = true;

            const requestBody = {
                original_url: originalUrl,
                title: urlTitle || 'Untitled',
                domain: selectedDomain // Domain bilgisi eklendi
            };

            if (customCode) {
                requestBody.custom_code = customCode;
            }
//servere gönder
            const response = await fetch('/api/urls/shorten', {
                method: 'POST',
                headers: this.getAuthHeaders(),
                body: JSON.stringify(requestBody)
            });

            const result = await response.json();

            if (result.success) {
                this.currentShortCode = result.data.short_code;
                this.showResult(result.data.short_url);
                this.loadUrls(); // URL listesini güncelle
                document.getElementById('urlForm').reset();
                this.hideAdvancedOptions();
                this.showToast(`Link başarıyla kısaltıldı: ${urlTitle || 'Untitled'}`, 'success');
            } else {
                this.showToast(result.error || 'URL kısaltılamadı', 'error');
            }
        } catch (error) {
            console.error('Shorten URL error:', error);
            this.showToast('Bağlantı hatası. Lütfen tekrar deneyin.', 'error');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    // Sonucu göster
    showResult(shortUrl) {
        const resultSection = document.getElementById('resultSection');
        const shortUrlInput = document.getElementById('shortUrl');

        if (resultSection && shortUrlInput) {
            shortUrlInput.value = shortUrl;
            resultSection.classList.remove('hidden');
            resultSection.scrollIntoView({ behavior: 'smooth' });
        }
    }
    //Validation nedir?
    // Kullanıcı girişini kontrol etmek
    // Boş URL gönderilmesini engeller

    // Gelişmiş seçenekleri aç/kapat
    toggleAdvancedOptions() {
        const advancedOptions = document.getElementById('advancedOptions');
        const toggle = document.getElementById('advancedToggle');

        if (advancedOptions) {
            if (advancedOptions.classList.contains('show')) {
                advancedOptions.classList.remove('show');
                advancedOptions.style.display = 'none';
                toggle.innerHTML = '<i class="fas fa-cog"></i> Customize';
            } else {
                advancedOptions.classList.add('show');
                advancedOptions.style.display = 'block';
                toggle.innerHTML = '<i class="fas fa-times"></i> Close';
            }
        }
    }
//Neden var?
// Custom kod, domain seçimi gibi gelişmiş seçenekler
// Temel kullanıcılar için basit arayüz
// İleri kullanıcılar için detaylı seçenekler

    hideAdvancedOptions() {
        const advancedOptions = document.getElementById('advancedOptions');
        const toggle = document.getElementById('advancedToggle');

        if (advancedOptions) {
            advancedOptions.classList.remove('show');
            advancedOptions.style.display = 'none';
            toggle.innerHTML = '<i class="fas fa-cog"></i> Customize';
        }
    }

    // kopyalama özelliği

    async copyToClipboard() {
        const shortUrlInput = document.getElementById('shortUrl');
        const copyBtn = document.getElementById('copyBtn');

        if (shortUrlInput) {
            try {
                await navigator.clipboard.writeText(shortUrlInput.value);
                const originalText = copyBtn.innerHTML;
                copyBtn.innerHTML = '<i class="fas fa-check"></i> Copied!';
                copyBtn.classList.add('copied');

                setTimeout(() => {
                    copyBtn.innerHTML = originalText;
                    copyBtn.classList.remove('copied');
                }, 2000);

                this.showToast('Link kopyalandı!', 'success');
            } catch (error) {
                console.error('Copy failed:', error);
                // Fallback for older browsers
                shortUrlInput.select();
                document.execCommand('copy');
                this.showToast('Link kopyalandı!', 'success');
            }
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
                this.showToast(result.error || 'URL listesi yüklenemedi', 'error');
            }
        } catch (error) {
            console.error('❌ Load URLs error:', error);
            this.showToast('Bağlantı hatası', 'error');
        }
    }

    // URL listesini oluştur
    renderUrls(urls) {
        const urlsList = document.getElementById('urlsList');
        if (!urlsList) return;

        // Giriş yapmamış kullanıcı için özel mesaj
        if (!this.authToken) {
            urlsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-lock"></i>
                    </div>
                    <h3>Log in to view your links</h3>
                    <p>Please sign in to view and manage your shortened links.</p>
                    <div style="margin-top: 20px;">
                        <button class="btn-login-extra-small" onclick="urlShortener.showSignUpModal()">
                            <i class="fas fa-log-in-alt"></i> Log In
                        </button>
                    </div>
                </div>
            `;
            return;
        }

        // Giriş yapmış kullanıcı ama URL'i yok
        if (!urls || urls.length === 0) {
            urlsList.innerHTML = `
                <div class="empty-state">
                    <div class="empty-icon">
                        <i class="fas fa-link"></i>
                    </div>
                    <h3>Henüz kısaltılmış link yok</h3>
                    <p>İlk linkinizi kısaltmak için yukarıdaki formu kullanın.</p>
                </div>
            `;
            return;
        }

        // URL'leri listele
        urlsList.innerHTML = urls.map(url => {
            // Doğru kısa URL'i oluştur - backend'den gelen short_url'i kullan
            const shortUrl = url.short_url || `${window.location.origin}/${url.short_code}`;
            const displayUrl = url.display_url || `x.ly/${url.short_code}`;

            return `
            <div class="link-item" data-id="${url.id}">
                <div class="link-header">
                    <div class="link-info">
                        <h3>${url.title || 'Untitled'}</h3>
                        <a href="${shortUrl}" target="_blank" class="link-url">${displayUrl}</a>
                        <div class="link-original">${url.original_url}</div>
                    </div>
                    <div class="link-actions">
                        <button class="btn btn-outline-sm copy-btn" data-url="${shortUrl}">
                            <i class="fas fa-copy"></i>
                            Copy
                        </button>
                        <button class="btn btn-outline-sm edit-btn" data-id="${url.id}" data-title="${url.title || 'Untitled'}">
                            <i class="fas fa-edit"></i>
                            Edit
                        </button>
                        <button class="btn btn-outline-sm delete-btn" data-id="${url.id}" data-title="${url.title || 'Untitled'}">
                            <i class="fas fa-trash"></i>
                            Delete
                        </button>
                    </div>
                </div>
                <div class="link-stats">
                    <div class="stat-item">
                        <i class="fas fa-mouse-pointer"></i>
                        <span class="stat-value">${url.clicks || 0}</span>
                        <span>click${(url.clicks || 0) !== 1 ? 's' : ''}</span>
                    </div>
                    <div class="stat-item">
                        <i class="fas fa-calendar"></i>
                        <span>${this.formatDate(url.created_at)}</span>
                    </div>
                </div>
            </div>
            `;
        }).join('');

        // Event delegation ile buton olaylarını bağla
        this.bindUrlListEvents();
    }

    // URL listesi için olayları bağla (event delegation)
    bindUrlListEvents() {
        const urlsList = document.getElementById('urlsList');
        if (!urlsList) return;

        // Önceki event listener'ları temizle
        urlsList.removeEventListener('click', this.handleUrlListClick);

        // Event delegation ile tek bir listener ekle
        this.handleUrlListClick = (e) => {
            e.preventDefault();
            e.stopPropagation();

            const target = e.target.closest('button');
            if (!target) return;

            if (target.classList.contains('copy-btn')) {
                const shortUrl = target.getAttribute('data-url');
                console.log('Copy button clicked, URL:', shortUrl);
                this.copyShortUrl(shortUrl);
            } else if (target.classList.contains('edit-btn')) {
                const urlId = target.getAttribute('data-id');
                const currentTitle = target.getAttribute('data-title');
                console.log('Edit button clicked, ID:', urlId, 'Title:', currentTitle);
                this.editTitle(urlId, currentTitle);
            } else if (target.classList.contains('delete-btn')) {
                const urlId = target.getAttribute('data-id');
                const urlTitle = target.getAttribute('data-title');
                console.log('Delete button clicked, ID:', urlId, 'Title:', urlTitle);
                this.confirmDeleteUrl(urlId, urlTitle);
            }
        };

        urlsList.addEventListener('click', this.handleUrlListClick);
    }

    // Kısa URL'yi kopyala (copy tuşu)
    async copyShortUrl(shortUrl) {
        try {
            await navigator.clipboard.writeText(shortUrl);
            this.showToast('Kısa URL kopyalandı!', 'success');
        } catch (error) {
            console.error('Copy failed:', error);
            // Fallback for older browsers
            const textArea = document.createElement('textarea');
            textArea.value = shortUrl;
            document.body.appendChild(textArea);
            textArea.select();
            try {
                document.execCommand('copy');
                this.showToast('Kısa URL kopyalandı!', 'success');
            } catch (fallbackError) {
                this.showToast('Kopyalama başarısız', 'error');
            }
            document.body.removeChild(textArea);
        }
    }

    // Başlığı düzenle (edit tuşu)
    editTitle(urlId, currentTitle) {
        // Mevcut başlığı temizle (HTML encode edilmişse decode et)
        const cleanTitle = currentTitle.replace(/&#39;/g, "'");
        const displayTitle = cleanTitle === 'Untitled' ? '' : cleanTitle;

        const newTitle = prompt('Yeni başlık girin:', displayTitle);

        if (newTitle !== null) { // Kullanıcı Cancel'a basmadıysa
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
                this.showToast('Başlık başarıyla güncellendi!', 'success');
                this.loadUrls(); // URL listesini yenile
            } else {
                this.showToast(result.error || 'Başlık güncellenemedi', 'error');
            }
        } catch (error) {
            console.error('Update title error:', error);
            this.showToast('Başlık güncellenemedi', 'error');
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
                this.showToast('URL başarıyla silindi.', 'success');
                this.loadUrls(); // URL listesini yenile
            } else {
                this.showToast(result.error || 'URL silinemedi', 'error');
            }
        } catch (error) {
            console.error('Delete URL error:', error);
            this.showToast('URL silinemedi', 'error');
        }
    }

    // Logout fonksiyonu
    logout() {
        this.authToken = null;
        this.currentUser = null;
        localStorage.removeItem('authToken');
        sessionStorage.removeItem('authToken');
        this.updateAuthUI(false); // UI'ı güncelle
        this.loadUrls(); // URL listesini yenile
        this.showToast('Başarıyla çıkış yaptınız.', 'info');
    }

    // Tarih formatla
    formatDate(dateString) {
        if (!dateString) return 'Bilinmiyor';

        const date = new Date(dateString);
        const now = new Date();
        const diffTime = Math.abs(now - date);
        const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            return 'Bugün';
        } else if (diffDays === 2) {
            return 'Dün';
        } else if (diffDays <= 7) {
            return `${diffDays - 1} gün önce`;
        } else {
            return date.toLocaleDateString('tr-TR');
        }
    }

    // Modal kapatma
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

        toast.innerHTML = `
            <div class="toast-content">
                <i class="${iconMap[type] || iconMap.info}"></i>
                <span>${message}</span>
            </div>
            <button class="toast-close">&times;</button>
        `;

        container.appendChild(toast);

        // Animasyon için setTimeout
        setTimeout(() => toast.classList.add('show'), 100);

        // Otomatik kaldırma
        const autoRemove = setTimeout(() => {
            this.removeToast(toast);
        }, 5000);

        // Manuel kaldırma
        toast.querySelector('.toast-close').addEventListener('click', () => {
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

    // HTML özel karakterlerini kaçış karakterleriyle değiştir
    escapeHtml(unsafe) {
        return unsafe
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;")
            .replace(/"/g, "&quot;")
            .replace(/'/g, "&#039;");
    }
}

// Initialize the application
const urlShortener = new UrlShortener();
