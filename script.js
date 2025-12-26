const CONFIG = {
    // آدرس پیش‌فرض API
    apiBaseUrl: localStorage.getItem('apiUrl') || 'https://ai-shop-backend-z24o.onrender.com',
    
    // مسیرهای API
    endpoints: {
        chat: '/api/v1/chatbot/chat',
        products: '/api/v1/chatbot/products',
        dashboardSummary: '/api/v1/dashboard/summary',
        dashboardAnalyze: '/api/v1/dashboard/analyze'
    },
    
    // رمز ورود فروشنده
    sellerPassword: 'admin123',
    
    // تنظیمات چت
    typingDelay: 500,
    
    // پیام‌های سیستم
    messages: {
        error: 'متأسفم، مشکلی پیش آمد. لطفاً دوباره تلاش کنید.',
        offline: 'اتصال به سرور برقرار نیست.',
        empty: 'لطفاً پیام خود را وارد کنید.',
        wrongPassword: '❌ رمز عبور اشتباه است!',
        loginSuccess: '✅ ورود موفق!'
    }
};

// ===== وضعیت لاگین فروشنده =====
let isSellerLoggedIn = false;

// ===== انتخاب المان‌ها =====
const elements = {
    // ناوبری
    btnChat: document.getElementById('btn-chat'),
    btnProducts: document.getElementById('btn-products'),
    btnDashboard: document.getElementById('btn-dashboard'),
    
    // بخش‌ها
    chatSection: document.getElementById('chat-section'),
    productsSection: document.getElementById('products-section'),
    dashboardSection: document.getElementById('dashboard-section'),
    
    // چت
    chatMessages: document.getElementById('chat-messages'),
    chatForm: document.getElementById('chat-form'),
    messageInput: document.getElementById('message-input'),
    sendBtn: document.getElementById('send-btn'),
    
    // محصولات
    productsGrid: document.getElementById('products-grid'),
    refreshProducts: document.getElementById('refresh-products'),
    
    // داشبورد - لاگین
    dashboardLogin: document.getElementById('dashboard-login'),
    dashboardContent: document.getElementById('dashboard-content'),
    loginForm: document.getElementById('login-form'),
    dashboardPassword: document.getElementById('dashboard-password'),
    loginError: document.getElementById('login-error'),
    logoutBtn: document.getElementById('logout-btn'),
    
    // داشبورد - محتوا
    totalRevenue: document.getElementById('total-revenue'),
    totalOrders: document.getElementById('total-orders'),
    productsChart: document.getElementById('products-chart'),
    categoriesChart: document.getElementById('categories-chart'),
    aiAnalysis: document.getElementById('ai-analysis'),
    suggestionsList: document.getElementById('suggestions-list'),
    
    // مودال
    apiModal: document.getElementById('api-modal'),
    apiUrlInput: document.getElementById('api-url'),
    saveApiBtn: document.getElementById('save-api'),
    closeModalBtn: document.getElementById('close-modal')
};


/* ========================================
   توابع کمکی
   ======================================== */

/**
 * ساخت URL کامل API
 */
function getApiUrl(endpoint) {
    return `${CONFIG.apiBaseUrl}${endpoint}`;
}

/**
 * فرمت کردن قیمت به تومان
 */
function formatPrice(price) {
    if (!price && price !== 0) return 'تماس بگیرید';
    return new Intl.NumberFormat('fa-IR').format(price);
}

/**
 * فرمت کردن عدد بزرگ (میلیون/میلیارد)
 */
function formatLargeNumber(num) {
    if (num >= 1000000000) {
        return (num / 1000000000).toFixed(1) + ' میلیارد';
    } else if (num >= 1000000) {
        return (num / 1000000).toFixed(1) + ' میلیون';
    } else if (num >= 1000) {
        return (num / 1000).toFixed(1) + ' هزار';
    }
    return new Intl.NumberFormat('fa-IR').format(num);
}

/**
 * اسکرول به پایین چت
 */
