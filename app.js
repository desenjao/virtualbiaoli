// App state
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let userProfile = JSON.parse(localStorage.getItem('userProfile')) || null;
let currentCategory = 'all';
let products = [];
let categories = [];

// Initialize app
document.addEventListener('DOMContentLoaded', async function() {
    lucide.createIcons();
    await loadDataFromJSON();
    createDynamicCategories();
    loadProductsByCategory();
    updateCartCount();
    setupEventListeners();
    setupFormMasks();
    initOrderModalListeners();
    initProductModalListeners(); // ← ADICIONAR ESTA LINHA
});

// Load categories and products from JSON
async function loadDataFromJSON() {
    try {
        console.log('Carregando dados do JSON...');
        const response = await fetch('./data/produtos.json');
        
        if (!response.ok) {
            throw new Error(`Erro HTTP: ${response.status}`);
        }
        
        const data = await response.json();
        
        // Carregar categorias
        categories = data.categorias || [];
        console.log(`✅ ${categories.length} categorias carregadas`);
        
        // Carregar produtos
        products = data.produtos || data;
        console.log(`✅ ${products.length} produtos carregados`);
        
    } catch (error) {
        console.error('❌ Erro ao carregar dados:', error);
        categories = getFallbackCategories();
        products = getFallbackProducts();
    }
}

// Create categories dynamically
function createDynamicCategories() {
    const categoriesNav = document.querySelector('.categories');
    const mainContainer = document.querySelector('main') || document.body;
    
    // Limpar categorias existentes (exceto "Todos")
    const existingCategories = categoriesNav.querySelectorAll('.category-nav:not([data-category="all"])');
    existingCategories.forEach(cat => cat.remove());
    
    // Limpar seções existentes (exceto hero, how-it-works, footer)
    const existingSections = document.querySelectorAll('.category-section');
    existingSections.forEach(section => section.remove());
    
    // Adicionar categorias dinamicamente
    categories.forEach(category => {
        // Adicionar ao navigation
        const navItem = document.createElement('div');
        navItem.className = 'category-nav';
        navItem.setAttribute('data-category', category.id);
        navItem.innerHTML = `
            <i data-lucide="${category.icone}" class="category-icon"></i>
            <span class="category-name">${category.nome}</span>
        `;
        categoriesNav.appendChild(navItem);
        
        // Adicionar seção de produtos
        const section = document.createElement('section');
        section.className = 'category-section';
        section.id = `${category.id}-section`;
        section.innerHTML = `
            <div class="category-header">
                <h2>${category.nome}</h2>
                <button class="ver-mais" data-category="${category.id}">
                    Ver mais
                    <i data-lucide="chevron-right"></i>
                </button>
            </div>
            <div class="carousel-container">
                <div class="carousel" id="${category.id}-carousel">
                    <div class="loading">Carregando produtos...</div>
                </div>
            </div>
        `;
        
        // Inserir antes da seção "How it works"
        const howItWorks = document.querySelector('.how-it-works');
        if (howItWorks) {
            howItWorks.before(section);
        } else {
            // Fallback: adicionar antes do footer
            const footer = document.querySelector('footer');
            footer.before(section);
        }
    });
    
    // Re-inicializar ícones
    lucide.createIcons();
}

