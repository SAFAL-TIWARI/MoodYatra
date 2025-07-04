// Google Maps Integration
class MapsManager {
    constructor() {
        this.map = null;
        this.markers = [];
        this.directionsService = null;
        this.directionsRenderer = null;
        this.placesService = null;
        this.geocoder = null;
        this.infoWindow = null;
        this.init();
    }

    init() {
        // Initialize when Google Maps API is loaded
        if (typeof google !== 'undefined' && google.maps) {
            this.initializeServices();
        } else {
            // Wait for Google Maps to load
            window.initMaps = () => {
                console.log('Google Maps API loaded');
                this.initializeServices();
            };
        }
    }

    initializeServices() {
        this.directionsService = new google.maps.DirectionsService();
        this.directionsRenderer = new google.maps.DirectionsRenderer({
            suppressMarkers: true,
            polylineOptions: {
                strokeColor: '#667eea',
                strokeWeight: 4,
                strokeOpacity: 0.8
            }
        });
        this.geocoder = new google.maps.Geocoder();
        this.infoWindow = new google.maps.InfoWindow();
    }

    async initializeMap(places, centerLocation) {
        const mapContainer = document.getElementById('map');
        if (!mapContainer) {
            console.error('Map container not found');
            return;
        }

        // Check if Google Maps is loaded
        if (typeof google === 'undefined' || !google.maps) {
            console.error('Google Maps API not loaded');
            this.showMapError();
            return;
        }

        try {
            console.log('Initializing map with places:', places);
            console.log('Center location:', centerLocation);
            
            // Get center coordinates
            const center = await this.getCoordinates(centerLocation);
            console.log('Center coordinates:', center);
            
            // Initialize map
            this.map = new google.maps.Map(mapContainer, {
                zoom: 13,
                center: center,
                styles: this.getMapStyles(),
                mapTypeControl: false,
                streetViewControl: false,
                fullscreenControl: true,
                zoomControl: true
            });

            console.log('Map initialized successfully');

            // Set directions renderer
            this.directionsRenderer.setMap(this.map);

            // Initialize places service
            this.placesService = new google.maps.places.PlacesService(this.map);

            // Add markers for places
            await this.addPlaceMarkers(places);

            // Create route if multiple places
            if (places.length > 1) {
                this.createRoute(places);
            }

            // Fit map to show all markers
            this.fitMapToMarkers();

        } catch (error) {
            console.error('Error initializing map:', error);
            this.showMapError();
        }
    }

    async getCoordinates(location) {
        return new Promise((resolve, reject) => {
            if (!this.geocoder) {
                console.warn('Geocoder not available, using fallback coordinates');
                // Fallback coordinates (New York City)
                resolve({ lat: 40.7128, lng: -74.0060 });
                return;
            }

            console.log('Geocoding location:', location);
            this.geocoder.geocode({ address: location }, (results, status) => {
                if (status === 'OK' && results[0]) {
                    const coords = results[0].geometry.location.toJSON();
                    console.log('Geocoding successful:', coords);
                    resolve(coords);
                } else {
                    console.warn('Geocoding failed:', status, 'for location:', location);
                    // Fallback to default coordinates (New York City)
                    resolve({ lat: 40.7128, lng: -74.0060 });
                }
            });
        });
    }

    async addPlaceMarkers(places) {
        // Clear existing markers
        this.clearMarkers();

        console.log('Adding markers for places:', places);

        for (let i = 0; i < places.length; i++) {
            const place = places[i];
            let coordinates;

            // Use provided coordinates or geocode the address/name
            if (place.lat && place.lng) {
                coordinates = { lat: parseFloat(place.lat), lng: parseFloat(place.lng) };
                console.log(`Using existing coordinates for ${place.name}:`, coordinates);
            } else if (place.address) {
                coordinates = await this.getCoordinates(place.address);
                console.log(`Geocoded address for ${place.name}:`, coordinates);
            } else if (place.name) {
                // Try to geocode using place name
                coordinates = await this.getCoordinates(place.name);
                console.log(`Geocoded name for ${place.name}:`, coordinates);
            } else {
                console.warn(`No location data for place ${i + 1}:`, place);
                continue;
            }

            // Update place with coordinates
            place.lat = coordinates.lat;
            place.lng = coordinates.lng;

            // Create custom marker
            const marker = new google.maps.Marker({
                position: coordinates,
                map: this.map,
                title: place.name,
                icon: this.createCustomMarker(i + 1, place.type),
                animation: google.maps.Animation.DROP
            });

            console.log(`Created marker ${i + 1} for ${place.name} at:`, coordinates);

            // Create info window content
            const infoContent = this.createInfoWindowContent(place, i + 1);
            
            // Add click listener
            marker.addListener('click', () => {
                this.infoWindow.setContent(infoContent);
                this.infoWindow.open(this.map, marker);
            });

            this.markers.push(marker);

            // Enhance place data with Google Places details
            await this.enhancePlaceData(place, coordinates);
        }

        console.log(`Added ${this.markers.length} markers to the map`);
    }