function scrollToBottom() {
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

/**
 * غیرفعال/فعال کردن دکمه ارسال
 */
function toggleSendButton(disabled) {
    elements.sendBtn.disabled = disabled;
    elements.messageInput.disabled = disabled;
}


/* ========================================
   مدیریت ناوبری
   ======================================== */

/**
 * تغییر بخش فعال
 */
function switchSection(section) {
    // حذف کلاس active از همه
    elements.btnChat.classList.remove('active');
    elements.btnProducts.classList.remove('active');
    elements.btnDashboard.classList.remove('active');
    elements.chatSection.classList.remove('active');
    elements.productsSection.classList.remove('active');
    elements.dashboardSection.classList.remove('active');
    
    // فعال کردن بخش انتخاب شده
    if (section === 'chat') {
        elements.btnChat.classList.add('active');
        elements.chatSection.classList.add('active');
        elements.messageInput.focus();
    } else if (section === 'products') {
        elements.btnProducts.classList.add('active');
        elements.productsSection.classList.add('active');
        // لود محصولات اگر اولین بار است
        if (elements.productsGrid.querySelector('.loading-products')) {
            loadProducts();
        }
    } else if (section === 'dashboard') {
        elements.btnDashboard.classList.add('active');
        elements.dashboardSection.classList.add('active');
        
        // چک کردن وضعیت لاگین
        if (isSellerLoggedIn) {
            showDashboardContent();
        } else {
            showDashboardLogin();
        }
    }
}

// رویدادهای ناوبری
elements.btnChat.addEventListener('click', () => switchSection('chat'));
elements.btnProducts.addEventListener('click', () => switchSection('products'));
elements.btnDashboard.addEventListener('click', () => switchSection('dashboard'));


/* ========================================
   سیستم چت
   ======================================== */

/**
 * افزودن پیام به چت
 */
function addMessage(content, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = type === 'user' ? '👤' : '🤖';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    const paragraphs = content.split('\n').filter(p => p.trim());
    paragraphs.forEach(text => {
        const p = document.createElement('p');
        p.textContent = text;
        contentDiv.appendChild(p);
    });
    
    messageDiv.appendChild(avatar);
    messageDiv.appendChild(contentDiv);
    
    elements.chatMessages.appendChild(messageDiv);
    scrollToBottom();
    
    return messageDiv;
}

/**
 * نمایش انیمیشن "در حال تایپ"
 */
function showTypingIndicator() {
    const typingDiv = document.createElement('div');
    typingDiv.className = 'message bot-message typing';
    typingDiv.innerHTML = `
        <div class="message-avatar">🤖</div>
        <div class="message-content">
            <div class="typing-indicator">
                <span></span>
                <span></span>
                <span></span>
            </div>
        </div>
    `;
    
    elements.chatMessages.appendChild(typingDiv);
    scrollToBottom();
    
    return typingDiv;
}

/**
 * حذف انیمیشن تایپینگ
 */
function removeTypingIndicator(typingElement) {
    if (typingElement && typingElement.parentNode) {
        typingElement.remove();
    }
}

/**
 * ارسال پیام به API
 */
async function sendMessage(message) {
    addMessage(message, 'user');
    toggleSendButton(true);
    
    const typingIndicator = showTypingIndicator();
    
    try {
        const response = await fetch(getApiUrl(CONFIG.endpoints.chat), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: message })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        removeTypingIndicator(typingIndicator);
        
        const botResponse = data.response || data.message || 'پاسخی دریافت نشد.';
        addMessage(botResponse, 'bot');
        
    } catch (error) {
        console.error('Chat Error:', error);
        
        removeTypingIndicator(typingIndicator);
        
        let errorMessage = CONFIG.messages.error;
        if (error.message.includes('Failed to fetch')) {
            errorMessage = CONFIG.messages.offline + ' آدرس API را بررسی کنید.';
        }
        addMessage(errorMessage, 'bot');
        
    } finally {
        toggleSendButton(false);
        elements.messageInput.focus();
    }
}

// رویداد ارسال فرم چت
elements.chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const message = elements.messageInput.value.trim();
    
    if (!message) {
        return;
    }
    
    elements.messageInput.value = '';
    sendMessage(message);
});


/* ========================================
   سیستم محصولات
   ======================================== */

