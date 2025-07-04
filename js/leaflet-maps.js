// Leaflet Maps Manager for MoodYatra
class LeafletMapsManager {
    constructor() {
        this.map = null;
        this.markers = [];
        this.routeControl = null;
        this.currentInfoWindow = null;
        this.isInitialized = false;
        
        // OpenStreetMap tile layers
        this.tileLayers = {
            osm: {
                url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
                attribution: '© OpenStreetMap contributors'
            },
            cartodb: {
                url: 'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
                attribution: '© OpenStreetMap contributors © CARTO'
            }
        };
        
        this.init();
    }

    init() {
        // Initialize when Leaflet is loaded
        if (typeof L !== 'undefined') {
            this.isInitialized = true;
            console.log('Leaflet Maps Manager initialized');
        } else {
            console.warn('Leaflet not loaded yet');
            // Wait for Leaflet to load
            const checkLeaflet = setInterval(() => {
                if (typeof L !== 'undefined') {
                    clearInterval(checkLeaflet);
                    this.isInitialized = true;
                    console.log('Leaflet Maps Manager initialized');
                }
            }, 100);
        }
    }

    async initializeMap(places, mapContainerId = 'map') {
        try {
            if (!this.isInitialized) {
                console.error('Leaflet not initialized');
                this.showMapError();
                return;
            }

            const mapContainer = document.getElementById(mapContainerId);
            if (!mapContainer) {
                console.error('Map container not found');
                return;
            }

            // Clear existing map
            if (this.map) {
                this.map.remove();
            }

            // Calculate center point
            const center = this.calculateCenter(places);
            
            // Initialize map
            this.map = L.map(mapContainerId, {
                center: [center.lat, center.lng],
                zoom: 13,
                zoomControl: true,
                attributionControl: true
            });

            // Add tile layer
            L.tileLayer(this.tileLayers.cartodb.url, {
                attribution: this.tileLayers.cartodb.attribution,
                maxZoom: 19
            }).addTo(this.map);

            // Add markers for places
            this.addMarkers(places);

            // Fit map to show all markers
            this.fitMapToMarkers();

            // Add route if more than one place
            if (places.length > 1) {
                this.addRoute(places);
            }

            console.log('Map initialized successfully');
        } catch (error) {
            console.error('Error initializing map:', error);
            this.showMapError();
        }
    }

    calculateCenter(places) {
        if (!places || places.length === 0) {
            return { lat: 40.7128, lng: -74.0060 }; // Default to NYC
        }

        const validPlaces = places.filter(place => place.lat && place.lng);
        if (validPlaces.length === 0) {
            return { lat: 40.7128, lng: -74.0060 };
        }

        const sum = validPlaces.reduce((acc, place) => ({
            lat: acc.lat + parseFloat(place.lat),
            lng: acc.lng + parseFloat(place.lng)
        }), { lat: 0, lng: 0 });

        return {
            lat: sum.lat / validPlaces.length,
            lng: sum.lng / validPlaces.length
        };
    }

    addMarkers(places) {
        this.clearMarkers();

        places.forEach((place, index) => {
            if (!place.lat || !place.lng) {
                console.warn(`Place ${place.name} missing coordinates`);
                return;
            }

            const coordinates = [parseFloat(place.lat), parseFloat(place.lng)];
            
            // Create custom marker icon
            const customIcon = this.createCustomMarker(index + 1, place.type);
            
            // Create marker
            const marker = L.marker(coordinates, { icon: customIcon }).addTo(this.map);
            
            // Create popup content
            const popupContent = this.createPopupContent(place, index);
            marker.bindPopup(popupContent, {
                maxWidth: 300,
                className: 'custom-popup'
            });

            // Store marker reference
            this.markers.push(marker);

            // Add click event for place card interaction
            marker.on('click', () => {
                this.highlightPlaceCard(index);
            });
        });
    }

    createCustomMarker(number, type) {
        const color = this.getMarkerColor(type);
        
        return L.divIcon({
            className: 'custom-marker',
            html: `
                <div class="marker-pin" style="background-color: ${color};">
                    <span class="marker-number">${number}</span>
                </div>
                <div class="marker-shadow"></div>
            `,
            iconSize: [32, 40],
            iconAnchor: [16, 40],
            popupAnchor: [0, -40]
        });
    }