    createCustomMarker(number, type) {
        // Create custom marker based on place type
        const colors = {
            'Restaurant': '#e74c3c',
            'Food & Dining': '#e74c3c',
            'Cafe': '#e74c3c',
            'Park': '#27ae60',
            'Nature': '#27ae60',
            'Hiking': '#27ae60',
            'Garden': '#27ae60',
            'Museum': '#9b59b6',
            'Cultural': '#9b59b6',
            'Gallery': '#9b59b6',
            'Entertainment': '#f39c12',
            'Shopping': '#3498db',
            'Nightlife': '#e67e22',
            'Wellness': '#1abc9c',
            'Spa': '#1abc9c',
            'Wine Bar': '#8e44ad',
            'Scenic Spot': '#27ae60',
            'default': '#667eea'
        };

        const color = colors[type] || colors.default;

        // Create a custom marker with number
        return {
            url: `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
                <svg width="32" height="40" viewBox="0 0 32 40" xmlns="http://www.w3.org/2000/svg">
                    <path d="M16 0C7.163 0 0 7.163 0 16c0 16 16 24 16 24s16-8 16-24C32 7.163 24.837 0 16 0z" fill="${color}"/>
                    <circle cx="16" cy="16" r="12" fill="white"/>
                    <text x="16" y="21" text-anchor="middle" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="${color}">${number}</text>
                </svg>
            `)}`,
            scaledSize: new google.maps.Size(32, 40),
            anchor: new google.maps.Point(16, 40)
        };
    }

    createInfoWindowContent(place, number) {
        return `
            <div class="map-info-window">
                <div class="info-header">
                    <span class="info-number">${number}</span>
                    <div class="info-title">
                        <h3>${place.name}</h3>
                        <span class="info-type">${place.type}</span>
                    </div>
                </div>
                ${place.image ? `<img src="${place.image}" alt="${place.name}" class="info-image">` : ''}
                <div class="info-content">
                    <p>${place.description}</p>
                    <div class="info-details">
                        <div class="info-time">
                            <i class="fas fa-clock"></i>
                            <span>${place.time} (${place.duration})</span>
                        </div>
                        ${place.cost ? `
                            <div class="info-cost">
                                <i class="fas fa-rupee-sign"></i>
                                <span>${place.cost}</span>
                            </div>
                        ` : ''}
                        ${place.rating ? `
                            <div class="info-rating">
                                <i class="fas fa-star"></i>
                                <span>${place.rating} (${place.reviews} reviews)</span>
                            </div>
                        ` : ''}
                    </div>
                    ${place.tips ? `<div class="info-tips"><strong>Tip:</strong> ${place.tips}</div>` : ''}
                </div>
                <div class="info-actions">
                    <button onclick="mapsManager.getDirections('${place.name}')" class="info-btn">
                        <i class="fas fa-directions"></i> Directions
                    </button>
                    ${place.address ? `
                        <button onclick="mapsManager.searchNearby('${place.address}')" class="info-btn">
                            <i class="fas fa-search"></i> Nearby
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
    }

    async enhancePlaceData(place, coordinates) {
        if (!this.placesService) return;

        // Search for place details using Google Places API
        const request = {
            location: coordinates,
            radius: 500, // Increased radius for better results
            query: place.name + ' ' + place.type
        };

        return new Promise((resolve) => {
            this.placesService.textSearch(request, (results, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && results[0]) {
                    const placeResult = results[0];
                    
                    // Enhance place data with real Google Places data
                    if (!place.rating && placeResult.rating) {
                        place.rating = placeResult.rating.toFixed(1);
                    }
                    if (!place.reviews && placeResult.user_ratings_total) {
                        place.reviews = placeResult.user_ratings_total;
                    }
                    if (placeResult.photos && placeResult.photos[0]) {
                        place.image = placeResult.photos[0].getUrl({ 
                            maxWidth: 400, 
                            maxHeight: 300 
                        });
                    }
                    if (!place.address && placeResult.formatted_address) {
                        place.address = placeResult.formatted_address;
                    }
                    
                    // Update coordinates with more accurate data
                    if (placeResult.geometry && placeResult.geometry.location) {
                        place.lat = placeResult.geometry.location.lat();
                        place.lng = placeResult.geometry.location.lng();
                    }
                    
                    // Get additional details if place_id is available
                    if (placeResult.place_id) {
                        this.getPlaceDetails(placeResult.place_id, place);
                    }
                }
                resolve();
            });
        });
    }

    async getPlaceDetails(placeId, place) {
        if (!this.placesService) return;

        const request = {
            placeId: placeId,
            fields: ['name', 'rating', 'user_ratings_total', 'photos', 'formatted_address', 
                    'opening_hours', 'price_level', 'website', 'formatted_phone_number']
        };

        return new Promise((resolve) => {
            this.placesService.getDetails(request, (placeDetails, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && placeDetails) {
                    // Add more detailed information
                    if (placeDetails.opening_hours) {
                        place.openingHours = placeDetails.opening_hours.weekday_text;
                        place.isOpen = placeDetails.opening_hours.isOpen();
                    }
                    if (placeDetails.price_level !== undefined) {
                        place.priceLevel = placeDetails.price_level;
                    }
                    if (placeDetails.website) {
                        place.website = placeDetails.website;
                    }
                    if (placeDetails.formatted_phone_number) {
                        place.phone = placeDetails.formatted_phone_number;
                    }
                }
                resolve();
            });
        });
    }

    createRoute(places) {
        if (places.length < 2) return;

        const waypoints = places.slice(1, -1).map(place => ({
            location: { lat: place.lat, lng: place.lng },
            stopover: true
        }));

        const request = {
            origin: { lat: places[0].lat, lng: places[0].lng },
            destination: { lat: places[places.length - 1].lat, lng: places[places.length - 1].lng },
            waypoints: waypoints,
            travelMode: google.maps.TravelMode.DRIVING,
            optimizeWaypoints: true
        };

        this.directionsService.route(request, (result, status) => {
            if (status === 'OK') {
                this.directionsRenderer.setDirections(result);
                
                // Update total distance
                this.updateTotalDistance(result);
            } else {
                console.warn('Directions request failed:', status);
            }
        });
    }

    updateTotalDistance(directionsResult) {
        let totalDistance = 0;
        const legs = directionsResult.routes[0].legs;
        
        legs.forEach(leg => {
            totalDistance += leg.distance.value;
        });

        // Convert to kilometers
        const distanceKm = (totalDistance / 1000).toFixed(1);
        
        // Update UI
        const distanceElement = document.getElementById('totalDistance');
        if (distanceElement) {
            distanceElement.textContent = distanceKm;
        }
    }

    fitMapToMarkers() {
        if (this.markers.length === 0) return;

        const bounds = new google.maps.LatLngBounds();
        this.markers.forEach(marker => {
            bounds.extend(marker.getPosition());
        });

        this.map.fitBounds(bounds);
        
        // Ensure minimum zoom level
        google.maps.event.addListenerOnce(this.map, 'bounds_changed', () => {
            if (this.map.getZoom() > 15) {
                this.map.setZoom(15);
            }
        });
    }

    clearMarkers() {
        this.markers.forEach(marker => {
            marker.setMap(null);
        });
        this.markers = [];
    }

    getDirections(placeName) {
        // Open Google Maps with directions
        const url = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(placeName)}`;
        window.open(url, '_blank');
    }

