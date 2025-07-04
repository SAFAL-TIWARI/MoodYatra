// Gemini AI Integration
class GeminiAI {
    constructor() {
        this.apiKey = null; // Will be set from environment or config
        this.baseUrl = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-pro:generateContent';
        this.init();
    }

    init() {
        // Set the actual Gemini API key
        this.apiKey = 'process.env.GEMINI_API_KEY';
    }

    async generateTrip(tripData) {
        try {
            const prompt = this.buildPrompt(tripData);
            const response = await this.callGeminiAPI(prompt);
            return this.parseResponse(response);
        } catch (error) {
            console.error('Gemini API error:', error);
            // Return mock data as fallback
            return await this.getMockResponse(tripData);
        }
    }

    buildPrompt(tripData) {
        const { mood, location, duration, budget, preferences, customPrompt } = tripData;
        const budgetLabels = ['free activities', 'budget-friendly (₹)', 'moderate (₹₹)', 'premium (₹₹₹)', 'luxury (₹₹₹₹)'];
        const budgetText = budgetLabels[budget] || 'moderate';

        let preferencesText = '';
        if (preferences.foodie) preferencesText += ' Focus on food experiences and local cuisine.';
        if (preferences.cultural) preferencesText += ' Include cultural attractions, museums, and historical sites.';
        if (preferences.shopping) preferencesText += ' Include shopping opportunities and local markets.';

        // Add custom prompt if provided
        let customInstructions = '';
        if (customPrompt && customPrompt.trim()) {
            customInstructions = `\n\nAdditional user requirements: ${customPrompt.trim()}`;
        }

        const moodDescriptions = {
            fun: 'exciting, adventurous, and energetic activities',
            chill: 'relaxing, peaceful, and laid-back experiences',
            nature: 'outdoor activities, parks, gardens, and natural attractions',
            romantic: 'intimate, romantic, and special couple-friendly spots'
        };

        return `Create a detailed ${duration}-hour day trip itinerary for ${location} with a ${mood} mood focusing on ${moodDescriptions[mood]}. 
                Budget level: ${budgetText}.${preferencesText}${customInstructions}
                
                Please provide a JSON response with this exact structure:
                {
                    "title": "Catchy trip title",
                    "description": "Brief engaging description (2-3 sentences)",
                    "itinerary": [
                        {
                            "name": "Place/Activity name",
                            "type": "Category (Restaurant, Park, Museum, etc.)",
                            "time": "Suggested time (e.g., 10:00 AM)",
                            "duration": "Time to spend (e.g., 2 hours)",
                            "description": "What to do there and why it's great",
                            "cost": "Price range or 'Free'",
                            "address": "Full address if known",
                            "tips": "Helpful tips or insider info"
                        }
                    ],
                    "totalDistance": "Estimated total distance in km",
                    "estimatedCost": "Total estimated cost range",
                    "bestTimeToStart": "Recommended start time",
                    "transportationTips": "How to get around",
                    "weatherConsiderations": "What to consider about weather",
                    "additionalTips": "Extra helpful advice"
                }

                Make sure to:
                1. Include 4-6 specific, real places in ${location}
                2. Create a logical flow and timing
                3. Match the ${mood} mood throughout
                4. Stay within the ${budgetText} budget range
                5. Consider travel time between locations
                6. Include at least one meal recommendation
                7. Provide practical, actionable advice
                8. Follow any specific user requirements mentioned above`;
    }

