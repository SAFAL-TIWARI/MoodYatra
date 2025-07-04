// Open Source Maps Service using Nominatim, OpenTripMap, and Wikipedia
const axios = require('axios');

class OpenMapsService {
    constructor() {
        this.nominatimUrl = process.env.NOMINATIM_API_URL || 'https://nominatim.openstreetmap.org';
        this.openTripMapApiKey = process.env.OPENTRIPMAP_API_KEY;
        this.openTripMapUrl = 'https://api.opentripmap.com/0.1/en/places';
        this.wikipediaUrl = process.env.WIKIPEDIA_API_URL || 'https://en.wikipedia.org/api/rest_v1';
        this.osrmUrl = 'https://router.project-osrm.org/route/v1/driving';
        
        // Rate limiting
        this.lastRequestTime = 0;
        this.minRequestInterval = 1000; // 1 second between requests for Nominatim
        
        console.log('🗺️  Open Source Maps service initialized');
    }

    // Rate limiting helper
    async rateLimit() {
        const now = Date.now();
        const timeSinceLastRequest = now - this.lastRequestTime;
        if (timeSinceLastRequest < this.minRequestInterval) {
            await new Promise(resolve => setTimeout(resolve, this.minRequestInterval - timeSinceLastRequest));
        }
        this.lastRequestTime = Date.now();
    }

