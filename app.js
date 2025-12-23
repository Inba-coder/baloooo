// ============================================
// FRONTEND JAVASCRIPT FOR MANI CONSTRUCTION
// ============================================

class ManiConstructionAPI {
    constructor() {
        this.baseURL = 'http://localhost:3000/api';
        this.token = localStorage.getItem('authToken');
    }

    // Set authentication token
    setToken(token) {
        this.token = token;
        localStorage.setItem('authToken', token);
    }

    // Remove authentication token
    removeToken() {
        this.token = null;
        localStorage.removeItem('authToken');
    }

    // Make API request
    async makeRequest(endpoint, options = {}) {
        const url = `${this.baseURL}${endpoint}`;
        const config = {
            headers: {
                'Content-Type': 'application/json',
                ...(this.token && { 'Authorization': `Bearer ${this.token}` })
            },
            ...options
        };

        try {
            const response = await fetch(url, config);
            const data = await response.json();

            if (!response.ok) {
                throw new Error(data.error || 'Request failed');
            }

            return data;
        } catch (error) {
            console.error('API Error:', error);
            throw error;
        }
    }

    // Authentication methods
    async login(username, password) {
        const data = await this.makeRequest('/login', {
            method: 'POST',
            body: JSON.stringify({ username, password })
        });
        
        if (data.token) {
            this.setToken(data.token);
        }
        
        return data;
    }

    async register(userData) {
        const data = await this.makeRequest('/register', {
            method: 'POST',
            body: JSON.stringify(userData)
        });
        
        if (data.token) {
            this.setToken(data.token);
        }
        
        return data;
    }

    async logout() {
        this.removeToken();
        window.location.href = 'login.html';
    }

    // Product methods
    async getProducts() {
        return await this.makeRequest('/products');
    }

    async getProduct(id) {
        return await this.makeRequest(`/products/${id}`);
    }

    // Order methods
    async createOrder(orderData) {
        return await this.makeRequest('/orders', {
            method: 'POST',
            body: JSON.stringify(orderData)
        });
    }

    async getOrders() {
        return await this.makeRequest('/orders');
    }

    // Payment methods
    async processStripePayment(orderId, token) {
        return await this.makeRequest('/payments/stripe', {
            method: 'POST',
            body: JSON.stringify({ order_id: orderId, token })
        });
    }

    async processPayPalPayment(orderId, paymentId) {
        return await this.makeRequest('/payments/paypal', {
            method: 'POST',
            body: JSON.stringify({ order_id: orderId, payment_id: paymentId })
        });
    }

    // Contact method
    async sendContactMessage(messageData) {
        return await this.makeRequest('/contact', {
            method: 'POST',
            body: JSON.stringify(messageData)
        });
    }
}

// ============================================
// PAYMENT PROCESSING CLASS
// ============================================
class PaymentProcessor {
    constructor() {
        this.api = new ManiConstructionAPI();
        this.stripe = null;
        this.paypal = null;
    }

    // Initialize Stripe
    async initStripe(publishableKey) {
        if (typeof Stripe !== 'undefined') {
            this.stripe = Stripe(publishableKey);
        } else {
            console.error('Stripe library not loaded');
        }
    }

    // Initialize PayPal
    async initPayPal(clientId) {
        if (typeof paypal !== 'undefined') {
            this.paypal = paypal.Buttons({
                createOrder: (data, actions) => {
                    return actions.order.create({
                        purchase_units: [{
                            amount: {
                                value: this.currentAmount
                            }
                        }]
                    });
                },
                onApprove: async (data, actions) => {
                    try {
                        const order = await actions.order.capture();
                        await this.api.processPayPalPayment(this.currentOrderId, order.id);
                        this.showSuccessMessage('Payment processed successfully!');
                        this.redirectToSuccess();
                    } catch (error) {
                        this.showErrorMessage('Payment failed: ' + error.message);
                    }
                },
                onError: (err) => {
                    this.showErrorMessage('Payment error: ' + err.message);
                }
            });
        } else {
            console.error('PayPal library not loaded');
        }
    }

