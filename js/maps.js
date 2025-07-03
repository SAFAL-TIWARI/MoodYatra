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
        if (typeof google !== 'undefined') {
            this.initializeServices();
        } else {
            // Wait for Google Maps to load
            window.initMaps = () => this.initializeServices();
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

        try {
            // Get center coordinates
            const center = await this.getCoordinates(centerLocation);
            
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
                // Fallback coordinates
                resolve({ lat: 40.7128, lng: -74.0060 });
                return;
            }

            this.geocoder.geocode({ address: location }, (results, status) => {
                if (status === 'OK' && results[0]) {
                    resolve(results[0].geometry.location.toJSON());
                } else {
                    console.warn('Geocoding failed:', status);
                    // Fallback to default coordinates
                    resolve({ lat: 40.7128, lng: -74.0060 });
                }
            });
        });
    }

    async addPlaceMarkers(places) {
        // Clear existing markers
        this.clearMarkers();

        for (let i = 0; i < places.length; i++) {
            const place = places[i];
            let coordinates;

            // Use provided coordinates or geocode the address
            if (place.lat && place.lng) {
                coordinates = { lat: place.lat, lng: place.lng };
            } else if (place.address) {
                coordinates = await this.getCoordinates(place.address);
            } else {
                // Skip if no location data
                continue;
            }

            // Create custom marker
            const marker = new google.maps.Marker({
                position: coordinates,
                map: this.map,
                title: place.name,
                icon: this.createCustomMarker(i + 1, place.type),
                animation: google.maps.Animation.DROP
            });

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
    }

    createCustomMarker(number, type) {
        // Create custom marker based on place type
        const colors = {
            'Restaurant': '#e74c3c',
            'Park': '#27ae60',
            'Museum': '#9b59b6',
            'Entertainment': '#f39c12',
            'Shopping': '#3498db',
            'Cultural': '#8e44ad',
            'Nightlife': '#e67e22',
            'Wellness': '#1abc9c',
            'default': '#667eea'
        };

        const color = colors[type] || colors.default;

        return {
            path: google.maps.SymbolPath.CIRCLE,
            fillColor: color,
            fillOpacity: 1,
            strokeColor: '#ffffff',
            strokeWeight: 2,
            scale: 12,
            labelOrigin: new google.maps.Point(0, 0)
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
                                <i class="fas fa-dollar-sign"></i>
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
            radius: 100,
            query: place.name
        };

        return new Promise((resolve) => {
            this.placesService.textSearch(request, (results, status) => {
                if (status === google.maps.places.PlacesServiceStatus.OK && results[0]) {
                    const placeResult = results[0];
                    
                    // Enhance place data
                    if (!place.rating && placeResult.rating) {
                        place.rating = placeResult.rating.toFixed(1);
                    }
                    if (!place.reviews && placeResult.user_ratings_total) {
                        place.reviews = placeResult.user_ratings_total;
                    }
                    if (!place.image && placeResult.photos && placeResult.photos[0]) {
                        place.image = placeResult.photos[0].getUrl({ maxWidth: 300, maxHeight: 200 });
                    }
                    if (!place.address && placeResult.formatted_address) {
                        place.address = placeResult.formatted_address;
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
                    <p>Unable to load the map. Please check your internet connection.</p>
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

// Initialize maps manager
document.addEventListener('DOMContentLoaded', () => {
    window.mapsManager = new MapsManager();
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
`;
document.head.appendChild(mapStyles);