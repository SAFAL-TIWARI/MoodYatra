// Nominatim-based Location Autocomplete Manager
class NominatimAutocomplete {
    constructor() {
        this.input = null;
        this.dropdown = null;
        this.suggestions = [];
        this.selectedIndex = -1;
        this.debounceTimer = null;
        this.isVisible = false;
        this.sessionToken = null;
        this.lastRequestTime = 0;
        this.minRequestInterval = 1000; // 1 second between requests for Nominatim
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
        }, 500); // Increased debounce for Nominatim
    }

    async rateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.minRequestInterval) {
            await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest));
        }
        this.lastRequestTime = Date.now();
    }

    async fetchSuggestions(query) {
        try {
            // Show loading state
            this.showLoading();

            // Rate limiting for Nominatim
            await this.rateLimit();

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
                this.showNoResults();
            }

        } catch (error) {
            console.error('Error fetching location suggestions:', error);
            this.showError();
        }
    }

    renderSuggestions() {
        this.dropdown.innerHTML = '';

        if (this.suggestions.length === 0) {
            this.showNoResults();
            return;
        }

        this.suggestions.forEach((suggestion, index) => {
            const item = document.createElement('div');
            item.className = 'dropdown-item';
            item.dataset.index = index;
            
            // Parse the suggestion
            const mainText = suggestion.structured_formatting?.main_text || suggestion.description.split(',')[0];
            const secondaryText = suggestion.structured_formatting?.secondary_text || 
                                suggestion.description.split(',').slice(1).join(',').trim();
            
            // Determine place type icon
            const icon = this.getPlaceIcon(suggestion.types);
            
            item.innerHTML = `
                <div class="suggestion-content">
                    <div class="suggestion-icon">
                        <i class="${icon}"></i>
                    </div>
                    <div class="suggestion-text">
                        <div class="suggestion-main">${this.highlightMatch(mainText, this.input.value)}</div>
                        ${secondaryText ? `<div class="suggestion-secondary">${secondaryText}</div>` : ''}
                    </div>
                    <div class="suggestion-type">
                        <span class="type-badge">${this.getPlaceTypeLabel(suggestion.types)}</span>
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

    getPlaceIcon(types) {
        if (!types || types.length === 0) return 'fas fa-map-marker-alt';
        
        const iconMap = {
            'locality': 'fas fa-city',
            'country': 'fas fa-flag',
            'administrative_area_level_1': 'fas fa-map',
            'administrative_area_level_2': 'fas fa-map-signs',
            'establishment': 'fas fa-building',
            'point_of_interest': 'fas fa-star',
            'tourist_attraction': 'fas fa-camera',
            'airport': 'fas fa-plane',
            'train_station': 'fas fa-train',
            'university': 'fas fa-graduation-cap',
            'hospital': 'fas fa-hospital',
            'school': 'fas fa-school'
        };
        
        for (const type of types) {
            if (iconMap[type]) {
                return iconMap[type];
            }
        }
        
        return 'fas fa-map-marker-alt';
    }

    getPlaceTypeLabel(types) {
        if (!types || types.length === 0) return 'Place';
        
        const labelMap = {
            'locality': 'City',
            'country': 'Country',
            'administrative_area_level_1': 'State',
            'administrative_area_level_2': 'County',
            'establishment': 'Business',
            'point_of_interest': 'POI',
            'tourist_attraction': 'Attraction',
            'airport': 'Airport',
            'train_station': 'Station',
            'university': 'University',
            'hospital': 'Hospital',
            'school': 'School'
        };
        
        for (const type of types) {
            if (labelMap[type]) {
                return labelMap[type];
            }
        }
        
        return 'Place';
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
                <span>Error loading suggestions. Please try again.</span>
            </div>
        `;
        this.showDropdown();
    }

    showNoResults() {
        this.dropdown.innerHTML = `
            <div class="dropdown-item no-results">
                <i class="fas fa-search"></i>
                <div class="no-results-content">
                    <span class="no-results-title">No locations found</span>
                    <span class="no-results-subtitle">Try a different search term</span>
                </div>
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
        const mainText = suggestion.structured_formatting?.main_text || 
                        suggestion.description.split(',')[0];
        
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
        // Generate a random session token
        this.sessionToken = 'nominatim_' + Math.random().toString(36).substr(2, 9) + Date.now().toString(36);
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

    // Method to get coordinates for selected place
    async getPlaceCoordinates(placeId) {
        try {
            const response = await fetch('/api/places/details', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    placeId: placeId
                })
            });

            if (!response.ok) {
                throw new Error('Failed to fetch place details');
            }

            const data = await response.json();
            return {
                lat: data.lat,
                lng: data.lng,
                address: data.address
            };
        } catch (error) {
            console.error('Error fetching place coordinates:', error);
            return null;
        }
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we're on the app page
    if (document.getElementById('location')) {
        window.locationAutocomplete = new NominatimAutocomplete();
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = NominatimAutocomplete;
}