// Simple Location Autocomplete using Nominatim
class SimpleLocationAutocomplete {
    constructor() {
        this.locationInput = null;
        this.suggestionsList = null;
        this.debounceTimer = null;
        this.init();
    }

    init() {
        this.locationInput = document.getElementById("location");
        this.suggestionsList = document.getElementById("locationSuggestions");
        
        if (!this.locationInput || !this.suggestionsList) {
            console.warn('Location input or suggestions list not found');
            return;
        }

        this.setupEventListeners();
    }

    setupEventListeners() {
        // Input event with debouncing
        this.locationInput.addEventListener("input", (e) => {
            clearTimeout(this.debounceTimer);
            this.debounceTimer = setTimeout(() => {
                this.handleInput(e.target.value);
            }, 300);
        });

        // Click outside to close suggestions
        document.addEventListener("click", (e) => {
            if (!this.suggestionsList.contains(e.target) && e.target !== this.locationInput) {
                this.hideSuggestions();
            }
        });

        // Keyboard navigation
        this.locationInput.addEventListener("keydown", (e) => {
            this.handleKeyNavigation(e);
        });

        // Reposition on window resize
        window.addEventListener("resize", () => {
            if (this.suggestionsList.style.display === "block") {
                this.positionSuggestions();
            }
        });

        // Reposition on scroll
        window.addEventListener("scroll", () => {
            if (this.suggestionsList.style.display === "block") {
                this.positionSuggestions();
            }
        });
    }

    async handleInput(value) {
        const query = value.trim();
        
        if (query.length < 3) {
            this.hideSuggestions();
            return;
        }

        try {
            this.showLoading();
            
            const response = await fetch(
                `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5&addressdetails=1`
            );
            
            if (!response.ok) {
                throw new Error('Failed to fetch suggestions');
            }
            
            const data = await response.json();
            this.renderSuggestions(data);
            
        } catch (error) {
            console.error("Location autocomplete error:", error);
            this.showError();
        }
    }

    renderSuggestions(places) {
        this.suggestionsList.innerHTML = "";
        
        if (places.length === 0) {
            this.showNoResults();
            return;
        }

        places.forEach((place, index) => {
            const li = document.createElement("li");
            li.textContent = place.display_name;
            li.dataset.index = index;
            li.dataset.lat = place.lat;
            li.dataset.lon = place.lon;
            li.dataset.placeId = place.place_id;
            
            li.addEventListener("click", () => {
                this.selectPlace(place);
            });
            
            // Add hover effect for keyboard navigation
            li.addEventListener("mouseenter", () => {
                this.clearSelection();
                li.classList.add("selected");
            });
            
            this.suggestionsList.appendChild(li);
        });
        
        this.showSuggestions();
    }

    selectPlace(place) {
        this.locationInput.value = place.display_name;
        
        // Store additional data for later use
        this.locationInput.dataset.lat = place.lat;
        this.locationInput.dataset.lon = place.lon;
        this.locationInput.dataset.placeId = place.place_id;
        
        this.hideSuggestions();
        
        // Trigger validation if available
        if (window.app && typeof window.app.validateStep1 === 'function') {
            window.app.validateStep1();
        }
        
        // Dispatch custom event for other components
        this.locationInput.dispatchEvent(new CustomEvent('locationSelected', {
            detail: {
                place: place,
                displayName: place.display_name,
                lat: place.lat,
                lon: place.lon
            }
        }));
    }

    handleKeyNavigation(e) {
        const items = this.suggestionsList.querySelectorAll('li');
        if (items.length === 0) return;

        const currentSelected = this.suggestionsList.querySelector('li.selected');
        let selectedIndex = currentSelected ? parseInt(currentSelected.dataset.index) : -1;

        switch (e.key) {
            case 'ArrowDown':
                e.preventDefault();
                selectedIndex = Math.min(selectedIndex + 1, items.length - 1);
                this.updateSelection(selectedIndex);
                break;
                
            case 'ArrowUp':
                e.preventDefault();
                selectedIndex = Math.max(selectedIndex - 1, 0);
                this.updateSelection(selectedIndex);
                break;
                
            case 'Enter':
                e.preventDefault();
                if (currentSelected) {
                    currentSelected.click();
                }
                break;
                
            case 'Escape':
                this.hideSuggestions();
                this.locationInput.blur();
                break;
        }
    }

    updateSelection(index) {
        this.clearSelection();
        const items = this.suggestionsList.querySelectorAll('li');
        if (items[index]) {
            items[index].classList.add('selected');
            items[index].scrollIntoView({ block: 'nearest' });
        }
    }

    clearSelection() {
        this.suggestionsList.querySelectorAll('li.selected').forEach(item => {
            item.classList.remove('selected');
        });
    }

    showSuggestions() {
        this.suggestionsList.style.display = "block";
        this.positionSuggestions();
    }

    positionSuggestions() {
        // Get the input field dimensions and position
        const inputRect = this.locationInput.getBoundingClientRect();
        const containerRect = this.locationInput.parentElement.getBoundingClientRect();
        
        // Calculate the width to match only the input field
        const inputWidth = inputRect.width;
        
        // Set the width to match the input field exactly
        this.suggestionsList.style.width = inputWidth + 'px';
        
        // Position relative to the input field within the container
        const leftOffset = inputRect.left - containerRect.left;
        this.suggestionsList.style.left = leftOffset + 'px';
    }

    hideSuggestions() {
        this.suggestionsList.style.display = "none";
        this.clearSelection();
    }

    showLoading() {
        this.suggestionsList.innerHTML = '<li style="color: rgba(255,255,255,0.6); cursor: default;"><i class="fas fa-spinner fa-spin"></i> Searching locations...</li>';
        this.showSuggestions();
    }

    showError() {
        this.suggestionsList.innerHTML = '<li style="color: #ff6b6b; cursor: default;"><i class="fas fa-exclamation-triangle"></i> Error loading suggestions</li>';
        this.showSuggestions();
    }

    showNoResults() {
        this.suggestionsList.innerHTML = '<li style="color: rgba(255,255,255,0.6); cursor: default;"><i class="fas fa-search"></i> No locations found</li>';
        this.showSuggestions();
    }

    // Public methods
    clear() {
        this.locationInput.value = '';
        this.hideSuggestions();
        delete this.locationInput.dataset.lat;
        delete this.locationInput.dataset.lon;
        delete this.locationInput.dataset.placeId;
    }

    setValue(value) {
        this.locationInput.value = value;
        this.hideSuggestions();
    }
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.simpleLocationAutocomplete = new SimpleLocationAutocomplete();
});