// Load products by category into dynamic carousels
// Load products by category into dynamic carousels
function loadProductsByCategory() {
    if (products.length === 0) {
        console.warn('⚠️ Nenhum produto carregado');
        return;
    }

    categories.forEach(category => {
        const carousel = document.getElementById(`${category.id}-carousel`);
        if (!carousel) {
            console.warn(`Carrossel não encontrado: ${category.id}`);
            return;
        }
        
        const categoryProducts = products.filter(p => p.category === category.id);
        
        // Limpar conteúdo existente
        carousel.innerHTML = '';
        
        if (categoryProducts.length === 0) {
            carousel.innerHTML = `
                <div style="text-align: center; padding: 40px; color: #666;">
                    <i data-lucide="package" width="32" height="32"></i>
                    <p>Nenhum produto disponível</p>
                </div>
            `;
        } else {
            // Adicionar produtos ao carrossel
            categoryProducts.forEach(product => {
                const card = document.createElement('div');
                card.className = 'product-card';
                card.innerHTML = `
                    <div class="product-image-container">
                        <img src="${product.image}" alt="${product.name}" class="product-image">
                    </div>
                    <div class="product-info">
                        <h3 class="product-name">${product.name}</h3>
                        <div class="product-price">R$ ${product.price.toFixed(2).replace('.', ',')}</div>
                        <button class="add-to-cart" data-id="${product.id}">
                            <i data-lucide="shopping-bag"></i>
                            Adicionar
                        </button>
                    </div>
                `;
                carousel.appendChild(card);
                
                // Adicionar evento de clique na imagem e no nome do produto
                const image = card.querySelector('.product-image-container');
                const name = card.querySelector('.product-name');
                
                [image, name].forEach(element => {
                    element.style.cursor = 'pointer';
                    element.addEventListener('click', () => {
                        openProductModal(product.id);
                    });
                });
            });
        }
    });
    
    // Re-inicializar ícones
    lucide.createIcons();
    
    // Adicionar event listeners aos botões de adicionar ao carrinho
    document.querySelectorAll('.add-to-cart').forEach(btn => {
        btn.addEventListener('click', (e) => {
            e.stopPropagation(); // Impedir que clique no botão abra o modal
            const id = parseInt(e.currentTarget.getAttribute('data-id'));
            addToCart(id);
        });
    });
}

// ✅ ABRIR MODAL DO PRODUTO
function openProductModal(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) {
        console.error('Produto não encontrado:', productId);
        return;
    }
    
    // Preencher informações do modal
    document.getElementById('modalProductImage').src = product.image;
    document.getElementById('modalProductImage').alt = product.name;
    document.getElementById('modalProductName').textContent = product.name;
    document.getElementById('modalProductPrice').textContent = `R$ ${product.price.toFixed(2).replace('.', ',')}`;
    document.getElementById('modalProductDescription').textContent = product.description || 'Descrição não disponível.';
    
    // Configurar botão de adicionar ao carrinho
    const addToCartBtn = document.getElementById('addToCartFromModal');
    addToCartBtn.onclick = () => {
        addToCart(product.id);
        closeProductModal();
    };
    
    // Mostrar modal
    const modal = document.getElementById('productModal');
    modal.classList.add('active');
    
    // Atualizar ícones
    lucide.createIcons();
}

// ✅ FECHAR MODAL DO PRODUTO
function closeProductModal() {
    const modal = document.getElementById('productModal');
    modal.classList.remove('active');
}

// ✅ ADICIONAR EVENT LISTENERS PARA O MODAL DO PRODUTO
function initProductModalListeners() {
    // Fechar modal com botão X
    document.getElementById('closeProductModal').addEventListener('click', closeProductModal);
    
    // Fechar modal ao clicar fora
    document.getElementById('productModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeProductModal();
        }
    });
    
    // Fechar modal com ESC
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') {
            closeProductModal();
        }
    });
}

