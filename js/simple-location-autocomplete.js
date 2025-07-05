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

        if (query.length < 2) { // Reduced from 3 to 2 for better coverage
            this.hideSuggestions();
            return;
        }

        try {
            this.showLoading();

            // Multiple API calls to get comprehensive results for all types of places in India
            const promises = [
                // General search with high limit for comprehensive coverage
                fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=50&addressdetails=1&countrycodes=in&dedupe=1`),
                
                // Specific search for cities, towns, villages
                fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=30&addressdetails=1&countrycodes=in&class=place&dedupe=1`),
                
                // Search for amenities (hotels, hospitals, restaurants, etc.)
                fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=30&addressdetails=1&countrycodes=in&class=amenity&dedupe=1`),
                
                // Search for tourism places (attractions, monuments, etc.)
                fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=30&addressdetails=1&countrycodes=in&class=tourism&dedupe=1`),
                
                // Search for shops and commercial places
                fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=20&addressdetails=1&countrycodes=in&class=shop&dedupe=1`)
            ];

            const responses = await Promise.allSettled(promises);
            let allData = [];

            // Combine all successful responses
            for (const response of responses) {
                if (response.status === 'fulfilled' && response.value.ok) {
                    try {
                        const data = await response.value.json();
                        allData = allData.concat(data);
                    } catch (error) {
                        console.warn('Failed to parse JSON from one of the responses');
                    }
                }
            }

            // Remove duplicates based on place_id and display_name
            const uniquePlaces = this.removeDuplicates(allData);
            
            // Additional filtering to ensure only Indian locations
            const indianPlaces = this.filterIndianPlaces(uniquePlaces);
            
            // Sort by relevance and importance
            const sortedPlaces = this.sortByRelevance(indianPlaces, query);
            
            this.renderSuggestions(sortedPlaces.slice(0, 8)); // Show more results (8 instead of 5)

        } catch (error) {
            console.error("Location autocomplete error:", error);
            this.showError();
        }
    }

    removeDuplicates(places) {
        const seen = new Set();
        return places.filter(place => {
            // Create unique identifier using place_id or combination of lat/lon and name
            const identifier = place.place_id || `${place.lat}_${place.lon}_${place.display_name}`;
            if (seen.has(identifier)) {
                return false;
            }
            seen.add(identifier);
            return true;
        });
    }

    sortByRelevance(places, query) {
        const queryLower = query.toLowerCase();
        
        return places.sort((a, b) => {
            const aName = (a.display_name || '').toLowerCase();
            const bName = (b.display_name || '').toLowerCase();
            const aAddress = a.address || {};
            const bAddress = b.address || {};
            
            // Priority scoring
            let aScore = 0;
            let bScore = 0;
            
            // Exact match at start gets highest priority
            if (aName.startsWith(queryLower)) aScore += 100;
            if (bName.startsWith(queryLower)) bScore += 100;
            
            // Contains query gets medium priority
            if (aName.includes(queryLower)) aScore += 50;
            if (bName.includes(queryLower)) bScore += 50;
            
            // Place type priority (cities > towns > villages > amenities)
            const getPlaceTypeScore = (place) => {
                const type = place.type || '';
                const placeClass = place.class || '';
                
                if (type === 'city' || placeClass === 'place') return 30;
                if (type === 'town' || type === 'village') return 25;
                if (placeClass === 'amenity') return 20;
                if (placeClass === 'tourism') return 15;
                return 10;
            };
            
            aScore += getPlaceTypeScore(a);
            bScore += getPlaceTypeScore(b);
            
            // Importance score (if available)
            if (a.importance) aScore += Math.floor(a.importance * 10);
            if (b.importance) bScore += Math.floor(b.importance * 10);
            
            return bScore - aScore;
        });
    }

    filterIndianPlaces(places) {
        return places.filter(place => {
            // Check if the place is in India through multiple comprehensive criteria
            const address = place.address || {};
            const displayName = place.display_name || '';
            const lowerDisplayName = displayName.toLowerCase();

            // Primary check: country code and country name
            if (address.country_code === 'in' || address.country === 'India' || address.country === 'भारत') {
                return true;
            }

            // Secondary check: display name contains India
            if (lowerDisplayName.includes('india') || displayName.includes('भारत')) {
                return true;
            }

            // Comprehensive check: All Indian states, union territories, and major regions
            const indianRegions = [
                // States
                'andhra pradesh', 'arunachal pradesh', 'assam', 'bihar', 'chhattisgarh', 'goa', 'gujarat',
                'haryana', 'himachal pradesh', 'jharkhand', 'karnataka', 'kerala', 'madhya pradesh',
                'maharashtra', 'manipur', 'meghalaya', 'mizoram', 'nagaland', 'odisha', 'orissa', 'punjab',
                'rajasthan', 'sikkim', 'tamil nadu', 'telangana', 'tripura', 'uttar pradesh', 'uttarakhand',
                'west bengal',
                
                // Union Territories
                'andaman and nicobar islands', 'chandigarh', 'dadra and nagar haveli', 'dadra & nagar haveli',
                'daman and diu', 'delhi', 'new delhi', 'jammu and kashmir', 'jammu & kashmir', 'ladakh', 
                'lakshadweep', 'puducherry', 'pondicherry',
                
                // Major cities and regions
                'mumbai', 'kolkata', 'chennai', 'bangalore', 'bengaluru', 'hyderabad', 'pune', 'ahmedabad',
                'surat', 'jaipur', 'lucknow', 'kanpur', 'nagpur', 'indore', 'thane', 'bhopal', 'visakhapatnam',
                'pimpri', 'patna', 'vadodara', 'ghaziabad', 'ludhiana', 'agra', 'nashik', 'faridabad',
                'meerut', 'rajkot', 'kalyan', 'vasai', 'varanasi', 'srinagar', 'aurangabad', 'dhanbad',
                'amritsar', 'navi mumbai', 'allahabad', 'prayagraj', 'ranchi', 'howrah', 'coimbatore',
                'jabalpur', 'gwalior', 'vijayawada', 'jodhpur', 'madurai', 'raipur', 'kota', 'guwahati',
                'chandigarh', 'solapur', 'hubballi', 'tiruchirappalli', 'bareilly', 'mysore', 'mysuru',
                'tiruppur', 'gurgaon', 'gurugram', 'aligarh', 'jalandhar', 'bhubaneswar', 'salem',
                'warangal', 'guntur', 'bhiwandi', 'saharanpur', 'gorakhpur', 'bikaner', 'amravati',
                'noida', 'jamshedpur', 'bhilai', 'cuttack', 'firozabad', 'kochi', 'ernakulam', 'bhavnagar',
                'dehradun', 'durgapur', 'asansol', 'rourkela', 'nanded', 'kolhapur', 'ajmer', 'akola',
                'gulbarga', 'jamnagar', 'ujjain', 'loni', 'siliguri', 'jhansi', 'ulhasnagar', 'jammu',
                'sangli', 'mangalore', 'erode', 'belgaum', 'ambattur', 'tirunelveli', 'malegaon',
                'gaya', 'jalgaon', 'udaipur', 'maheshtala'
            ];

            // Check against all Indian regions
            if (indianRegions.some(region => lowerDisplayName.includes(region))) {
                return true;
            }

            // Additional check for Indian postal codes (6 digits starting with 1-8)
            const postalCodeMatch = displayName.match(/\b[1-8]\d{5}\b/);
            if (postalCodeMatch) {
                return true;
            }

            // Check for common Indian address patterns
            const indianPatterns = [
                /\b(dist|district)\s+/i,
                /\b(tehsil|taluka|block)\s+/i,
                /\b(pin|pincode)\s*:?\s*[1-8]\d{5}\b/i,
                /\b(state|pradesh|bengal|nadu)\b/i
            ];

            if (indianPatterns.some(pattern => pattern.test(displayName))) {
                return true;
            }

            return false;
        });
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
        this.suggestionsList.innerHTML = '<li style="color: rgba(255,255,255,0.6); cursor: default;"><i class="fas fa-search"></i> No Indian locations found</li>';
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