/**
 * ساخت کارت محصول
 */
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    let stockClass = 'in-stock';
    let stockText = 'موجود';
    
    const stock = parseInt(product.stock) || parseInt(product.inventory) || 0;
    
    if (stock === 0) {
        stockClass = 'out-of-stock';
        stockText = 'ناموجود';
    } else if (stock < 5) {
        stockClass = 'low-stock';
        stockText = `${stock} عدد`;
    }
    
    const imageUrl = product.image || product.image_url || 
        'https://via.placeholder.com/300x180/1a1a25/ff6b00?text=📦';
    
    card.innerHTML = `
        <img 
            src="${imageUrl}" 
            alt="${product.name || 'محصول'}" 
            class="product-image"
            onerror="this.src='https://via.placeholder.com/300x180/1a1a25/ff6b00?text=📦'"
        >
        <div class="product-info">
            <h3 class="product-name">${product.name || 'بدون نام'}</h3>
            <p class="product-description">${product.description || 'توضیحات موجود نیست'}</p>
            <div class="product-footer">
                <div class="product-price">
                    ${formatPrice(product.price)}
                    <span>تومان</span>
                </div>
                <span class="product-stock ${stockClass}">${stockText}</span>
            </div>
        </div>
    `;
    
    card.addEventListener('click', () => {
        switchSection('chat');
        const question = `درباره محصول "${product.name}" بیشتر توضیح بده`;
        elements.messageInput.value = question;
        elements.messageInput.focus();
    });
    
    return card;
}

/**
 * نمایش لودینگ محصولات
 */
function showProductsLoading() {
    elements.productsGrid.innerHTML = `
        <div class="loading-products">
            <div class="spinner"></div>
            <p>در حال بارگذاری محصولات...</p>
        </div>
    `;
}

/**
 * نمایش خطای محصولات
 */
function showProductsError(message) {
    elements.productsGrid.innerHTML = `
        <div class="error-message">
            <p>⚠️ ${message}</p>
            <button onclick="loadProducts()" class="btn btn-primary" style="margin-top: 1rem;">
                تلاش مجدد
            </button>
        </div>
    `;
}

/**
 * لود محصولات از API
 */
async function loadProducts() {
    showProductsLoading();
    
    try {
        const response = await fetch(getApiUrl(CONFIG.endpoints.products));
        
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        const products = data.products || data.data || data || [];
        
        if (products.length === 0) {
            showProductsError('محصولی یافت نشد.');
            return;
        }
        
        elements.productsGrid.innerHTML = '';
        
        products.forEach((product, index) => {
            const card = createProductCard(product);
            card.style.animationDelay = `${index * 0.1}s`;
            elements.productsGrid.appendChild(card);
        });
        
    } catch (error) {
        console.error('Products Error:', error);
        
        let errorMessage = 'خطا در بارگذاری محصولات';
        if (error.message.includes('Failed to fetch')) {
            errorMessage = 'اتصال به سرور برقرار نیست';
        }
        
        showProductsError(errorMessage);
    }
}

// رویداد رفرش محصولات
elements.refreshProducts.addEventListener('click', loadProducts);


/* ========================================
   سیستم داشبورد - جدید
   ======================================== */

/**
 * نمایش صفحه لاگین
 */
function showDashboardLogin() {
    elements.dashboardLogin.style.display = 'flex';
    elements.dashboardContent.style.display = 'none';
    elements.dashboardContent.classList.remove('active');
    elements.dashboardPassword.value = '';
    elements.loginError.textContent = '';
    elements.dashboardPassword.focus();
}

/**
 * نمایش محتوای داشبورد
 */
function showDashboardContent() {
    elements.dashboardLogin.style.display = 'none';
    elements.dashboardContent.style.display = 'block';
    elements.dashboardContent.classList.add('active');
    loadDashboard();
}

/**
 * چک کردن رمز عبور فروشنده
 */
function checkSellerPassword(password) {
    if (password === CONFIG.sellerPassword) {
        isSellerLoggedIn = true;
        elements.loginError.textContent = '';
        showDashboardContent();
        return true;
    } else {
        elements.loginError.textContent = CONFIG.messages.wrongPassword;
        elements.dashboardPassword.value = '';
        elements.dashboardPassword.focus();
        
        // لرزش کارت لاگین
        const loginCard = document.querySelector('.login-card');
        loginCard.style.animation = 'shake 0.5s ease';
        setTimeout(() => {
            loginCard.style.animation = '';
        }, 500);
        
        return false;
    }
}

/**
 * خروج فروشنده
 */
function logoutSeller() {
    isSellerLoggedIn = false;
    showDashboardLogin();
}