// Setup event listeners
function setupEventListeners() {
    // Category navigation - usa event delegation para categorias dinâmicas
    document.querySelector('.categories').addEventListener('click', (e) => {
        const categoryNav = e.target.closest('.category-nav');
        if (categoryNav) {
            document.querySelector('.category-nav.active')?.classList.remove('active');
            categoryNav.classList.add('active');
            currentCategory = categoryNav.getAttribute('data-category');
            
            if (currentCategory !== 'all') {
                const section = document.getElementById(`${currentCategory}-section`);
                if (section) {
                    section.scrollIntoView({ behavior: 'smooth' });
                }
            }
        }
    });

    // Cart button
    document.getElementById('cartBtn').addEventListener('click', openCartModal);
    document.getElementById('closeCart').addEventListener('click', closeCartModal);
    document.getElementById('checkoutBtn').addEventListener('click', checkout);
    
    // Search functionality
    document.querySelector('.search-button').addEventListener('click', performSearch);
    document.querySelector('.search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') performSearch();
    });
    
    // Ver mais buttons - VERSÃO FUNCIONAL
    document.addEventListener('click', (e) => {
        if (e.target.closest('.ver-mais')) {
            const btn = e.target.closest('.ver-mais');
            const category = btn.getAttribute('data-category');
            
            // Mapear categorias para URLs
            const categoryUrls = {
                'rings': 'categorias.html?category=rings',
                'earrings': 'categorias.html?category=earrings',
                'necklaces': 'categorias.html?category=necklaces', 
                'bracelets': 'categorias.html?category=bracelets',
                'sets': 'categorias.html?category=sets'
            };
            
            const url = categoryUrls[category];
            
            if (url) {
                console.log(`Redirecionando para: ${url}`);
                window.location.href = url;
            } else {
                console.error('Categoria não encontrada:', category);
                alert('Categoria não disponível no momento');
            }
        }
    });
}

// Setup form masks
function setupFormMasks() {
    const phoneInput = document.getElementById('userPhone');
    if (phoneInput) {
        phoneInput.addEventListener('input', function(e) {
            let value = e.target.value.replace(/\D/g, '');
            if (value.length <= 11) {
                value = value.replace(/(\d{2})(\d)/, '($1) $2');
                value = value.replace(/(\d{5})(\d)/, '$1-$2');
                e.target.value = value;
            }
        });
    }
}

// Fallback categories
function getFallbackCategories() {
    return [
        {
            id: 'rings',
            nome: 'Anéis',
            icone: 'circle',
            descricao: 'Anéis elegantes'
        },
        {
            id: 'earrings',
            nome: 'Brincos', 
            icone: 'gem',
            descricao: 'Brincos estilosos'
        },
        {
            id: 'necklaces',
            nome: 'Colares',
            icone: 'heart',
            descricao: 'Colares especiais'
        }
    ];
}

// Fallback products
function getFallbackProducts() {
    return [
        {
            id: 1,
            name: "Anel Solitário Prata",
            category: "rings",
            price: 89.90,
            image: "https://images.unsplash.com/photo-1605100804763-247f67b3557e?w=300",
            description: "Anel solitário em prata 925 com zircônia"
        },
        {
            id: 2,
            name: "Brincos Argola Prata",
            category: "earrings",
            price: 65.90,
            image: "https://images.unsplash.com/photo-1506634572416-48cdfe530110?w=300",
            description: "Brincos argola em prata 925"
        }
    ];
}

// Add to cart with animation
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    if (!product) {
        console.error(`Produto não encontrado: ${productId}`);
        return;
    }
    
    // Validar se o produto tem preço
    if (typeof product.price === 'undefined') {
        console.error('Produto sem preço definido:', product);
        showNotification('Erro: Produto sem preço definido', 'error');
        return;
    }
    
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity += 1;
    } else {
        // Garantir que todos os campos necessários estão presentes
        cart.push({
            id: product.id,
            name: product.name || 'Produto sem nome',
            price: product.price || 0,
            image: product.image || '',
            quantity: 1
        });
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    createFlyingAnimation(product);
    
    const btn = document.querySelector(`.add-to-cart[data-id="${productId}"]`);
    if (btn) {
        btn.innerHTML = '<i data-lucide="check"></i> Adicionado';
        btn.classList.add('added');
        setTimeout(() => {
            btn.innerHTML = '<i data-lucide="shopping-bag"></i> Adicionar';
            btn.classList.remove('added');
            lucide.createIcons();
        }, 2000);
    }
}