    searchNearby(address) {
        // Open Google Maps with nearby search
        const url = `https://www.google.com/maps/search/?api=1&query=restaurants+near+${encodeURIComponent(address)}`;
        window.open(url, '_blank');
    }

    getMapStyles() {
        // Custom map styling
        return [
            {
                "featureType": "all",
                "elementType": "geometry.fill",
                "stylers": [{"weight": "2.00"}]
            },
            {
                "featureType": "all",
                "elementType": "geometry.stroke",
                "stylers": [{"color": "#9c9c9c"}]
            },
            {
                "featureType": "all",
                "elementType": "labels.text",
                "stylers": [{"visibility": "on"}]
            },
            {
                "featureType": "landscape",
                "elementType": "all",
                "stylers": [{"color": "#f2f2f2"}]
            },
            {
                "featureType": "landscape",
                "elementType": "geometry.fill",
                "stylers": [{"color": "#ffffff"}]
            },
            {
                "featureType": "landscape.man_made",
                "elementType": "geometry.fill",
                "stylers": [{"color": "#ffffff"}]
            },
            {
                "featureType": "poi",
                "elementType": "all",
                "stylers": [{"visibility": "off"}]
            },
            {
                "featureType": "road",
                "elementType": "all",
                "stylers": [{"saturation": -100}, {"lightness": 45}]
            },
            {
                "featureType": "road",
                "elementType": "geometry.fill",
                "stylers": [{"color": "#eeeeee"}]
            },
            {
                "featureType": "road",
                "elementType": "labels.text.fill",
                "stylers": [{"color": "#7b7b7b"}]
            },
            {
                "featureType": "road",
                "elementType": "labels.text.stroke",
                "stylers": [{"color": "#ffffff"}]
            },
            {
                "featureType": "road.highway",
                "elementType": "all",
                "stylers": [{"visibility": "simplified"}]
            },
            {
                "featureType": "road.arterial",
                "elementType": "labels.icon",
                "stylers": [{"visibility": "off"}]
            },
            {
                "featureType": "transit",
                "elementType": "all",
                "stylers": [{"visibility": "off"}]
            },
            {
                "featureType": "water",
                "elementType": "all",
                "stylers": [{"color": "#46bcec"}, {"visibility": "on"}]
            },
            {
                "featureType": "water",
                "elementType": "geometry.fill",
                "stylers": [{"color": "#c8d7d4"}]
            },
            {
                "featureType": "water",
                "elementType": "labels.text.fill",
                "stylers": [{"color": "#070707"}]
            },
            {
                "featureType": "water",
                "elementType": "labels.text.stroke",
                "stylers": [{"color": "#ffffff"}]
            }
        ];
    }