    getMarkerColor(type) {
        const colorMap = {
            'Restaurant': '#FF6B6B',
            'Park': '#4ECDC4',
            'Museum': '#45B7D1',
            'Entertainment': '#96CEB4',
            'Shopping': '#FFEAA7',
            'Cultural': '#DDA0DD',
            'Nightlife': '#FF7675',
            'Wellness': '#74B9FF',
            'Cafe': '#FDCB6E',
            'Gallery': '#A29BFE',
            'Market': '#FD79A8',
            'Garden': '#00B894',
            'Wine Bar': '#E17055',
            'Spa': '#81ECEC',
            'Hiking': '#00A085',
            'Nature Center': '#55A3FF',
            'Scenic Spot': '#FF8A80'
        };
        
        return colorMap[type] || '#6C5CE7';
    }

    createPopupContent(place, index) {
        const imageUrl = place.image || `https://picsum.photos/200/150?random=${index}`;
        const rating = place.rating || 'N/A';
        const reviews = place.reviews || 0;
        
        return `
            <div class="place-popup">
                <div class="popup-image">
                    <img src="${imageUrl}" alt="${place.name}" onerror="this.src='https://picsum.photos/200/150?random=${index}'">
                </div>
                <div class="popup-content">
                    <h3 class="popup-title">${place.name}</h3>
                    <p class="popup-type">${place.type}</p>
                    <div class="popup-rating">
                        <span class="rating-stars">${this.generateStars(rating)}</span>
                        <span class="rating-text">${rating} (${reviews} reviews)</span>
                    </div>
                    <p class="popup-description">${place.description || 'A wonderful place to visit!'}</p>
                    <div class="popup-time">
                        <i class="fas fa-clock"></i>
                        <span>${place.duration || '1-2 hours'}</span>
                    </div>
                    ${place.address ? `<p class="popup-address"><i class="fas fa-map-marker-alt"></i> ${place.address}</p>` : ''}
                </div>
            </div>
        `;
    }

    generateStars(rating) {
        const numRating = parseFloat(rating) || 0;
        const fullStars = Math.floor(numRating);
        const hasHalfStar = numRating % 1 >= 0.5;
        const emptyStars = 5 - fullStars - (hasHalfStar ? 1 : 0);
        
        let stars = '';
        for (let i = 0; i < fullStars; i++) {
            stars += '<i class="fas fa-star"></i>';
        }
        if (hasHalfStar) {
            stars += '<i class="fas fa-star-half-alt"></i>';
        }
        for (let i = 0; i < emptyStars; i++) {
            stars += '<i class="far fa-star"></i>';
        }
        
        return stars;
    }

    addRoute(places) {
        if (!places || places.length < 2) return;

        try {
            // Clear existing route
            if (this.routeControl) {
                this.map.removeControl(this.routeControl);
            }

            // Create waypoints
            const waypoints = places
                .filter(place => place.lat && place.lng)
                .map(place => L.latLng(parseFloat(place.lat), parseFloat(place.lng)));

            if (waypoints.length < 2) return;

            // Add routing control
            this.routeControl = L.Routing.control({
                waypoints: waypoints,
                routeWhileDragging: false,
                addWaypoints: false,
                createMarker: () => null, // Don't create default markers
                lineOptions: {
                    styles: [{
                        color: '#6C5CE7',
                        weight: 4,
                        opacity: 0.8
                    }]
                },
                router: L.Routing.osrmv1({
                    serviceUrl: 'https://router.project-osrm.org/route/v1'
                }),
                formatter: new L.Routing.Formatter({
                    language: 'en',
                    units: 'metric'
                })
            }).addTo(this.map);

            // Hide the routing instructions panel by default
            const routingContainer = document.querySelector('.leaflet-routing-container');
            if (routingContainer) {
                routingContainer.style.display = 'none';
            }

        } catch (error) {
            console.warn('Error adding route:', error);
        }
    }

    clearMarkers() {
        this.markers.forEach(marker => {
            this.map.removeLayer(marker);
        });
        this.markers = [];
    }