// Flying animation
function createFlyingAnimation(product) {
    const btn = document.querySelector(`.add-to-cart[data-id="${product.id}"]`);
    if (!btn) return;
    
    const rect = btn.getBoundingClientRect();
    
    const flyingItem = document.createElement('div');
    flyingItem.className = 'flying-item';
    flyingItem.innerHTML = `<img src="${product.image}" alt="${product.name}" />`;
    flyingItem.style.left = `${rect.left + rect.width/2 - 25}px`;
    flyingItem.style.top = `${rect.top + rect.height/2 - 25}px`;
    
    document.body.appendChild(flyingItem);
    
    const cartBtn = document.getElementById('cartBtn');
    const cartRect = cartBtn.getBoundingClientRect();
    
    setTimeout(() => {
        flyingItem.style.left = `${cartRect.left + cartRect.width/2 - 25}px`;
        flyingItem.style.top = `${cartRect.top + cartRect.height/2 - 25}px`;
        flyingItem.style.transform = 'scale(0.1)';
        flyingItem.style.opacity = '0.5';
    }, 10);
    
    setTimeout(() => {
        if (document.body.contains(flyingItem)) {
            document.body.removeChild(flyingItem);
        }
    }, 800);
}

// Update cart count
function updateCartCount() {
    const totalItems = cart.reduce((total, item) => total + (item.quantity || 0), 0);
    document.getElementById('cartCount').textContent = totalItems;
}

// Open cart modal
function openCartModal() {
    const modal = document.getElementById('cartModal');
    const cartItems = document.getElementById('cartItems');
    const cartTotal = document.getElementById('cartTotal');
    
    cartItems.innerHTML = '';
    
    if (cart.length === 0) {
        cartItems.innerHTML = '<p style="text-align: center; color: #666; padding: 40px 0;">Seu carrinho está vazio</p>';
    } else {
        // Add cart items - COM VALIDAÇÃO
        cart.forEach(item => {
            // Validar se o item tem todas as propriedades necessárias
            if (!item || typeof item.price === 'undefined') {
                console.warn('Item inválido no carrinho:', item);
                return; // Pular item inválido
            }
            
            const itemDiv = document.createElement('div');
            itemDiv.className = 'cart-item';
            itemDiv.innerHTML = `
                <img src="${item.image || ''}" alt="${item.name || 'Produto'}" class="cart-item-image">
                <div class="cart-item-details">
                    <div class="cart-item-name">${item.name || 'Produto sem nome'}</div>
                    <div class="cart-item-price">R$ ${(item.price || 0).toFixed(2).replace('.', ',')}</div>
                    <div class="cart-item-actions">
                        <button class="quantity-btn" data-id="${item.id}" data-action="decrease">-</button>
                        <span>${item.quantity || 1}</span>
                        <button class="quantity-btn" data-id="${item.id}" data-action="increase">+</button>
                        <button class="remove-btn" data-id="${item.id}">Remover</button>
                    </div>
                </div>
            `;
            cartItems.appendChild(itemDiv);
        });
        
        // Calculate total - COM VALIDAÇÃO
        const total = cart.reduce((sum, item) => {
            if (!item || typeof item.price === 'undefined') return sum;
            return sum + ((item.price || 0) * (item.quantity || 1));
        }, 0);
        
        cartTotal.textContent = `R$ ${total.toFixed(2).replace('.', ',')}`;
        
        // Add event listeners to quantity buttons
        document.querySelectorAll('.quantity-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.getAttribute('data-id'));
                const action = e.target.getAttribute('data-action');
                updateItemQuantity(id, action);
            });
        });
        
        // Add event listeners to remove buttons
        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const id = parseInt(e.target.getAttribute('data-id'));
                removeFromCart(id);
            });
        });
    }
    
    // Show modal
    modal.classList.add('active');
}

// Close cart modal
function closeCartModal() {
    document.getElementById('cartModal').classList.remove('active');
}

// Update item quantity
function updateItemQuantity(id, action) {
    const item = cart.find(item => item.id === id);
    if (!item) return;
    
    if (action === 'increase') {
        item.quantity += 1;
    } else if (action === 'decrease') {
        item.quantity -= 1;
        if (item.quantity <= 0) {
            removeFromCart(id);
            return;
        }
    }
    
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    openCartModal();
}