/**
 * لود داده‌های داشبورد
 */
async function loadDashboard() {
    // نمایش لودینگ
    showDashboardLoading();
    
    try {
        // دریافت خلاصه فروش
        const summaryResponse = await fetch(getApiUrl(CONFIG.endpoints.dashboardSummary));
        
        if (!summaryResponse.ok) {
            throw new Error(`HTTP Error: ${summaryResponse.status}`);
        }
        
        const summaryData = await summaryResponse.json();
        
        // نمایش آمار
        renderStats(summaryData);
        
        // نمایش نمودار محصولات
        renderChart('products-chart', summaryData.top_products, 'quantity', 'primary');
        
        // نمایش نمودار دسته‌بندی‌ها
        renderChart('categories-chart', summaryData.top_categories, 'quantity', 'accent');
        
        // دریافت تحلیل هوشمند
        loadAnalysis();
        
    } catch (error) {
        console.error('Dashboard Error:', error);
        showDashboardError();
    }
}

/**
 * نمایش لودینگ داشبورد
 */
function showDashboardLoading() {
    elements.totalRevenue.textContent = '...';
    elements.totalOrders.textContent = '...';
    
    const loadingHTML = `
        <div class="chart-loading">
            <div class="spinner"></div>
        </div>
    `;
    
    elements.productsChart.innerHTML = loadingHTML;
    elements.categoriesChart.innerHTML = loadingHTML;
    elements.aiAnalysis.innerHTML = `
        <div class="chart-loading">
            <div class="spinner"></div>
            <p>در حال تحلیل...</p>
        </div>
    `;
    elements.suggestionsList.innerHTML = '';
}

/**
 * نمایش خطای داشبورد
 */
function showDashboardError() {
    elements.totalRevenue.textContent = 'خطا';
    elements.totalOrders.textContent = 'خطا';
    
    const errorHTML = `
        <div class="chart-loading">
            <p>⚠️ خطا در بارگذاری</p>
            <button onclick="loadDashboard()" class="btn btn-primary" style="margin-top: 1rem;">
                تلاش مجدد
            </button>
        </div>
    `;
    
    elements.productsChart.innerHTML = errorHTML;
    elements.categoriesChart.innerHTML = errorHTML;
    elements.aiAnalysis.innerHTML = errorHTML;
}

/**
 * نمایش آمار
 */
function renderStats(data) {
    elements.totalRevenue.textContent = formatLargeNumber(data.total_revenue || 0);
    elements.totalOrders.textContent = new Intl.NumberFormat('fa-IR').format(data.total_orders || 0);
}

/**
 * رندر نمودار میله‌ای CSS
 */