    async callGeminiAPI(prompt) {
        if (!this.apiKey || this.apiKey === 'YOUR_GEMINI_API_KEY') {
            throw new Error('Gemini API key not configured');
        }

        const requestBody = {
            contents: [{
                parts: [{
                    text: prompt
                }]
            }],
            generationConfig: {
                temperature: 0.7,
                topK: 40,
                topP: 0.95,
                maxOutputTokens: 2048,
            }
        };

        const response = await fetch(`${this.baseUrl}?key=${this.apiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify(requestBody)
        });

        if (!response.ok) {
            throw new Error(`Gemini API error: ${response.status}`);
        }

        const data = await response.json();
        return data.candidates[0].content.parts[0].text;
    }

    parseResponse(response) {
        try {
            // Clean up the response to extract JSON
            let jsonStr = response;
            
            // Remove markdown code blocks if present
            jsonStr = jsonStr.replace(/```json\n?/g, '').replace(/```\n?/g, '');
            
            // Find JSON object in the response
            const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
            if (jsonMatch) {
                jsonStr = jsonMatch[0];
            }

            const parsed = JSON.parse(jsonStr);
            
            // Validate required fields
            if (!parsed.title || !parsed.itinerary || !Array.isArray(parsed.itinerary)) {
                throw new Error('Invalid response structure');
            }

            // Add coordinates for mapping (would normally come from Google Places API)
            parsed.itinerary = parsed.itinerary.map((item, index) => ({
                ...item,
                lat: 40.7128 + (Math.random() - 0.5) * 0.1, // Mock coordinates around NYC
                lng: -74.0060 + (Math.random() - 0.5) * 0.1,
                id: `place_${index}`,
                image: `https://picsum.photos/300/200?random=${Math.floor(Math.random() * 1000)}`,
                rating: (Math.random() * 2 + 3).toFixed(1),
                reviews: Math.floor(Math.random() * 500) + 50
            }));

            return parsed;
        } catch (error) {
            console.error('Error parsing Gemini response:', error);
            throw new Error('Failed to parse AI response');
        }
    }

    async getMockResponse(tripData) {
        const { mood, location, duration, budget } = tripData;
        
        const moodTitles = {
            fun: 'Epic Adventure Day',
            chill: 'Peaceful Relaxation Day', 
            nature: 'Nature Explorer Day',
            romantic: 'Romantic Escape Day'
        };

        const moodActivities = {
            fun: [
                {
                    name: 'Adventure Park',
                    type: 'Entertainment',
                    time: '10:00 AM',
                    duration: '2.5 hours',
                    description: 'Thrilling rides and exciting activities to get your adrenaline pumping',
                    cost: '₹25-35',
                    tips: 'Arrive early to avoid crowds'
                },
                {
                    name: 'Local Food Market',
                    type: 'Food & Dining',
                    time: '1:00 PM',
                    duration: '1.5 hours',
                    description: 'Vibrant market with diverse food vendors and local specialties',
                    cost: '₹15-25',
                    tips: 'Try the local street food specialties'
                },
                {
                    name: 'Interactive Museum',
                    type: 'Museum',
                    time: '3:30 PM',
                    duration: '2 hours',
                    description: 'Hands-on exhibits and engaging displays perfect for exploration',
                    cost: '₹12-18',
                    tips: 'Check for special exhibitions'
                },
                {
                    name: 'Rooftop Bar',
                    type: 'Nightlife',
                    time: '6:00 PM',
                    duration: '2 hours',
                    description: 'Amazing city views with craft cocktails and lively atmosphere',
                    cost: '₹30-50',
                    tips: 'Make a reservation for sunset views'
                }
            ],
            chill: [
                {
                    name: 'Botanical Garden',
                    type: 'Park',
                    time: '10:00 AM',
                    duration: '2 hours',
                    description: 'Peaceful gardens with beautiful flowers and quiet walking paths',
                    cost: '₹8-12',
                    tips: 'Perfect for morning meditation'
                },
                {
                    name: 'Cozy Bookstore Cafe',
                    type: 'Cafe',
                    time: '12:30 PM',
                    duration: '1.5 hours',
                    description: 'Quiet cafe with great coffee, books, and comfortable seating',
                    cost: '₹10-15',
                    tips: 'Try their signature latte'
                },
                {
                    name: 'Art Gallery',
                    type: 'Cultural',
                    time: '2:30 PM',
                    duration: '1.5 hours',
                    description: 'Serene gallery space featuring local and contemporary art',
                    cost: '₹5-10',
                    tips: 'Free admission on first Fridays'
                },
                {
                    name: 'Spa & Wellness Center',
                    type: 'Wellness',
                    time: '4:30 PM',
                    duration: '2 hours',
                    description: 'Relaxing treatments and peaceful atmosphere for ultimate unwinding',
                    cost: '₹40-80',
                    tips: 'Book treatments in advance'
                }
            ],
            nature: [
                {
                    name: 'Nature Trail',
                    type: 'Hiking',
                    time: '9:00 AM',
                    duration: '3 hours',
                    description: 'Scenic hiking trail with beautiful views and wildlife spotting opportunities',
                    cost: 'Free',
                    tips: 'Bring water and comfortable shoes'
                },
                {
                    name: 'Lakeside Picnic Area',
                    type: 'Park',
                    time: '12:30 PM',
                    duration: '1.5 hours',
                    description: 'Perfect spot for lunch with stunning lake views and fresh air',
                    cost: '₹5 parking',
                    tips: 'Pack a picnic or grab food nearby'
                },
                {
                    name: 'Wildlife Sanctuary',
                    type: 'Nature Center',
                    time: '2:30 PM',
                    duration: '2 hours',
                    description: 'Educational center with native wildlife and conservation exhibits',
                    cost: '₹8-15',
                    tips: 'Check feeding times for best wildlife viewing'
                },
                {
                    name: 'Sunset Viewpoint',
                    type: 'Scenic Spot',
                    time: '5:30 PM',
                    duration: '1 hour',
                    description: 'Breathtaking sunset views over the landscape',
                    cost: 'Free',
                    tips: 'Arrive 30 minutes before sunset'
                }
            ],
            romantic: [
                {
                    name: 'Historic Garden',
                    type: 'Garden',
                    time: '10:00 AM',
                    duration: '1.5 hours',
                    description: 'Romantic garden with beautiful flowers, fountains, and intimate pathways',
                    cost: '₹10-15',
                    tips: 'Perfect for photos together'
                },
                {
                    name: 'Wine Tasting Room',
                    type: 'Wine Bar',
                    time: '12:00 PM',
                    duration: '2 hours',
                    description: 'Intimate wine tasting experience with local vintages and cheese pairings',
                    cost: '₹25-40',
                    tips: 'Ask about private tastings'
                },
                {
                    name: 'Couples Spa',
                    type: 'Spa',
                    time: '3:00 PM',
                    duration: '2 hours',
                    description: 'Relaxing couples massage and spa treatments in a romantic setting',
                    cost: '₹80-150',
                    tips: 'Book the couples suite'
                },
                {
                    name: 'Fine Dining Restaurant',
                    type: 'Restaurant',
                    time: '6:30 PM',
                    duration: '2 hours',
                    description: 'Elegant restaurant with intimate ambiance and exceptional cuisine',
                    cost: '₹60-100',
                    tips: 'Request a table by the window'
                }
            ]
        };

        const activities = moodActivities[mood] || moodActivities.fun;

        // Add coordinates using geocoding
        const baseCoords = await this.getLocationCoordinates(location);
        const itinerary = activities.map((activity, index) => ({
            ...activity,
            lat: baseCoords.lat + (Math.random() - 0.5) * 0.05,
            lng: baseCoords.lng + (Math.random() - 0.5) * 0.05,
            id: `place_${index}`,
            address: `${Math.floor(Math.random() * 999) + 1} Main St, ${location}`,
            image: `https://picsum.photos/400/300?random=${Math.floor(Math.random() * 1000)}`,
            rating: (Math.random() * 2 + 3).toFixed(1),
            reviews: Math.floor(Math.random() * 500) + 50
        }));

        return {
            title: `${moodTitles[mood]} in ${location}`,
            description: `A perfect ${mood} day planned just for you in ${location}. Discover amazing places and create unforgettable memories.`,
            itinerary: itinerary,
            totalDistance: `${(Math.random() * 10 + 5).toFixed(1)} km`,
            estimatedCost: this.getEstimatedCost(budget),
            bestTimeToStart: '9:00 AM',
            transportationTips: 'Walking and public transport recommended. Consider ride-sharing for longer distances.',
            weatherConsiderations: 'Check weather forecast and dress appropriately. Some activities may be weather-dependent.',
            additionalTips: 'Book reservations in advance for restaurants and spa treatments. Bring a camera to capture memories!'
        };
    }

    async getLocationCoordinates(location) {
        try {
            // Use backend geocoding service (Nominatim)
            const response = await fetch('/api/geocode', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ address: location })
            });
            const data = await response.json();
            
            if (data.status === 'OK' && data.results.length > 0) {
                const result = data.results[0];
                return {
                    lat: result.geometry.location.lat,
                    lng: result.geometry.location.lng
                };
            }
        } catch (error) {
            console.warn('Geocoding failed, using fallback coordinates:', error);
        }

        // Fallback coordinates for common cities
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

        // Try to find coordinates for the location
        for (const [city, coords] of Object.entries(coordinates)) {
            if (location.toLowerCase().includes(city.toLowerCase())) {
                return coords;
            }
        }

        // Default to New York if location not found
        return coordinates['New York'];
    }

    getEstimatedCost(budget) {
        const costRanges = [
            'Free - ₹10',
            '₹10 - ₹30',
            '₹30 - ₹75',
            '₹75 - ₹150',
            '₹150+'
        ];
        return costRanges[budget] || '₹30 - ₹75';
    }
}

// Initialize Gemini AI
window.geminiAI = new GeminiAI();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GeminiAI;
}