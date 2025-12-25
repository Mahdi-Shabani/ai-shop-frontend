

// ===== تنظیمات اولیه =====
const CONFIG = {
    // آدرس پیش‌فرض API (قابل تغییر توسط کاربر)
    apiBaseUrl: localStorage.getItem('apiUrl') || 'http://127.0.0.1:8000',
    
    // مسیرهای API
    endpoints: {
        chat: '/api/v1/chatbot/chat',
        products: '/api/v1/chatbot/products'
    },
    
    // تنظیمات چت
    typingDelay: 500,  // تاخیر نمایش "در حال تایپ"
    
    // پیام‌های سیستم
    messages: {
        error: 'متأسفم، مشکلی پیش آمد. لطفاً دوباره تلاش کنید.',
        offline: 'اتصال به سرور برقرار نیست.',
        empty: 'لطفاً پیام خود را وارد کنید.'
    }
};

// ===== انتخاب المان‌ها =====
const elements = {
    // ناوبری
    btnChat: document.getElementById('btn-chat'),
    btnProducts: document.getElementById('btn-products'),
    
    // بخش‌ها
    chatSection: document.getElementById('chat-section'),
    productsSection: document.getElementById('products-section'),
    
    // چت
    chatMessages: document.getElementById('chat-messages'),
    chatForm: document.getElementById('chat-form'),
    messageInput: document.getElementById('message-input'),
    sendBtn: document.getElementById('send-btn'),
    
    // محصولات
    productsGrid: document.getElementById('products-grid'),
    refreshProducts: document.getElementById('refresh-products'),
    
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
 * @param {string} endpoint - مسیر API
 * @returns {string} - URL کامل
 */
function getApiUrl(endpoint) {
    return `${CONFIG.apiBaseUrl}${endpoint}`;
}

/**
 * فرمت کردن قیمت به تومان
 * @param {number} price - قیمت
 * @returns {string} - قیمت فرمت شده
 */
function formatPrice(price) {
    if (!price && price !== 0) return 'تماس بگیرید';
    return new Intl.NumberFormat('fa-IR').format(price);
}

/**
 * اسکرول به پایین چت
 */
function scrollToBottom() {
    elements.chatMessages.scrollTop = elements.chatMessages.scrollHeight;
}

/**
 * غیرفعال/فعال کردن دکمه ارسال
 * @param {boolean} disabled - وضعیت
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
 * @param {string} section - نام بخش ('chat' یا 'products')
 */
function switchSection(section) {
    // حذف کلاس active از همه
    elements.btnChat.classList.remove('active');
    elements.btnProducts.classList.remove('active');
    elements.chatSection.classList.remove('active');
    elements.productsSection.classList.remove('active');
    
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
    }
}

// رویدادهای ناوبری
elements.btnChat.addEventListener('click', () => switchSection('chat'));
elements.btnProducts.addEventListener('click', () => switchSection('products'));


/* ========================================
   سیستم چت
   ======================================== */

/**
 * افزودن پیام به چت
 * @param {string} content - محتوای پیام
 * @param {string} type - نوع پیام ('user' یا 'bot')
 * @returns {HTMLElement} - المان پیام
 */
function addMessage(content, type) {
    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${type}-message`;
    
    // آواتار
    const avatar = document.createElement('div');
    avatar.className = 'message-avatar';
    avatar.textContent = type === 'user' ? '👤' : '🤖';
    
    // محتوا
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    // پردازش متن (تبدیل خط جدید به <p>)
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
 * @returns {HTMLElement} - المان تایپینگ
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
 * @param {HTMLElement} typingElement - المان تایپینگ
 */
function removeTypingIndicator(typingElement) {
    if (typingElement && typingElement.parentNode) {
        typingElement.remove();
    }
}

/**
 * ارسال پیام به API و دریافت پاسخ
 * @param {string} message - پیام کاربر
 */
async function sendMessage(message) {
    // نمایش پیام کاربر
    addMessage(message, 'user');
    
    // غیرفعال کردن ورودی
    toggleSendButton(true);
    
    // نمایش تایپینگ
    const typingIndicator = showTypingIndicator();
    
    try {
        // ارسال درخواست به API
        const response = await fetch(getApiUrl(CONFIG.endpoints.chat), {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ message: message })
        });
        
        // بررسی پاسخ
        if (!response.ok) {
            throw new Error(`HTTP Error: ${response.status}`);
        }
        
        const data = await response.json();
        
        // حذف تایپینگ
        removeTypingIndicator(typingIndicator);
        
        // نمایش پاسخ بات
        const botResponse = data.response || data.message || 'پاسخی دریافت نشد.';
        addMessage(botResponse, 'bot');
        
    } catch (error) {
        console.error('Chat Error:', error);
        
        // حذف تایپینگ
        removeTypingIndicator(typingIndicator);
        
        // نمایش پیام خطا
        let errorMessage = CONFIG.messages.error;
        if (error.message.includes('Failed to fetch')) {
            errorMessage = CONFIG.messages.offline + ' آدرس API را بررسی کنید.';
        }
        addMessage(errorMessage, 'bot');
        
    } finally {
        // فعال کردن ورودی
        toggleSendButton(false);
        elements.messageInput.focus();
    }
}

// رویداد ارسال فرم
elements.chatForm.addEventListener('submit', (e) => {
    e.preventDefault();
    
    const message = elements.messageInput.value.trim();
    
    if (!message) {
        return;
    }
    
    // پاک کردن ورودی
    elements.messageInput.value = '';
    
    // ارسال پیام
    sendMessage(message);
});

// ارسال با Enter (پیش‌فرض فرم)
elements.messageInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        // فرم خودش هندل می‌کنه
    }
});


/* ========================================
   سیستم محصولات
   ======================================== */

/**
 * ساخت کارت محصول
 * @param {Object} product - اطلاعات محصول
 * @returns {HTMLElement} - کارت محصول
 */
function createProductCard(product) {
    const card = document.createElement('div');
    card.className = 'product-card';
    
    // تعیین وضعیت موجودی
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
    
    // تصویر پیش‌فرض
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
    
    // کلیک روی کارت برای سوال درباره محصول
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
 * @param {string} message - پیام خطا
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
        
        // استخراج لیست محصولات
        const products = data.products || data.data || data || [];
        
        if (products.length === 0) {
            showProductsError('محصولی یافت نشد.');
            return;
        }
        
        // پاک کردن گرید
        elements.productsGrid.innerHTML = '';
        
        // ساخت کارت‌ها
        products.forEach((product, index) => {
            const card = createProductCard(product);
            // انیمیشن ورود با تاخیر
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
    
    // ذخیره در localStorage
    localStorage.setItem('apiUrl', newUrl);
    CONFIG.apiBaseUrl = newUrl;
    
    // بستن مودال
    closeModal();
    
    // نمایش پیام موفقیت
    addMessage('✅ آدرس API با موفقیت تغییر کرد.', 'bot');
}

// رویدادهای مودال
elements.saveApiBtn.addEventListener('click', saveApiUrl);
elements.closeModalBtn.addEventListener('click', closeModal);

// بستن با کلیک بیرون مودال
elements.apiModal.addEventListener('click', (e) => {
    if (e.target === elements.apiModal) {
        closeModal();
    }
});

// بستن با ESC
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

// در دسترس قرار دادن توابع در window
window.loadProducts = loadProducts;
window.openModal = openModal;