function renderChart(containerId, data, valueKey, colorClass) {
    const container = document.getElementById(containerId);
    
    if (!data || data.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary);">داده‌ای موجود نیست</p>';
        return;
    }
    
    // پیدا کردن بیشترین مقدار برای محاسبه درصد
    const maxValue = Math.max(...data.map(item => item[valueKey] || 0));
    
    // رنگ‌های مختلف برای نوارها
    const colors = ['primary', 'accent', 'success', 'warning'];
    
    let html = '';
    
    data.forEach((item, index) => {
        const value = item[valueKey] || 0;
        const percentage = maxValue > 0 ? (value / maxValue) * 100 : 0;
        const barColor = colorClass === 'mixed' ? colors[index % colors.length] : colorClass;
        
        html += `
            <div class="bar-item">
                <span class="bar-label">${item.name || 'نامشخص'}</span>
                <div class="bar-container">
                    <div class="bar-fill ${barColor}" style="width: ${percentage}%"></div>
                </div>
                <span class="bar-value">${new Intl.NumberFormat('fa-IR').format(value)}</span>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

/**
 * لود تحلیل هوشمند
 */
async function loadAnalysis() {
    try {
        const response = await fetch(getApiUrl(CONFIG.endpoints.dashboardAnalyze), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ question: 'وضعیت فروش من چطوره؟ تحلیل کن و پیشنهاد بده.' })
        });
        
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // نمایش تحلیل
        renderAnalysis(data.analysis);
        
        // نمایش پیشنهادات
        renderSuggestions(data.suggestions);
        
    } catch (error) {
        console.error('Analysis Error:', error);
        elements.aiAnalysis.innerHTML = `
            <p>⚠️ خطا در دریافت تحلیل</p>
            <button onclick="loadAnalysis()" class="btn btn-primary" style="margin-top: 1rem;">
                تلاش مجدد
            </button>
        `;
    }
}

/**
 * نمایش تحلیل
 */
function renderAnalysis(analysis) {
    if (!analysis) {
        elements.aiAnalysis.innerHTML = '<p>تحلیلی موجود نیست.</p>';
        return;
    }
    
    const paragraphs = analysis.split('\n').filter(p => p.trim());
    let html = '';
    
    paragraphs.forEach(p => {
        html += `<p>${p}</p>`;
    });
    
    elements.aiAnalysis.innerHTML = html;
}

/**
 * نمایش پیشنهادات
 */
function renderSuggestions(suggestions) {
    if (!suggestions || suggestions.length === 0) {
        elements.suggestionsList.innerHTML = '<li class="suggestion-item"><span class="suggestion-text">پیشنهادی موجود نیست.</span></li>';
        return;
    }
    
    let html = '';
    
    suggestions.forEach(suggestion => {
        html += `
            <li class="suggestion-item">
                <span class="suggestion-icon">✅</span>
                <span class="suggestion-text">${suggestion}</span>
            </li>
        `;
    });
    
    elements.suggestionsList.innerHTML = html;
}

// رویداد فرم لاگین
elements.loginForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const password = elements.dashboardPassword.value.trim();
    checkSellerPassword(password);
});

// رویداد دکمه خروج
elements.logoutBtn.addEventListener('click', logoutSeller);


/* ========================================
   مودال تنظیمات API
   ======================================== */

/**
 * باز کردن مودال
 */
function openModal() {
    elements.apiUrlInput.value = CONFIG.apiBaseUrl;
    elements.apiModal.classList.add('active');
}

/**
 * بستن مودال
 */
function closeModal() {
    elements.apiModal.classList.remove('active');
}

/**
 * ذخیره آدرس API
 */
function saveApiUrl() {
    const newUrl = elements.apiUrlInput.value.trim();
    
    if (!newUrl) {
        alert('لطفاً آدرس API را وارد کنید');
        return;
    }
    
    localStorage.setItem('apiUrl', newUrl);
    CONFIG.apiBaseUrl = newUrl;
    
    closeModal();
    
    addMessage('✅ آدرس API با موفقیت تغییر کرد.', 'bot');
}

// رویدادهای مودال
elements.saveApiBtn.addEventListener('click', saveApiUrl);
elements.closeModalBtn.addEventListener('click', closeModal);

elements.apiModal.addEventListener('click', (e) => {
    if (e.target === elements.apiModal) {
        closeModal();
    }
});

document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && elements.apiModal.classList.contains('active')) {
        closeModal();
    }
});

// باز کردن مودال با دابل کلیک روی لوگو
document.querySelector('.logo').addEventListener('dblclick', openModal);


/* ========================================
   شروع برنامه
   ======================================== */

/**
 * راه‌اندازی اولیه
 */
function init() {
    console.log('🚀 فروشگاه هوشمند راه‌اندازی شد');
    console.log(`📡 API: ${CONFIG.apiBaseUrl}`);
    
    // فعال‌سازی آیکون‌های Feather
    if (typeof feather !== 'undefined') {
        feather.replace();
    }
    
    // فوکوس روی ورودی چت
    elements.messageInput.focus();
    
    // بررسی localStorage برای API URL
    const savedUrl = localStorage.getItem('apiUrl');
    if (savedUrl) {
        CONFIG.apiBaseUrl = savedUrl;
        console.log('✅ API URL از localStorage بارگذاری شد');
    }
}

// اجرای برنامه
document.addEventListener('DOMContentLoaded', init);


/* ========================================
   توابع عمومی (برای استفاده در HTML)
   ======================================== */

window.loadProducts = loadProducts;
window.loadDashboard = loadDashboard;
window.loadAnalysis = loadAnalysis;
window.openModal = openModal;


/* ========================================
   انیمیشن لرزش (برای خطای رمز)
   ======================================== */
const shakeStyle = document.createElement('style');
shakeStyle.textContent = `
    @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-5px); }
        20%, 40%, 60%, 80% { transform: translateX(5px); }
    }
`;
document.head.appendChild(shakeStyle);