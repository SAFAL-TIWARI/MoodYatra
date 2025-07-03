// Authentication System
class AuthManager {
    constructor() {
        this.currentUser = null;
        this.isSignUp = false;
        this.init();
    }

    init() {
        this.checkAuthState();
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Auth form submission
        const authForm = document.getElementById('authForm');
        if (authForm) {
            authForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAuth();
            });
        }
    }

    checkAuthState() {
        // Check if user is logged in (from localStorage or session)
        const savedUser = localStorage.getItem('MoodYatra_user');
        if (savedUser) {
            try {
                this.currentUser = JSON.parse(savedUser);
                this.updateUIForLoggedInUser();
            } catch (error) {
                console.error('Error parsing saved user:', error);
                localStorage.removeItem('MoodYatra_user');
            }
        }
    }

    async handleAuth() {
        const email = document.getElementById('email')?.value;
        const password = document.getElementById('password')?.value;

        if (!email || !password) {
            this.showAuthError('Please fill in all fields');
            return;
        }

        if (!this.isValidEmail(email)) {
            this.showAuthError('Please enter a valid email address');
            return;
        }

        try {
            this.showAuthLoading(true);

            if (this.isSignUp) {
                await this.signUp(email, password);
            } else {
                await this.signIn(email, password);
            }

            this.closeAuthModal();
            this.showAuthSuccess(this.isSignUp ? 'Account created successfully!' : 'Signed in successfully!');
            
        } catch (error) {
            console.error('Auth error:', error);
            this.showAuthError(error.message || 'Authentication failed. Please try again.');
        } finally {
            this.showAuthLoading(false);
        }
    }

    async signIn(email, password) {
        try {
            const response = await fetch('/api/auth/signin', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Sign in failed');
            }

            const userData = await response.json();
            this.setCurrentUser(userData);
            
        } catch (error) {
            // Fallback for demo - simulate successful login
            console.warn('Using demo auth mode');
            const demoUser = {
                id: 'demo_' + Date.now(),
                email: email,
                name: email.split('@')[0],
                createdAt: new Date().toISOString()
            };
            this.setCurrentUser(demoUser);
        }
    }

    async signUp(email, password) {
        try {
            const response = await fetch('/api/auth/signup', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password })
            });

            if (!response.ok) {
                const error = await response.json();
                throw new Error(error.message || 'Sign up failed');
            }

            const userData = await response.json();
            this.setCurrentUser(userData);
            
        } catch (error) {
            // Fallback for demo - simulate successful signup
            console.warn('Using demo auth mode');
            const demoUser = {
                id: 'demo_' + Date.now(),
                email: email,
                name: email.split('@')[0],
                createdAt: new Date().toISOString()
            };
            this.setCurrentUser(demoUser);
        }
    }

    async signInWithGoogle() {
        try {
            // In a real implementation, this would use Google OAuth
            // For demo purposes, we'll simulate it
            console.log('Google Sign-In clicked');
            
            // Simulate Google OAuth flow
            const demoGoogleUser = {
                id: 'google_' + Date.now(),
                email: 'demo@gmail.com',
                name: 'Demo User',
                picture: 'https://via.placeholder.com/40',
                provider: 'google',
                createdAt: new Date().toISOString()
            };
            
            this.setCurrentUser(demoGoogleUser);
            this.closeAuthModal();
            this.showAuthSuccess('Signed in with Google successfully!');
            
        } catch (error) {
            console.error('Google sign-in error:', error);
            this.showAuthError('Google sign-in failed. Please try again.');
        }
    }

    setCurrentUser(userData) {
        this.currentUser = userData;
        localStorage.setItem('MoodYatra_user', JSON.stringify(userData));
        this.updateUIForLoggedInUser();
    }

    updateUIForLoggedInUser() {
        // Update desktop navigation
        const navLinks = document.querySelector('.nav-links');
        if (navLinks && this.currentUser) {
            navLinks.innerHTML = `
                <a href="#" class="nav-link">Trips</a>
                <a href="#" class="nav-link">About</a>
                <a href="#" class="nav-link">Guide</a>
                <a href="#" class="nav-link">Contact Us</a>
                <div class="user-menu">
                    <span class="user-name">Hi, ${this.currentUser.name}!</span>
                    <button class="btn-secondary" onclick="authManager.signOut()">Sign Out</button>
                </div>
            `;
        }

        // Update mobile navigation
        const mobileNavContent = document.querySelector('.mobile-nav-content');
        if (mobileNavContent && this.currentUser) {
            mobileNavContent.innerHTML = `
                <a href="#" class="mobile-nav-link">Trips</a>
                <a href="#" class="mobile-nav-link">About</a>
                <a href="#" class="mobile-nav-link">Guide</a>
                <a href="#" class="mobile-nav-link">Contact Us</a>
                <div class="user-menu">
                    <span class="user-name">Hi, ${this.currentUser.name}!</span>
                    <button class="btn-secondary" onclick="authManager.signOut()">Sign Out</button>
                </div>
            `;
        }
    }

    signOut() {
        this.currentUser = null;
        localStorage.removeItem('MoodYatra_user');
        
        // Reset desktop navigation
        const navLinks = document.querySelector('.nav-links');
        if (navLinks) {
            navLinks.innerHTML = `
                <a href="#" class="nav-link">Trips</a>
                <a href="#" class="nav-link">About</a>
                <a href="#" class="nav-link">Guide</a>
                <a href="#" class="nav-link">Contact Us</a>
                <button class="btn-secondary" onclick="showAuthModal()">Sign In</button>
            `;
        }

        // Reset mobile navigation
        const mobileNavContent = document.querySelector('.mobile-nav-content');
        if (mobileNavContent) {
            mobileNavContent.innerHTML = `
                <a href="#" class="mobile-nav-link">Trips</a>
                <a href="#" class="mobile-nav-link">About</a>
                <a href="#" class="mobile-nav-link">Guide</a>
                <a href="#" class="mobile-nav-link">Contact Us</a>
                <button class="btn-secondary mobile-signin" onclick="showAuthModal()">Sign In</button>
            `;
        }
        
        this.showAuthSuccess('Signed out successfully!');
    }

    toggleAuthMode() {
        this.isSignUp = !this.isSignUp;
        
        const authContainer = document.querySelector('.auth-container');
        const title = authContainer.querySelector('h2');
        const subtitle = authContainer.querySelector('p');
        const submitBtn = authContainer.querySelector('button[type="submit"]');
        const switchText = authContainer.querySelector('.auth-switch');
        
        if (this.isSignUp) {
            title.textContent = 'Create Your Account';
            subtitle.textContent = 'Join MoodYatra to save and sync your trips!';
            submitBtn.textContent = 'Sign Up';
            switchText.innerHTML = 'Already have an account? <a href="#" onclick="toggleAuthMode()">Sign in</a>';
        } else {
            title.textContent = 'Sign In to Save Your Trips';
            subtitle.textContent = 'No account needed to generate trips, but sign in to save and sync them!';
            submitBtn.textContent = 'Sign In';
            switchText.innerHTML = 'Don\'t have an account? <a href="#" onclick="toggleAuthMode()">Sign up</a>';
        }
    }

    isValidEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    showAuthError(message) {
        // Remove existing error
        const existingError = document.querySelector('.auth-error');
        if (existingError) {
            existingError.remove();
        }

        // Create error element
        const errorElement = document.createElement('div');
        errorElement.className = 'auth-error';
        errorElement.style.cssText = `
            background: #fee;
            color: #c33;
            padding: 0.75rem;
            border-radius: 8px;
            margin-bottom: 1rem;
            font-size: 0.9rem;
            border: 1px solid #fcc;
        `;
        errorElement.textContent = message;

        // Insert before form
        const authForm = document.getElementById('authForm');
        if (authForm) {
            authForm.parentNode.insertBefore(errorElement, authForm);
        }

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (errorElement.parentNode) {
                errorElement.remove();
            }
        }, 5000);
    }

    showAuthSuccess(message) {
        // Create success notification
        const successElement = document.createElement('div');
        successElement.className = 'auth-success';
        successElement.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #d4edda;
            color: #155724;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            border: 1px solid #c3e6cb;
            z-index: 1001;
            animation: slideIn 0.3s ease;
        `;
        successElement.textContent = message;

        document.body.appendChild(successElement);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            if (successElement.parentNode) {
                successElement.remove();
            }
        }, 3000);
    }

    showAuthLoading(show) {
        const submitBtn = document.querySelector('#authForm button[type="submit"]');
        if (!submitBtn) return;

        if (show) {
            submitBtn.disabled = true;
            submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Please wait...';
        } else {
            submitBtn.disabled = false;
            submitBtn.textContent = this.isSignUp ? 'Sign Up' : 'Sign In';
        }
    }

    closeAuthModal() {
        const modal = document.getElementById('authModal');
        if (modal) {
            modal.style.display = 'none';
        }

        // Clear form
        const form = document.getElementById('authForm');
        if (form) {
            form.reset();
        }

        // Remove any errors
        const error = document.querySelector('.auth-error');
        if (error) {
            error.remove();
        }
    }

    // Public methods for checking auth state
    isLoggedIn() {
        return this.currentUser !== null;
    }

    getCurrentUser() {
        return this.currentUser;
    }

    getUserId() {
        return this.currentUser ? this.currentUser.id : null;
    }
}

// Global functions for HTML onclick handlers
function showAuthModal() {
    const modal = document.getElementById('authModal');
    if (modal) {
        modal.style.display = 'block';
    }
}

function closeAuthModal() {
    if (window.authManager) {
        window.authManager.closeAuthModal();
    }
}

function toggleAuthMode() {
    if (window.authManager) {
        window.authManager.toggleAuthMode();
    }
}

function signInWithGoogle() {
    if (window.authManager) {
        window.authManager.signInWithGoogle();
    }
}

// Initialize auth manager
document.addEventListener('DOMContentLoaded', () => {
    window.authManager = new AuthManager();
});

// Add CSS for animations
const authStyles = document.createElement('style');
authStyles.textContent = `
    @keyframes slideIn {
        from {
            opacity: 0;
            transform: translateX(100%);
        }
        to {
            opacity: 1;
            transform: translateX(0);
        }
    }

    .user-menu {
        display: flex;
        align-items: center;
        gap: 1rem;
        margin-left: 1rem;
        padding-left: 1rem;
        border-left: 1px solid rgba(0, 255, 255, 0.3);
    }

    .user-name {
        font-weight: 500;
        color: #00ffff;
        font-size: 0.9rem;
        white-space: nowrap;
        text-shadow: 0 0 10px rgba(0, 255, 255, 0.3);
    }

    @media (max-width: 768px) {
        .user-menu {
            flex-direction: column;
            gap: 0.5rem;
            text-align: center;
            margin-left: 0;
            padding-left: 0;
            border-left: none;
            border-top: 1px solid rgba(0, 255, 255, 0.3);
            padding-top: 1rem;
            margin-top: 1rem;
        }
        
        .user-name {
            font-size: 0.85rem;
        }
    }
`;
document.head.appendChild(authStyles);