    fitMapToMarkers() {
        if (this.markers.length === 0) return;

        const group = new L.featureGroup(this.markers);
        this.map.fitBounds(group.getBounds().pad(0.1));
        
        // Ensure minimum zoom level
        if (this.map.getZoom() > 15) {
            this.map.setZoom(15);
        }
    }

    highlightPlaceCard(index) {
        // Remove existing highlights
        document.querySelectorAll('.place-card').forEach(card => {
            card.classList.remove('highlighted');
        });

        // Highlight the corresponding place card
        const placeCard = document.querySelector(`.place-card[data-index="${index}"]`);
        if (placeCard) {
            placeCard.classList.add('highlighted');
            placeCard.scrollIntoView({ behavior: 'smooth', block: 'center' });
        }
    }

    showMapError() {
        const mapContainer = document.getElementById('map');
        if (mapContainer) {
            mapContainer.innerHTML = `
                <div class="map-error">
                    <div class="error-content">
                        <i class="fas fa-map-marked-alt"></i>
                        <h3>Map Unavailable</h3>
                        <p>Unable to load the interactive map. Please check your internet connection.</p>
                        <button onclick="location.reload()" class="retry-btn">
                            <i class="fas fa-redo"></i> Retry
                        </button>
                    </div>
                </div>
            `;
        }
    }

    // Public methods for external interaction
    openMarkerPopup(index) {
        if (this.markers[index]) {
            this.markers[index].openPopup();
        }
    }

    closeAllPopups() {
        this.markers.forEach(marker => {
            marker.closePopup();
        });
    }

    centerOnPlace(index) {
        if (this.markers[index]) {
            const marker = this.markers[index];
            this.map.setView(marker.getLatLng(), 16);
            marker.openPopup();
        }
    }

    toggleRouteInstructions() {
        const routingContainer = document.querySelector('.leaflet-routing-container');
        if (routingContainer) {
            const isHidden = routingContainer.style.display === 'none';
            routingContainer.style.display = isHidden ? 'block' : 'none';
        }
    }

    // Search for nearby places
    async searchNearbyPlaces(lat, lng, type) {
        try {
            const response = await fetch('/api/places/nearby', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    lat: lat,
                    lng: lng,
                    type: type,
                    radius: 1000
                })
            });

            if (!response.ok) {
                throw new Error('Failed to fetch nearby places');
            }

            const nearbyPlaces = await response.json();
            this.displayNearbyPlaces(nearbyPlaces, type);
        } catch (error) {
            console.error('Error searching nearby places:', error);
        }
    }

    displayNearbyPlaces(places, type) {
        // Create a modal or sidebar to display nearby places
        const modal = document.createElement('div');
        modal.className = 'nearby-places-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>Nearby ${type} Places</h3>
                    <button class="close-btn" onclick="this.closest('.nearby-places-modal').remove()">
                        <i class="fas fa-times"></i>
                    </button>
                </div>
                <div class="modal-body">
                    ${places.map(place => `
                        <div class="nearby-place-item">
                            <img src="${place.image || 'https://picsum.photos/60/60'}" alt="${place.name}">
                            <div class="place-info">
                                <h4>${place.name}</h4>
                                <p class="place-rating">${this.generateStars(place.rating)} ${place.rating}</p>
                                <p class="place-distance">${place.distance || 'Unknown'} away</p>
                            </div>
                        </div>
                    `).join('')}
                </div>
            </div>
        `;
        
        document.body.appendChild(modal);
    }

    // Cleanup method
    destroy() {
        if (this.map) {
            this.map.remove();
            this.map = null;
        }
        this.markers = [];
        this.routeControl = null;
    }
}

// Global initialization
let mapsManager = null;

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    // Only initialize if we're on a page with maps
    if (document.getElementById('map') || document.querySelector('[data-map]')) {
        mapsManager = new LeafletMapsManager();
        window.mapsManager = mapsManager;
    }
});

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = LeafletMapsManager;
}

// Global callback for compatibility
window.initMaps = function() {
    console.log('Leaflet Maps initialized');
    if (!window.mapsManager) {
        window.mapsManager = new LeafletMapsManager();
    }
};