    // Process Stripe payment
    async processStripePayment(orderId, amount, cardElement) {
        try {
            this.showLoadingSpinner();

            const { token, error } = await this.stripe.createToken(cardElement);

            if (error) {
                throw new Error(error.message);
            }

            await this.api.processStripePayment(orderId, token.id);
            this.showSuccessMessage('Payment processed successfully!');
            this.redirectToSuccess();

        } catch (error) {
            this.showErrorMessage('Payment failed: ' + error.message);
        } finally {
            this.hideLoadingSpinner();
        }
    }

    // Show loading spinner
    showLoadingSpinner() {
        const spinner = document.createElement('div');
        spinner.className = 'loading-spinner';
        spinner.id = 'payment-spinner';
        document.body.appendChild(spinner);
    }

    // Hide loading spinner
    hideLoadingSpinner() {
        const spinner = document.getElementById('payment-spinner');
        if (spinner) {
            spinner.remove();
        }
    }

    // Show success message
    showSuccessMessage(message) {
        this.showAlert(message, 'success');
    }

    // Show error message
    showErrorMessage(message) {
        this.showAlert(message, 'error');
    }

    // Show alert
    showAlert(message, type) {
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type}`;
        alertDiv.textContent = message;
        
        document.body.insertBefore(alertDiv, document.body.firstChild);
        
        setTimeout(() => {
            alertDiv.remove();
        }, 5000);
    }

    // Redirect to success page
    redirectToSuccess() {
        setTimeout(() => {
            window.location.href = 'success.html';
        }, 2000);
    }
}

// ============================================
// FORM VALIDATION CLASS
// ============================================
class FormValidator {
    constructor() {
        this.rules = {
            username: {
                required: true,
                minLength: 3,
                maxLength: 50,
                pattern: /^[a-zA-Z0-9_]+$/
            },
            email: {
                required: true,
                pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/
            },
            password: {
                required: true,
                minLength: 6,
                pattern: /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/
            },
            phone: {
                pattern: /^[\+]?[1-9][\d]{0,15}$/
            }
        };
    }

    validate(formData) {
        const errors = {};

        for (const [field, value] of Object.entries(formData)) {
            const rule = this.rules[field];
            if (!rule) continue;

            if (rule.required && !value) {
                errors[field] = `${field} is required`;
                continue;
            }

            if (value && rule.minLength && value.length < rule.minLength) {
                errors[field] = `${field} must be at least ${rule.minLength} characters`;
                continue;
            }

            if (value && rule.maxLength && value.length > rule.maxLength) {
                errors[field] = `${field} must be no more than ${rule.maxLength} characters`;
                continue;
            }

            if (value && rule.pattern && !rule.pattern.test(value)) {
                errors[field] = `${field} format is invalid`;
            }
        }

        return {
            isValid: Object.keys(errors).length === 0,
            errors
        };
    }

    showValidationErrors(errors) {
        // Clear previous errors
        document.querySelectorAll('.error-message').forEach(el => el.remove());

        for (const [field, message] of Object.entries(errors)) {
            const input = document.querySelector(`[name="${field}"]`);
            if (input) {
                const errorDiv = document.createElement('div');
                errorDiv.className = 'error-message';
                errorDiv.textContent = message;
                errorDiv.style.color = '#e74c3c';
                errorDiv.style.fontSize = '12px';
                errorDiv.style.marginTop = '5px';
                
                input.parentNode.insertBefore(errorDiv, input.nextSibling);
                input.style.borderColor = '#e74c3c';
            }
        }
    }

    clearValidationErrors() {
        document.querySelectorAll('.error-message').forEach(el => el.remove());
        document.querySelectorAll('input').forEach(input => {
            input.style.borderColor = '#bdc3c7';
        });
    }
}

// ============================================
// UTILITY FUNCTIONS
// ============================================

// Format currency
function formatCurrency(amount) {
    return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD'
    }).format(amount);
}

// Format date
function formatDate(dateString) {
    return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });
}

// Show/hide elements
function showElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = 'block';
    }
}

function hideElement(elementId) {
    const element = document.getElementById(elementId);
    if (element) {
        element.style.display = 'none';
    }
}

// Check if user is logged in
function checkAuth() {
    const token = localStorage.getItem('authToken');
    if (!token) {
        window.location.href = 'login.html';
        return false;
    }
    return true;
}

// Initialize page
function initPage() {
    // Add loading states to buttons
    document.querySelectorAll('.btn').forEach(btn => {
        btn.addEventListener('click', function() {
            if (this.type === 'submit') {
                this.innerHTML = '<span class="loading-spinner"></span> Processing...';
                this.disabled = true;
            }
        });
    });

    // Add form validation
    const forms = document.querySelectorAll('form');
    forms.forEach(form => {
        form.addEventListener('submit', function(e) {
            const validator = new FormValidator();
            const formData = new FormData(this);
            const data = Object.fromEntries(formData);
            
            const validation = validator.validate(data);
            if (!validation.isValid) {
                e.preventDefault();
                validator.showValidationErrors(validation.errors);
            }
        });
    });
}

// ============================================
// INITIALIZE WHEN DOM IS LOADED
// ============================================
document.addEventListener('DOMContentLoaded', function() {
    initPage();
    
    // Initialize API
    window.api = new ManiConstructionAPI();
    window.paymentProcessor = new PaymentProcessor();
    window.formValidator = new FormValidator();
});

// ============================================
// LOGIN PAGE SPECIFIC FUNCTIONS
// ============================================
function handleLogin(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const username = formData.get('username');
    const password = formData.get('password');
    
    const validator = new FormValidator();
    const validation = validator.validate({ username, password });
    
    if (!validation.isValid) {
        validator.showValidationErrors(validation.errors);
        return;
    }
    
    api.login(username, password)
        .then(data => {
            showAlert('Login successful!', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        })
        .catch(error => {
            showAlert('Login failed: ' + error.message, 'error');
        });
}

// ============================================
// REGISTRATION PAGE SPECIFIC FUNCTIONS
// ============================================
function handleRegister(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const userData = {
        username: formData.get('username'),
        email: formData.get('email'),
        password: formData.get('password'),
        full_name: formData.get('full_name'),
        phone: formData.get('phone'),
        address: formData.get('address')
    };
    
    const validator = new FormValidator();
    const validation = validator.validate(userData);
    
    if (!validation.isValid) {
        validator.showValidationErrors(validation.errors);
        return;
    }
    
    api.register(userData)
        .then(data => {
            showAlert('Registration successful!', 'success');
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1500);
        })
        .catch(error => {
            showAlert('Registration failed: ' + error.message, 'error');
        });
}

// ============================================
// PAYMENT PAGE SPECIFIC FUNCTIONS
// ============================================
function initPaymentPage() {
    // Initialize Stripe
    paymentProcessor.initStripe('pk_test_your_stripe_publishable_key');
    
    // Initialize PayPal
    paymentProcessor.initPayPal('your_paypal_client_id');
    
    // Set up Stripe form
    const stripeForm = document.getElementById('stripe-form');
    if (stripeForm) {
        stripeForm.addEventListener('submit', handleStripePayment);
    }
}

function handleStripePayment(event) {
    event.preventDefault();
    
    const cardElement = document.getElementById('card-element');
    const orderId = document.getElementById('order-id').value;
    const amount = document.getElementById('amount').value;
    
    paymentProcessor.processStripePayment(orderId, amount, cardElement);
}

// ============================================
// CONTACT PAGE SPECIFIC FUNCTIONS
// ============================================
function handleContact(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const messageData = {
        name: formData.get('name'),
        email: formData.get('email'),
        subject: formData.get('subject'),
        message: formData.get('message')
    };
    
    api.sendContactMessage(messageData)
        .then(data => {
            showAlert('Message sent successfully!', 'success');
            event.target.reset();
        })
        .catch(error => {
            showAlert('Failed to send message: ' + error.message, 'error');
        });
}
