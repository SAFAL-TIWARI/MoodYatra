// Google Maps Service for Places and Geocoding
const { Client } = require('@googlemaps/google-maps-services-js');

class GoogleMapsService {
    constructor() {
        this.apiKey = process.env.GOOGLE_MAPS_API_KEY;
        this.client = null;
        this.init();
    }

    init() {
        if (this.apiKey) {
            this.client = new Client({});
            console.log('🗺️  Google Maps service initialized');
        } else {
            console.warn('⚠️  Google Maps API key not found. Using mock responses.');
        }
    }

    async enhanceTripData(tripData, location) {
        try {
            if (!this.client) {
                console.log('Using mock place enhancement');
                return this.addMockEnhancements(tripData);
            }

            // Enhance each place in the itinerary
            const enhancedItinerary = await Promise.all(
                tripData.itinerary.map(async (place) => {
                    try {
                        const enhancedPlace = await this.enhancePlace(place, location);
                        return enhancedPlace;
                    } catch (error) {
                        console.warn(`Failed to enhance place ${place.name}:`, error.message);
                        return this.addMockDataToPlace(place);
                    }
                })
            );

            return {
                ...tripData,
                itinerary: enhancedItinerary
            };
        } catch (error) {
            console.error('Error enhancing trip data:', error);
            return this.addMockEnhancements(tripData);
        }
    }

    async enhancePlace(place, location) {
        try {
            // Search for the place using Google Places API
            const searchQuery = `${place.name} ${location}`;
            const searchResponse = await this.client.textSearch({
                params: {
                    query: searchQuery,
                    key: this.apiKey,
                    type: this.getPlaceType(place.type)
                }
            });

            if (searchResponse.data.results && searchResponse.data.results.length > 0) {
                const placeResult = searchResponse.data.results[0];
                
                // Get place details
                const detailsResponse = await this.client.placeDetails({
                    params: {
                        place_id: placeResult.place_id,
                        key: this.apiKey,
                        fields: [
                            'name',
                            'formatted_address',
                            'geometry',
                            'rating',
                            'user_ratings_total',
                            'photos',
                            'opening_hours',
                            'price_level',
                            'website',
                            'formatted_phone_number'
                        ]
                    }
                });

                const details = detailsResponse.data.result;
                
                return {
                    ...place,
                    address: details.formatted_address || place.address,
                    lat: details.geometry?.location?.lat || place.lat,
                    lng: details.geometry?.location?.lng || place.lng,
                    rating: details.rating ? details.rating.toFixed(1) : place.rating,
                    reviews: details.user_ratings_total || place.reviews,
                    image: this.getPlacePhoto(details.photos),
                    website: details.website,
                    phone: details.formatted_phone_number,
                    openingHours: this.formatOpeningHours(details.opening_hours),
                    priceLevel: details.price_level,
                    placeId: placeResult.place_id
                };
            } else {
                // No results found, add mock data
                return this.addMockDataToPlace(place);
            }
        } catch (error) {
            console.warn(`Error enhancing place ${place.name}:`, error.message);
            return this.addMockDataToPlace(place);
        }
    }

    getPlacePhoto(photos) {
        if (!photos || photos.length === 0) {
            return `https://picsum.photos/300/200?random=${Math.floor(Math.random() * 1000)}`;
        }

        const photoReference = photos[0].photo_reference;
        return `https://maps.googleapis.com/maps/api/place/photo?maxwidth=400&photoreference=${photoReference}&key=${this.apiKey}`;
    }

    formatOpeningHours(openingHours) {
        if (!openingHours || !openingHours.weekday_text) {
            return null;
        }

        return {
            isOpen: openingHours.open_now,
            hours: openingHours.weekday_text
        };
    }