// Remove from cart
function removeFromCart(id) {
    cart = cart.filter(item => item.id !== id);
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    openCartModal();
}

// Search functionality
function performSearch() {
    const query = document.querySelector('.search-input').value.trim().toLowerCase();
    if (!query) return;
    alert(`Buscando por: ${query}`);
}

// ✅ **CHECKOUT IMPROVED - FUNCIONALIDADE PRINCIPAL**
function checkout() {
    if (cart.length === 0) {
        showNotification('Seu carrinho está vazio!', 'error');
        return;
    }
    
    if (!isProfileComplete()) {
        openProfileModal();
        return;
    }
    
    showOrderConfirmation();
}

// ✅ FUNÇÃO DO MODAL DE CONFIRMAÇÃO
function showOrderConfirmation() {
    const orderItemsList = document.getElementById('orderItemsList');
    const orderTotalPrice = document.getElementById('orderTotalPrice');
    
    // Limpar lista anterior
    orderItemsList.innerHTML = '';
    
    // Adicionar itens do carrinho com detalhes completos
    cart.forEach(item => {
        const orderItem = document.createElement('div');
        orderItem.className = 'order-item';
        orderItem.innerHTML = `
            <div class="order-item-info">
                <span class="order-item-name">${item.name}</span>
                <div class="order-item-details">
                    <span class="order-item-quantity">Qtd: ${item.quantity}</span>
                    <span class="order-item-unit">• R$ ${item.price.toFixed(2)} cada</span>
                </div>
            </div>
            <span class="order-item-price">R$ ${(item.price * item.quantity).toFixed(2)}</span>
        `;
        orderItemsList.appendChild(orderItem);
    });
    
    // Atualizar total
    orderTotalPrice.textContent = `R$ ${calculateTotal().toFixed(2)}`;
    
    // Mostrar modal
    const modal = document.getElementById('orderConfirmModal');
    modal.classList.add('active');
    
    // Atualizar ícones do Lucide
    if (window.lucide) {
        lucide.createIcons();
    }
}

// ✅ CALCULAR TOTAL DO CARRINHO
function calculateTotal() {
    return cart.reduce((total, item) => total + (item.price * item.quantity), 0);
}

// ✅ FECHAR MODAL DE CONFIRMAÇÃO
function closeOrderModal() {
    const modal = document.getElementById('orderConfirmModal');
    modal.classList.remove('active');
}

// ✅ CONFIRMAR PEDIDO (quando usuário clica no botão verde)
function confirmOrder() {
    sendWhatsAppOrder();
    closeOrderModal();
}

// ✅ EVENT LISTENERS PARA O MODAL
function initOrderModalListeners() {
    // Confirmar pedido
    document.getElementById('confirmOrder').addEventListener('click', confirmOrder);
    
    // Cancelar pedido
    document.getElementById('cancelOrder').addEventListener('click', closeOrderModal);
    
    // Fechar modal ao clicar no overlay (fora do modal)
    document.getElementById('orderConfirmModal').addEventListener('click', function(e) {
        if (e.target === this) {
            closeOrderModal();
        }
    });
}

// ✅ FUNÇÃO DE PERFIL
function isProfileComplete() {
    return userProfile && 
           userProfile.name && 
           userProfile.phone && 
           userProfile.address && 
           userProfile.payment;
}