    showMapError() {
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
            mapContainer.innerHTML = `
                <div class="map-error">
                    <i class="fas fa-exclamation-triangle"></i>
                    <h3>Map Unavailable</h3>
                    <p>Unable to load the map. Please check your internet connection and try refreshing the page.</p>
                    <button onclick="location.reload()" class="retry-btn">
                        <i class="fas fa-redo"></i> Retry
                    </button>
                </div>
            `;
        }
    }

    // Reverse geocoding for current location
    async reverseGeocode(lat, lng) {
        if (!this.geocoder) return;

        return new Promise((resolve, reject) => {
            this.geocoder.geocode({ location: { lat, lng } }, (results, status) => {
                if (status === 'OK' && results[0]) {
                    const address = results[0].formatted_address;
                    const locationInput = document.getElementById('location');
                    if (locationInput) {
                        locationInput.value = address;
                        // Trigger validation
                        if (window.app) {
                            window.app.validateStep2();
                        }
                    }
                    resolve(address);
                } else {
                    reject(new Error('Reverse geocoding failed'));
                }
            });
        });
    }

    // Toggle map view between roadmap and satellite
    toggleMapView() {
        if (!this.map) return;
        
        const currentType = this.map.getMapTypeId();
        const newType = currentType === 'roadmap' ? 'satellite' : 'roadmap';
        this.map.setMapTypeId(newType);
        
        // Update button text
        const toggleBtn = document.getElementById('mapViewToggle');
        if (toggleBtn) {
            const icon = toggleBtn.querySelector('i');
            const text = toggleBtn.childNodes[1];
            if (newType === 'satellite') {
                icon.className = 'fas fa-map';
                text.textContent = ' Roadmap';
            } else {
                icon.className = 'fas fa-satellite';
                text.textContent = ' Satellite';
            }
        }
    }

    // Center map to show all markers
    centerMap() {
        if (!this.map || this.markers.length === 0) return;
        this.fitMapToMarkers();
    }

    // Search for nearby places
    searchNearbyPlaces(location, type = 'restaurant') {
        if (!this.placesService) return;

        const request = {
            location: location,
            radius: 1000,
            type: [type]
        };

        this.placesService.nearbySearch(request, (results, status) => {
            if (status === google.maps.places.PlacesServiceStatus.OK) {
                // Display nearby places in a modal or sidebar
                this.displayNearbyPlaces(results, type);
            }
        });
    }

    displayNearbyPlaces(places, type) {
        // Create a simple display of nearby places
        const nearbyContainer = document.createElement('div');
        nearbyContainer.className = 'nearby-places-container';
        nearbyContainer.innerHTML = `
            <div class="nearby-header">
                <h4>Nearby ${type.charAt(0).toUpperCase() + type.slice(1)}s</h4>
                <button onclick="this.parentElement.parentElement.remove()" class="close-btn">×</button>
            </div>
            <div class="nearby-list">
                ${places.slice(0, 5).map(place => `
                    <div class="nearby-item">
                        <h5>${place.name}</h5>
                        <div class="nearby-rating">
                            ${place.rating ? `⭐ ${place.rating}` : 'No rating'}
                        </div>
                        <div class="nearby-address">${place.vicinity}</div>
                    </div>
                `).join('')}
            </div>
        `;
        
        document.body.appendChild(nearbyContainer);
    }
}

