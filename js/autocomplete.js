// Location Autocomplete Manager
class LocationAutocomplete {
    constructor() {
        this.input = null;
        this.dropdown = null;
        this.suggestions = [];
        this.selectedIndex = -1;
        this.debounceTimer = null;
        this.isVisible = false;
        this.sessionToken = null;
        this.init();
    }

    init() {
        this.input = document.getElementById('location');
        if (!this.input) {
            console.warn('Location input not found');
            return;
        }

        this.createDropdown();
        this.setupEventListeners();
        this.generateSessionToken();
    }

    createDropdown() {
        // Create dropdown container
        this.dropdown = document.createElement('div');
        this.dropdown.className = 'location-dropdown';
        this.dropdown.style.display = 'none';
        
        // Insert dropdown after the location input container
        const locationContainer = this.input.closest('.location-input');
        if (locationContainer) {
            locationContainer.parentNode.insertBefore(this.dropdown, locationContainer.nextSibling);
        }
    }

    setupEventListeners() {
        // Input events
        this.input.addEventListener('input', (e) => {
            this.handleInput(e.target.value);
        });

        this.input.addEventListener('focus', () => {
            if (this.suggestions.length > 0) {
                this.showDropdown();
            }
        });

        this.input.addEventListener('blur', () => {
            // Delay hiding to allow for click events
            setTimeout(() => {
                this.hideDropdown();
            }, 150);
        });

        // Keyboard navigation
        this.input.addEventListener('keydown', (e) => {
            this.handleKeydown(e);
        });

        // Click outside to close
        document.addEventListener('click', (e) => {
            if (!this.input.contains(e.target) && !this.dropdown.contains(e.target)) {
                this.hideDropdown();
            }
        });
    }

    handleInput(value) {
        const query = value.trim();
        
        // Clear previous timer
        if (this.debounceTimer) {
            clearTimeout(this.debounceTimer);
        }

        if (query.length < 2) {
            this.hideDropdown();
            return;
        }

        // Debounce the API call
        this.debounceTimer = setTimeout(() => {
            this.fetchSuggestions(query);
        }, 300);
    }