// ✅ **ENVIAR PEDIDO VIA WHATSAPP**
function sendWhatsAppOrder() {
    const total = calculateTotal();
    
    // Format WhatsApp message
    let message = `🛍️ *PEDIDO - BIAOLI SEMIJOIAS*%0A%0A`;
    
    message += `*📋 ITENS DO PEDIDO:*%0A`;
    cart.forEach((item, index) => {
        message += `${index + 1}. ${item.name}%0A`;
        message += `   Quantidade: ${item.quantity}x%0A`;
        message += `   Valor: R$ ${(item.price * item.quantity).toFixed(2).replace('.', ',')}%0A%0A`;
    });
    
    message += `*💰 VALOR TOTAL: R$ ${total.toFixed(2).replace('.', ',')}*%0A%0A`;
    
    message += `*👤 DADOS DO CLIENTE:*%0A`;
    message += `• Nome: ${userProfile.name}%0A`;
    message += `• E-mail: ${userProfile.email || 'Não informado'}%0A`;
    message += `• Telefone: ${userProfile.phone}%0A`;
    message += `• Endereço: ${userProfile.address}%0A`;
    message += `• Pagamento: ${getPaymentMethodText(userProfile.payment)}%0A%0A`;
    
    message += `*⏰ INFORMAÇÕES:*%0A`;
    message += `Pedido realizado em: ${new Date().toLocaleString('pt-BR')}%0A`;
    message += `Prazo de entrega: 5-7 dias úteis%0A%0A`;
    
    message += `Obrigada pela preferência! 💎`;
    
    // WhatsApp number - ALTERE PARA SEU NÚMERO
    const whatsappNumber = '5511999999999'; // ← MUDE AQUI
    const whatsappUrl = `https://wa.me/${whatsappNumber}?text=${message}`;
    
    // Clear cart and show success message
    cart = [];
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartCount();
    closeCartModal();
    
    showNotification('Pedido enviado! Redirecionando para WhatsApp...', 'success');
    
    // Open WhatsApp after short delay
    setTimeout(() => {
        window.open(whatsappUrl, '_blank');
    }, 1500);
}

// Get payment method text
function getPaymentMethodText(payment) {
    const methods = {
        'pix': 'PIX',
        'cartao': 'Cartão de Crédito',
        'boleto': 'Boleto Bancário'
    };
    return methods[payment] || payment;
}

// Show notification
function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i data-lucide="${type === 'success' ? 'check-circle' : type === 'error' ? 'alert-circle' : 'info'}"></i>
            <span>${message}</span>
        </div>
    `;
    
    document.body.appendChild(notification);
    
    // Show notification
    setTimeout(() => notification.classList.add('show'), 100);
    
    // Remove after 4 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (document.body.contains(notification)) {
                document.body.removeChild(notification);
            }
        }, 300);
    }, 4000);
    
    // Initialize icons
    lucide.createIcons();
}

// Open profile modal
function openProfileModal() {
    const modal = document.getElementById('profileModal');
    
    if (userProfile) {
        document.getElementById('userName').value = userProfile.name || '';
        document.getElementById('userEmail').value = userProfile.email || '';
        document.getElementById('userPhone').value = userProfile.phone || '';
        document.getElementById('userAddress').value = userProfile.address || '';
        document.getElementById('userPayment').value = userProfile.payment || '';
    }
    
    document.getElementById('profileForm').onsubmit = (e) => {
        e.preventDefault();
        saveProfile();
    };
    
    document.getElementById('closeProfile').onclick = closeProfileModal;
    modal.classList.add('active');
}

// Close profile modal
function closeProfileModal() {
    document.getElementById('profileModal').classList.remove('active');
}

// Save user profile
function saveProfile() {
    const name = document.getElementById('userName').value.trim();
    const email = document.getElementById('userEmail').value.trim();
    const phone = document.getElementById('userPhone').value.trim();
    const address = document.getElementById('userAddress').value.trim();
    const payment = document.getElementById('userPayment').value;
    
    // Basic validation
    if (!name || !phone || !address || !payment) {
        showNotification('Preencha todos os campos obrigatórios!', 'error');
        return;
    }
    
    userProfile = { name, email, phone, address, payment };
    localStorage.setItem('userProfile', JSON.stringify(userProfile));
    closeProfileModal();
    
    showNotification('Perfil salvo com sucesso!', 'success');
    
    // Continue to checkout
    setTimeout(() => checkout(), 1000);
}