    getPlaceType(type) {
        const typeMapping = {
            'Restaurant': 'restaurant',
            'Park': 'park',
            'Museum': 'museum',
            'Entertainment': 'amusement_park',
            'Shopping': 'shopping_mall',
            'Cultural': 'museum',
            'Nightlife': 'night_club',
            'Wellness': 'spa',
            'Cafe': 'cafe',
            'Gallery': 'art_gallery',
            'Market': 'shopping_mall',
            'Garden': 'park',
            'Wine Bar': 'bar',
            'Spa': 'spa',
            'Hiking': 'park',
            'Nature Center': 'zoo',
            'Scenic Spot': 'tourist_attraction'
        };

        return typeMapping[type] || 'point_of_interest';
    }

    async geocode(address) {
        try {
            if (!this.client) {
                return this.getMockCoordinates(address);
            }

            const response = await this.client.geocode({
                params: {
                    address: address,
                    key: this.apiKey
                }
            });

            if (response.data.results && response.data.results.length > 0) {
                const result = response.data.results[0];
                return {
                    lat: result.geometry.location.lat,
                    lng: result.geometry.location.lng,
                    formatted_address: result.formatted_address
                };
            } else {
                throw new Error('No results found');
            }
        } catch (error) {
            console.error('Geocoding error:', error);
            return this.getMockCoordinates(address);
        }
    }

    async reverseGeocode(lat, lng) {
        try {
            if (!this.client) {
                return { formatted_address: `${lat.toFixed(4)}, ${lng.toFixed(4)}` };
            }

            const response = await this.client.reverseGeocode({
                params: {
                    latlng: { lat, lng },
                    key: this.apiKey
                }
            });

            if (response.data.results && response.data.results.length > 0) {
                return {
                    formatted_address: response.data.results[0].formatted_address
                };
            } else {
                throw new Error('No results found');
            }
        } catch (error) {
            console.error('Reverse geocoding error:', error);
            return { formatted_address: `${lat.toFixed(4)}, ${lng.toFixed(4)}` };
        }
    }

    async getPlaceDetails(placeId) {
        try {
            if (!this.client) {
                throw new Error('Google Maps client not available');
            }

            const response = await this.client.placeDetails({
                params: {
                    place_id: placeId,
                    key: this.apiKey,
                    fields: [
                        'name',
                        'formatted_address',
                        'geometry',
                        'rating',
                        'user_ratings_total',
                        'photos',
                        'opening_hours',
                        'price_level',
                        'website',
                        'formatted_phone_number',
                        'reviews'
                    ]
                }
            });

            const details = response.data.result;
            
            return {
                name: details.name,
                address: details.formatted_address,
                location: details.geometry.location,
                rating: details.rating,
                reviews: details.user_ratings_total,
                photos: details.photos?.map(photo => this.getPlacePhoto([photo])),
                openingHours: this.formatOpeningHours(details.opening_hours),
                priceLevel: details.price_level,
                website: details.website,
                phone: details.formatted_phone_number,
                userReviews: details.reviews?.slice(0, 3) // Get first 3 reviews
            };
        } catch (error) {
            console.error('Get place details error:', error);
            throw error;
        }
    }

    async searchNearbyPlaces(location, type, radius = 5000) {
        try {
            if (!this.client) {
                return this.getMockNearbyPlaces(type);
            }

            const response = await this.client.placesNearby({
                params: {
                    location: location,
                    radius: radius,
                    type: type,
                    key: this.apiKey
                }
            });

            return response.data.results.map(place => ({
                placeId: place.place_id,
                name: place.name,
                rating: place.rating,
                priceLevel: place.price_level,
                location: place.geometry.location,
                types: place.types,
                photo: this.getPlacePhoto(place.photos)
            }));
        } catch (error) {
            console.error('Nearby places search error:', error);
            return this.getMockNearbyPlaces(type);
        }
    }