// Global functions
function initializeMap(places, centerLocation) {
    if (window.mapsManager) {
        window.mapsManager.initializeMap(places, centerLocation);
    }
}

function reverseGeocode(lat, lng) {
    if (window.mapsManager) {
        window.mapsManager.reverseGeocode(lat, lng);
    }
}

function toggleMapView() {
    if (window.mapsManager) {
        window.mapsManager.toggleMapView();
    }
}

function centerMap() {
    if (window.mapsManager) {
        window.mapsManager.centerMap();
    }
}

// Global callback for Google Maps API
window.initMaps = function() {
    console.log('Google Maps API loaded, initializing MapsManager');
    if (!window.mapsManager) {
        window.mapsManager = new MapsManager();
    }
    window.mapsManager.initializeServices();
};

// Initialize maps manager
document.addEventListener('DOMContentLoaded', () => {
    if (!window.mapsManager) {
        window.mapsManager = new MapsManager();
    }
});

// Add CSS for info windows
const mapStyles = document.createElement('style');
mapStyles.textContent = `
    .map-info-window {
        max-width: 300px;
        font-family: 'Inter', sans-serif;
    }

    .info-header {
        display: flex;
        align-items: center;
        gap: 0.75rem;
        margin-bottom: 0.75rem;
    }

    .info-number {
        background: #667eea;
        color: white;
        width: 24px;
        height: 24px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 0.8rem;
        font-weight: 600;
        flex-shrink: 0;
    }

    .info-title h3 {
        margin: 0;
        font-size: 1.1rem;
        font-weight: 600;
        color: #333;
    }

    .info-type {
        font-size: 0.8rem;
        color: #667eea;
        font-weight: 500;
    }

    .info-image {
        width: 100%;
        height: 120px;
        object-fit: cover;
        border-radius: 8px;
        margin-bottom: 0.75rem;
    }

    .info-content p {
        margin: 0 0 0.75rem 0;
        color: #666;
        font-size: 0.9rem;
        line-height: 1.4;
    }

    .info-details {
        display: flex;
        flex-direction: column;
        gap: 0.5rem;
        margin-bottom: 0.75rem;
    }

    .info-details > div {
        display: flex;
        align-items: center;
        gap: 0.5rem;
        font-size: 0.85rem;
        color: #555;
    }

    .info-details i {
        width: 12px;
        color: #667eea;
    }

    .info-tips {
        background: #f8f9fa;
        padding: 0.5rem;
        border-radius: 6px;
        font-size: 0.85rem;
        color: #555;
        margin-bottom: 0.75rem;
    }

    .info-actions {
        display: flex;
        gap: 0.5rem;
    }

    .info-btn {
        flex: 1;
        padding: 0.5rem;
        background: #667eea;
        color: white;
        border: none;
        border-radius: 6px;
        font-size: 0.8rem;
        cursor: pointer;
        transition: background 0.3s ease;
    }

    .info-btn:hover {
        background: #5a6fd8;
    }

    .map-error {
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        text-align: center;
        color: #666;
        padding: 2rem;
    }

    .map-error i {
        font-size: 3rem;
        color: #dc3545;
        margin-bottom: 1rem;
    }

    .map-error h3 {
        margin-bottom: 0.5rem;
        color: #333;
    }

    .retry-btn {
        margin-top: 1rem;
        padding: 0.5rem 1rem;
        background: #667eea;
        color: white;
        border: none;
        border-radius: 6px;
        cursor: pointer;
        font-size: 0.9rem;
        transition: background 0.3s ease;
    }

    .retry-btn:hover {
        background: #5a6fd8;
    }
`;
document.head.appendChild(mapStyles);