    async fetchSuggestions(query) {
        try {
            // Show loading state
            this.showLoading();

            const response = await fetch('/api/places/autocomplete', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    input: query,
                    sessionToken: this.sessionToken
                })
            });

            if (!response.ok) {
                throw new Error('Failed to fetch suggestions');
            }

            const data = await response.json();
            this.suggestions = data.predictions || [];
            this.selectedIndex = -1;
            this.renderSuggestions();
            
            if (this.suggestions.length > 0) {
                this.showDropdown();
            } else {
                this.hideDropdown();
            }

        } catch (error) {
            console.error('Error fetching location suggestions:', error);
            this.showError();
        }
    }

    renderSuggestions() {
        this.dropdown.innerHTML = '';

        if (this.suggestions.length === 0) {
            const noResults = document.createElement('div');
            noResults.className = 'dropdown-item no-results';
            noResults.innerHTML = `
                <i class="fas fa-search"></i>
                <span>No locations found</span>
            `;
            this.dropdown.appendChild(noResults);
            return;
        }

        this.suggestions.forEach((suggestion, index) => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.dataset.index = index;
            
            // Parse the suggestion
            const mainText = suggestion.structured_formatting?.main_text || suggestion.description;
            const secondaryText = suggestion.structured_formatting?.secondary_text || '';
            
            item.innerHTML = `
                <div class="suggestion-content">
                    <div class="suggestion-icon">
                        <i class="fas fa-map-marker-alt"></i>
                    </div>
                    <div class="suggestion-text">
                        <div class="suggestion-main">${this.highlightMatch(mainText, this.input.value)}</div>
                        ${secondaryText ? `<div class="suggestion-secondary">${secondaryText}</div>` : ''}
                    </div>
                </div>
            `;

            // Add click handler
            item.addEventListener('click', () => {
                this.selectSuggestion(index);
            });

            // Add hover handler
            item.addEventListener('mouseenter', () => {
                this.setSelectedIndex(index);
            });

            this.dropdown.appendChild(item);
        });
    }

    highlightMatch(text, query) {
        if (!query) return text;
        
        const regex = new RegExp(`(${query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')})`, 'gi');
        return text.replace(regex, '<strong>$1</strong>');
    }

    showLoading() {
        this.dropdown.innerHTML = `
            <div class="dropdown-item loading">
                <div class="loading-spinner"></div>
                <span>Searching locations...</span>
            </div>
        `;
        this.showDropdown();
    }

    showError() {
        this.dropdown.innerHTML = `
            <div class="dropdown-item error">
                <i class="fas fa-exclamation-triangle"></i>
                <span>Error loading suggestions</span>
            </div>
        `;
        this.showDropdown();
    }

    showDropdown() {
        this.dropdown.style.display = 'block';
        this.isVisible = true;
        
        // Position the dropdown
        this.positionDropdown();
    }

    hideDropdown() {
        this.dropdown.style.display = 'none';
        this.isVisible = false;
        this.selectedIndex = -1;
        this.updateSelection();
    }

    positionDropdown() {
        const inputRect = this.input.getBoundingClientRect();
        const dropdownRect = this.dropdown.getBoundingClientRect();
        const viewportHeight = window.innerHeight;
        
        // Check if there's enough space below
        const spaceBelow = viewportHeight - inputRect.bottom;
        const spaceAbove = inputRect.top;
        
        if (spaceBelow < 200 && spaceAbove > spaceBelow) {
            // Show above
            this.dropdown.style.top = 'auto';
            this.dropdown.style.bottom = '100%';
            this.dropdown.classList.add('dropdown-above');
        } else {
            // Show below (default)
            this.dropdown.style.top = '100%';
            this.dropdown.style.bottom = 'auto';
            this.dropdown.classList.remove('dropdown-above');
        }
    }

    handleKeydown(e) {
        if (!this.isVisible) return;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                this.setSelectedIndex(Math.min(this.selectedIndex + 1, this.suggestions.length - 1));
                break;
            
            case 'ArrowUp':
                e.preventDefault();
                this.setSelectedIndex(Math.max(this.selectedIndex - 1, -1));
                break;
            
            case 'Enter':
                e.preventDefault();
                if (this.selectedIndex >= 0) {
                    this.selectSuggestion(this.selectedIndex);
                }
                break;
            
            case 'Escape':
                this.hideDropdown();
                this.input.blur();
                break;
        }
    }

    setSelectedIndex(index) {
        this.selectedIndex = index;
        this.updateSelection();
    }

    updateSelection() {
        const items = this.dropdown.querySelectorAll('.dropdown-item');
        items.forEach((item, index) => {
            item.classList.toggle('selected', index === this.selectedIndex);
        });
    }

    selectSuggestion(index) {
        if (index < 0 || index >= this.suggestions.length) return;

        const suggestion = this.suggestions[index];
        const mainText = suggestion.structured_formatting?.main_text || suggestion.description;
        
        // Set the input value
        this.input.value = mainText;
        
        // Store the full place data for later use
        this.input.dataset.placeId = suggestion.place_id;
        this.input.dataset.fullDescription = suggestion.description;
        
        // Hide dropdown
        this.hideDropdown();
        
        // Trigger validation
        if (window.app && typeof window.app.validateStep2 === 'function') {
            window.app.validateStep2();
        }
        
        // Dispatch custom event
        this.input.dispatchEvent(new CustomEvent('locationSelected', {
            detail: {
                suggestion: suggestion,
                mainText: mainText
            }
        }));

        // Generate new session token for next search
        this.generateSessionToken();
    }

    generateSessionToken() {
        // Generate a random session token for billing purposes
        this.sessionToken = 'session_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
    }

    // Public methods
    clear() {
        this.input.value = '';
        this.hideDropdown();
        delete this.input.dataset.placeId;
        delete this.input.dataset.fullDescription;
    }

    setValue(value) {
        this.input.value = value;
        this.hideDropdown();
    }

    getSelectedPlace() {
        return {
            value: this.input.value,
            placeId: this.input.dataset.placeId,
            fullDescription: this.input.dataset.fullDescription
        };
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we're on the app page
    if (document.getElementById('location')) {
        window.locationAutocomplete = new LocationAutocomplete();
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LocationAutocomplete;
}