    async enhanceTripData(tripData, location) {
        try {
            console.log('Enhancing trip data with open source services');
            
            // Enhance each place in the itinerary
            const enhancedItinerary = await Promise.all(
                tripData.itinerary.map(async (place, index) => {
                    try {
                        // Add delay between requests to respect rate limits
                        if (index > 0) {
                            await new Promise(resolve => setTimeout(resolve, 1000));
                        }
                        
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
            await this.rateLimit();
            
            // Search for the place using Nominatim
            const searchQuery = `${place.name} ${location}`;
            const searchResponse = await axios.get(`${this.nominatimUrl}/search`, {
                params: {
                    q: searchQuery,
                    format: 'json',
                    limit: 1,
                    addressdetails: 1,
                    extratags: 1,
                    namedetails: 1
                },
                headers: {
                    'User-Agent': 'MoodYatra/1.0 (contact@moodyatra.com)'
                },
                timeout: 10000
            });

            let enhancedPlace = { ...place };

            if (searchResponse.data && searchResponse.data.length > 0) {
                const result = searchResponse.data[0];
                
                enhancedPlace = {
                    ...place,
                    address: result.display_name || place.address,
                    lat: parseFloat(result.lat) || place.lat,
                    lng: parseFloat(result.lon) || place.lng,
                    osmId: result.osm_id,
                    osmType: result.osm_type
                };

                // Try to get additional details from OpenTripMap if API key is available
                if (this.openTripMapApiKey && result.lat && result.lon) {
                    try {
                        const nearbyPlaces = await this.getNearbyPlacesFromOpenTripMap(
                            parseFloat(result.lat), 
                            parseFloat(result.lon)
                        );
                        
                        if (nearbyPlaces.length > 0) {
                            const matchingPlace = nearbyPlaces.find(p => 
                                p.name && p.name.toLowerCase().includes(place.name.toLowerCase())
                            ) || nearbyPlaces[0];
                            
                            if (matchingPlace) {
                                enhancedPlace.rating = matchingPlace.rate || enhancedPlace.rating;
                                enhancedPlace.wikidata = matchingPlace.wikidata;
                            }
                        }
                    } catch (error) {
                        console.warn('OpenTripMap enhancement failed:', error.message);
                    }
                }

                // Try to get image from Wikipedia
                try {
                    const image = await this.getWikipediaImage(place.name, location);
                    if (image) {
                        enhancedPlace.image = image;
                    }
                } catch (error) {
                    console.warn('Wikipedia image fetch failed:', error.message);
                }
            }

            // Add mock data if still missing
            if (!enhancedPlace.rating) {
                enhancedPlace.rating = (Math.random() * 2 + 3).toFixed(1);
            }
            if (!enhancedPlace.reviews) {
                enhancedPlace.reviews = Math.floor(Math.random() * 500) + 50;
            }
            if (!enhancedPlace.image) {
                enhancedPlace.image = `https://picsum.photos/300/200?random=${Math.floor(Math.random() * 1000)}`;
            }

            return enhancedPlace;
        } catch (error) {
            console.warn(`Error enhancing place ${place.name}:`, error.message);
            return this.addMockDataToPlace(place);
        }
    }

    async getNearbyPlacesFromOpenTripMap(lat, lng, radius = 1000) {
        if (!this.openTripMapApiKey) {
            return [];
        }

        try {
            const response = await axios.get(`${this.openTripMapUrl}/radius`, {
                params: {
                    radius: radius,
                    lon: lng,
                    lat: lat,
                    kinds: 'interesting_places,tourist_facilities,museums,theatres_and_entertainments,architecture,historic,natural,sport,amusements,shops',
                    format: 'json',
                    limit: 10,
                    apikey: this.openTripMapApiKey
                },
                timeout: 10000
            });

            return response.data.features || [];
        } catch (error) {
            console.warn('OpenTripMap nearby places error:', error.message);
            return [];
        }
    }

    async getWikipediaImage(placeName, location) {
        try {
            // Search for Wikipedia page
            const searchResponse = await axios.get(`${this.wikipediaUrl}/page/summary/${encodeURIComponent(placeName)}`, {
                timeout: 5000
            });

            if (searchResponse.data && searchResponse.data.thumbnail) {
                return searchResponse.data.thumbnail.source;
            }

            // Try with location included
            const locationSearchResponse = await axios.get(`${this.wikipediaUrl}/page/summary/${encodeURIComponent(placeName + ' ' + location)}`, {
                timeout: 5000
            });

            if (locationSearchResponse.data && locationSearchResponse.data.thumbnail) {
                return locationSearchResponse.data.thumbnail.source;
            }

            return null;
        } catch (error) {
            console.warn('Wikipedia image search error:', error.message);
            return null;
        }
    }

    async geocode(address) {
        try {
            await this.rateLimit();
            
            const response = await axios.get(`${this.nominatimUrl}/search`, {
                params: {
                    q: address,
                    format: 'json',
                    limit: 1,
                    addressdetails: 1
                },
                headers: {
                    'User-Agent': 'MoodYatra/1.0 (contact@moodyatra.com)'
                },
                timeout: 10000
            });

            if (response.data && response.data.length > 0) {
                const result = response.data[0];
                return {
                    lat: parseFloat(result.lat),
                    lng: parseFloat(result.lon),
                    formatted_address: result.display_name
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
            await this.rateLimit();
            
            const response = await axios.get(`${this.nominatimUrl}/reverse`, {
                params: {
                    lat: lat,
                    lon: lng,
                    format: 'json',
                    addressdetails: 1
                },
                headers: {
                    'User-Agent': 'MoodYatra/1.0 (contact@moodyatra.com)'
                },
                timeout: 10000
            });

            if (response.data) {
                return {
                    formatted_address: response.data.display_name
                };
            } else {
                throw new Error('No results found');
            }
        } catch (error) {
            console.error('Reverse geocoding error:', error);
            return { formatted_address: `${lat.toFixed(4)}, ${lng.toFixed(4)}` };
        }
    }

    async placeAutocomplete(input, sessionToken = null) {
        try {
            await this.rateLimit();
            
            const response = await axios.get(`${this.nominatimUrl}/search`, {
                params: {
                    q: input,
                    format: 'json',
                    limit: 5,
                    addressdetails: 1,
                    extratags: 1
                },
                headers: {
                    'User-Agent': 'MoodYatra/1.0 (contact@moodyatra.com)'
                },
                timeout: 10000
            });

            if (response.data) {
                const predictions = response.data.map(place => ({
                    place_id: `osm_${place.osm_type}_${place.osm_id}`,
                    description: place.display_name,
                    structured_formatting: {
                        main_text: place.name || place.display_name.split(',')[0],
                        secondary_text: place.display_name.split(',').slice(1).join(',').trim()
                    },
                    types: this.getPlaceTypes(place),
                    terms: place.display_name.split(',').map(term => ({ value: term.trim() }))
                }));

                return {
                    predictions: predictions,
                    status: 'OK'
                };
            } else {
                return { predictions: [], status: 'ZERO_RESULTS' };
            }
        } catch (error) {
            console.error('Place autocomplete error:', error);
            return this.getMockAutocompleteSuggestions(input);
        }
    }

    getPlaceTypes(place) {
        const types = [];
        
        if (place.type) {
            types.push(place.type);
        }
        
        if (place.class) {
            types.push(place.class);
        }
        
        // Map OSM types to Google-like types
        const typeMapping = {
            'city': 'locality',
            'town': 'locality',
            'village': 'locality',
            'country': 'country',
            'state': 'administrative_area_level_1',
            'county': 'administrative_area_level_2'
        };
        
        types.forEach(type => {
            if (typeMapping[type]) {
                types.push(typeMapping[type]);
            }
        });
        
        return types.length > 0 ? types : ['establishment'];
    }

    async calculateRoute(origin, destination, waypoints = []) {
        try {
            // Format coordinates for OSRM
            const coordinates = [origin];
            waypoints.forEach(wp => coordinates.push(wp));
            coordinates.push(destination);
            
            const coordString = coordinates.map(coord => `${coord.lng},${coord.lat}`).join(';');
            
            const response = await axios.get(`${this.osrmUrl}/${coordString}`, {
                params: {
                    overview: 'full',
                    geometries: 'geojson',
                    steps: true
                },
                timeout: 15000
            });

            if (response.data.routes && response.data.routes.length > 0) {
                const route = response.data.routes[0];
                return {
                    distance: route.distance, // in meters
                    duration: route.duration, // in seconds
                    geometry: route.geometry,
                    steps: route.legs.flatMap(leg => leg.steps || [])
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
            address: place.address || `${place.name} Street, ${tripData.location}`
        }));

        return {
            ...tripData,
            itinerary: enhancedItinerary
        };
    }

    addMockDataToPlace(place) {
        return {
            ...place,
            lat: place.lat || (Math.random() * 180 - 90),
            lng: place.lng || (Math.random() * 360 - 180),
            rating: place.rating || (Math.random() * 2 + 3).toFixed(1),
            reviews: place.reviews || Math.floor(Math.random() * 500) + 50,
            image: place.image || `https://picsum.photos/300/200?random=${Math.floor(Math.random() * 1000)}`,
            address: place.address || `${place.name} Street`
        };
    }

    getMockCoordinates(location) {
        // Simple mock coordinates for common cities
        const mockCoords = {
            'New York': { lat: 40.7128, lng: -74.0060 },
            'London': { lat: 51.5074, lng: -0.1278 },
            'Paris': { lat: 48.8566, lng: 2.3522 },
            'Tokyo': { lat: 35.6762, lng: 139.6503 },
            'Mumbai': { lat: 19.0760, lng: 72.8777 },
            'Delhi': { lat: 28.7041, lng: 77.1025 },
            'Bangalore': { lat: 12.9716, lng: 77.5946 }
        };

        const cityName = Object.keys(mockCoords).find(city => 
            location.toLowerCase().includes(city.toLowerCase())
        );

        return cityName ? mockCoords[cityName] : { lat: 40.7128, lng: -74.0060 };
    }

    getMockAutocompleteSuggestions(input) {
        const mockSuggestions = [
            `${input} City Center`,
            `${input} Downtown`,
            `${input} Old Town`,
            `${input} Business District`,
            `${input} Historic District`
        ];

        return {
            predictions: mockSuggestions.map((suggestion, index) => ({
                place_id: `mock_${index}_${Date.now()}`,
                description: suggestion,
                structured_formatting: {
                    main_text: suggestion.split(',')[0],
                    secondary_text: suggestion.split(',').slice(1).join(',').trim() || 'City'
                },
                types: ['locality', 'political'],
                terms: suggestion.split(' ').map(term => ({ value: term }))
            })),
            status: 'OK'
        };
    }

    getMockRoute() {
        return {
            distance: Math.floor(Math.random() * 50000) + 5000, // 5-55 km
            duration: Math.floor(Math.random() * 3600) + 600, // 10-70 minutes
            geometry: {
                type: 'LineString',
                coordinates: [
                    [-74.0060, 40.7128],
                    [-74.0050, 40.7138],
                    [-74.0040, 40.7148]
                ]
            },
            steps: []
        };
    }
}

module.exports = OpenMapsService;