    async placeAutocomplete(input, sessionToken = null) {
        try {
            if (!this.client) {
                return this.getMockAutocompleteSuggestions(input);
            }

            const params = {
                input: input,
                key: this.apiKey,
                types: '(cities)', // Focus on cities and places
                language: 'en'
            };

            // Add session token if provided for billing optimization
            if (sessionToken) {
                params.sessiontoken = sessionToken;
            }

            const response = await this.client.placeAutocomplete({
                params: params
            });

            if (response.data.predictions) {
                return {
                    predictions: response.data.predictions.map(prediction => ({
                        place_id: prediction.place_id,
                        description: prediction.description,
                        structured_formatting: prediction.structured_formatting,
                        types: prediction.types,
                        terms: prediction.terms
                    })),
                    status: response.data.status
                };
            } else {
                return { predictions: [], status: 'ZERO_RESULTS' };
            }
        } catch (error) {
            console.error('Place autocomplete error:', error);
            return this.getMockAutocompleteSuggestions(input);
        }
    }

    async calculateRoute(origin, destination, waypoints = []) {
        try {
            if (!this.client) {
                return this.getMockRoute();
            }

            const response = await this.client.directions({
                params: {
                    origin: origin,
                    destination: destination,
                    waypoints: waypoints,
                    optimize: true,
                    key: this.apiKey
                }
            });

            if (response.data.routes && response.data.routes.length > 0) {
                const route = response.data.routes[0];
                return {
                    distance: route.legs.reduce((total, leg) => total + leg.distance.value, 0),
                    duration: route.legs.reduce((total, leg) => total + leg.duration.value, 0),
                    polyline: route.overview_polyline.points,
                    steps: route.legs.flatMap(leg => leg.steps)
                };
            } else {
                throw new Error('No route found');
            }
        } catch (error) {
            console.error('Route calculation error:', error);
            return this.getMockRoute();
        }
    }

    // Mock data methods for fallback
    addMockEnhancements(tripData) {
        const baseCoords = this.getMockCoordinates(tripData.location);
        
        const enhancedItinerary = tripData.itinerary.map((place, index) => ({
            ...place,
            lat: baseCoords.lat + (Math.random() - 0.5) * 0.02,
            lng: baseCoords.lng + (Math.random() - 0.5) * 0.02,
            rating: place.rating || (Math.random() * 2 + 3).toFixed(1),
            reviews: place.reviews || Math.floor(Math.random() * 500) + 50,
            image: place.image || `https://picsum.photos/300/200?random=${Math.floor(Math.random() * 1000)}`,
            address: place.address || `${Math.floor(Math.random() * 999) + 1} Main St, ${tripData.location}`
        }));

        return {
            ...tripData,
            itinerary: enhancedItinerary
        };
    }

    addMockDataToPlace(place) {
        return {
            ...place,
            rating: place.rating || (Math.random() * 2 + 3).toFixed(1),
            reviews: place.reviews || Math.floor(Math.random() * 500) + 50,
            image: place.image || `https://picsum.photos/300/200?random=${Math.floor(Math.random() * 1000)}`,
            lat: place.lat || (40.7128 + (Math.random() - 0.5) * 0.02),
            lng: place.lng || (-74.0060 + (Math.random() - 0.5) * 0.02)
        };
    }

    getMockCoordinates(location) {
        const coordinates = {
            'New York': { lat: 40.7128, lng: -74.0060 },
            'Los Angeles': { lat: 34.0522, lng: -118.2437 },
            'Chicago': { lat: 41.8781, lng: -87.6298 },
            'San Francisco': { lat: 37.7749, lng: -122.4194 },
            'Miami': { lat: 25.7617, lng: -80.1918 },
            'Seattle': { lat: 47.6062, lng: -122.3321 },
            'Boston': { lat: 42.3601, lng: -71.0589 },
            'Austin': { lat: 30.2672, lng: -97.7431 },
            'Denver': { lat: 39.7392, lng: -104.9903 },
            'Portland': { lat: 45.5152, lng: -122.6784 }
        };

        for (const [city, coords] of Object.entries(coordinates)) {
            if (location.toLowerCase().includes(city.toLowerCase())) {
                return coords;
            }
        }

        return coordinates['New York'];
    }

    getMockNearbyPlaces(type) {
        const mockPlaces = [
            { name: 'Local Favorite Spot', rating: 4.2, priceLevel: 2 },
            { name: 'Hidden Gem', rating: 4.5, priceLevel: 1 },
            { name: 'Popular Destination', rating: 4.0, priceLevel: 3 }
        ];

        return mockPlaces.map((place, index) => ({
            ...place,
            placeId: `mock_${type}_${index}`,
            location: { lat: 40.7128 + Math.random() * 0.01, lng: -74.0060 + Math.random() * 0.01 },
            types: [type],
            photo: `https://picsum.photos/300/200?random=${Math.floor(Math.random() * 1000)}`
        }));
    }

    getMockRoute() {
        return {
            distance: Math.floor(Math.random() * 10000) + 5000, // 5-15km
            duration: Math.floor(Math.random() * 1800) + 600, // 10-40 minutes
            polyline: 'mock_polyline_data',
            steps: []
        };
    }

    getMockAutocompleteSuggestions(input) {
        const mockSuggestions = [
            {
                place_id: 'mock_place_1',
                description: `${input} City, State, Country`,
                structured_formatting: {
                    main_text: `${input} City`,
                    secondary_text: 'State, Country'
                },
                types: ['locality', 'political'],
                terms: [
                    { offset: 0, value: `${input} City` },
                    { offset: input.length + 6, value: 'State' },
                    { offset: input.length + 13, value: 'Country' }
                ]
            },
            {
                place_id: 'mock_place_2',
                description: `${input} Downtown, City, State`,
                structured_formatting: {
                    main_text: `${input} Downtown`,
                    secondary_text: 'City, State'
                },
                types: ['sublocality', 'political'],
                terms: [
                    { offset: 0, value: `${input} Downtown` },
                    { offset: input.length + 10, value: 'City' },
                    { offset: input.length + 16, value: 'State' }
                ]
            },
            {
                place_id: 'mock_place_3',
                description: `${input} Beach, Coastal City, State`,
                structured_formatting: {
                    main_text: `${input} Beach`,
                    secondary_text: 'Coastal City, State'
                },
                types: ['natural_feature'],
                terms: [
                    { offset: 0, value: `${input} Beach` },
                    { offset: input.length + 7, value: 'Coastal City' },
                    { offset: input.length + 21, value: 'State' }
                ]
            },
            {
                place_id: 'mock_place_4',
                description: `${input} Airport, City, State`,
                structured_formatting: {
                    main_text: `${input} Airport`,
                    secondary_text: 'City, State'
                },
                types: ['airport', 'establishment'],
                terms: [
                    { offset: 0, value: `${input} Airport` },
                    { offset: input.length + 9, value: 'City' },
                    { offset: input.length + 15, value: 'State' }
                ]
            },
            {
                place_id: 'mock_place_5',
                description: `${input} University, City, State`,
                structured_formatting: {
                    main_text: `${input} University`,
                    secondary_text: 'City, State'
                },
                types: ['university', 'establishment'],
                terms: [
                    { offset: 0, value: `${input} University` },
                    { offset: input.length + 12, value: 'City' },
                    { offset: input.length + 18, value: 'State' }
                ]
            }
        ];

        // Filter suggestions based on input length and relevance
        const filteredSuggestions = mockSuggestions.slice(0, Math.min(5, Math.max(1, input.length - 1)));

        return {
            predictions: filteredSuggestions,
            status: 'OK'
        };
    }

    // Health check method
    async healthCheck() {
        try {
            if (!this.client) {
                return { status: 'mock', message: 'Using mock responses' };
            }

            // Simple geocoding test
            const testResult = await this.geocode('New York, NY');
            
            return { 
                status: 'healthy', 
                message: 'Google Maps API is working',
                test: `Geocoded: ${testResult.formatted_address}`
            };
        } catch (error) {
            return { 
                status: 'error', 
                message: error.message 
            };
        }
    }
}

module.exports = GoogleMapsService;