// Gemini AI Service for Trip Generation
const { GoogleGenerativeAI } = require('@google/generative-ai');

class GeminiService {
    constructor() {
        this.apiKey = process.env.GEMINI_API_KEY;
        this.genAI = null;
        this.model = null;
        this.init();
    }

    init() {
        if (this.apiKey) {
            this.genAI = new GoogleGenerativeAI(this.apiKey);
            this.model = this.genAI.getGenerativeModel({ model: 'gemini-pro' });
            console.log('🤖 Gemini AI service initialized');
        } else {
            console.warn('⚠️  Gemini API key not found. Using mock responses.');
        }
    }

    async generateTrip(tripData) {
        try {
            if (!this.model) {
                console.log('Using mock trip generation');
                return this.getMockResponse(tripData);
            }

            const prompt = this.buildPrompt(tripData);
            const result = await this.model.generateContent(prompt);
            const response = await result.response;
            const text = response.text();

            return this.parseResponse(text, tripData);
        } catch (error) {
            console.error('Gemini API error:', error);
            // Fallback to mock response
            return this.getMockResponse(tripData);
        }
    }

    buildPrompt(tripData) {
        const { mood, location, duration, budget, preferences } = tripData;
        const budgetLabels = ['free activities', 'budget-friendly (₹)', 'moderate (₹₹)', 'premium (₹₹₹)', 'luxury (₹₹₹₹)'];
        const budgetText = budgetLabels[budget] || 'moderate';

        let preferencesText = '';
        if (preferences.foodie) preferencesText += ' Focus on food experiences and local cuisine.';
        if (preferences.cultural) preferencesText += ' Include cultural attractions, museums, and historical sites.';
        if (preferences.shopping) preferencesText += ' Include shopping opportunities and local markets.';

        const moodDescriptions = {
            fun: 'exciting, adventurous, and energetic activities with entertainment and thrills',
            chill: 'relaxing, peaceful, and laid-back experiences with calm environments',
            nature: 'outdoor activities, parks, gardens, hiking trails, and natural attractions',
            romantic: 'intimate, romantic, and special couple-friendly spots with ambiance'
        };

        return `You are a professional travel planner creating a detailed ${duration}-hour day trip itinerary for ${location}. 

TRIP REQUIREMENTS:
- Mood: ${mood} (${moodDescriptions[mood]})
- Duration: ${duration} hours
- Budget: ${budgetText}
- Location: ${location}
- Additional preferences: ${preferencesText || 'None specified'}

Please create a realistic, well-timed itinerary with actual places in ${location}. Respond with ONLY a valid JSON object in this exact format:

{
    "title": "Engaging trip title that captures the ${mood} mood",
    "description": "2-3 sentence description of what makes this trip special",
    "itinerary": [
        {
            "name": "Actual place name in ${location}",
            "type": "Category (Restaurant, Park, Museum, Gallery, Market, etc.)",
            "time": "Start time (e.g., 10:00 AM)",
            "duration": "Time to spend (e.g., 2 hours)",
            "description": "What to do there and why it fits the ${mood} mood (2-3 sentences)",
            "cost": "Price range (Free, ₹5-15, ₹15-30, etc.) or 'Free'",
            "address": "Full street address if known, or general area",
            "tips": "Helpful insider tip or practical advice"
        }
    ],
    "totalDistance": "Estimated walking/driving distance in km",
    "estimatedCost": "Total cost range for the day",
    "bestTimeToStart": "Recommended start time",
    "transportationTips": "How to get around efficiently",
    "weatherConsiderations": "Weather-related advice",
    "additionalTips": "Extra helpful advice for the trip"
}

IMPORTANT GUIDELINES:
1. Include 4-6 specific, real places in ${location}
2. Create logical timing with travel time between locations
3. Match the ${mood} mood throughout all activities
4. Stay within the ${budgetText} budget range
5. Include at least one meal/food recommendation
6. Ensure activities are appropriate for the time of day
7. Provide practical, actionable advice
8. Use real place names and addresses when possible
9. Make sure the total duration matches ${duration} hours
10. Consider opening hours and typical visit durations

Return ONLY the JSON object, no additional text or formatting.`;
    }

    parseResponse(response, tripData) {
        try {
            // Clean up the response to extract JSON
            let jsonStr = response.trim();
            
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

            // Add IDs and enhance data
            parsed.id = this.generateTripId();
            parsed.createdAt = new Date().toISOString();
            parsed.mood = tripData.mood;
            parsed.location = tripData.location;
            parsed.duration = tripData.duration;
            parsed.budget = tripData.budget;
            parsed.preferences = tripData.preferences;

            // Add coordinates and enhance places (mock for now)
            parsed.itinerary = parsed.itinerary.map((item, index) => ({
                ...item,
                id: `place_${index}`,
                lat: this.getMockCoordinates(tripData.location).lat + (Math.random() - 0.5) * 0.02,
                lng: this.getMockCoordinates(tripData.location).lng + (Math.random() - 0.5) * 0.02,
                rating: (Math.random() * 2 + 3).toFixed(1),
                reviews: Math.floor(Math.random() * 500) + 50,
                image: `https://picsum.photos/300/200?random=${Math.floor(Math.random() * 1000)}`
            }));

            return parsed;
        } catch (error) {
            console.error('Error parsing Gemini response:', error);
            console.log('Raw response:', response);
            throw new Error('Failed to parse AI response');
        }
    }

    getMockResponse(tripData) {
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
                    description: 'Start your day with thrilling rides and exciting activities that will get your adrenaline pumping. Perfect for adventure seekers looking for high-energy fun.',
                    cost: '₹25-35',
                    address: '123 Adventure Blvd',
                    tips: 'Arrive early to avoid crowds and get the best ride times'
                },
                {
                    name: 'Local Food Market',
                    type: 'Food & Dining',
                    time: '1:00 PM',
                    duration: '1.5 hours',
                    description: 'Explore a vibrant market filled with diverse food vendors and local specialties. Great for trying new flavors and experiencing local culture.',
                    cost: '₹15-25',
                    address: '456 Market Street',
                    tips: 'Try the local street food specialties and bring cash for smaller vendors'
                },
                {
                    name: 'Interactive Museum',
                    type: 'Museum',
                    time: '3:30 PM',
                    duration: '2 hours',
                    description: 'Engage with hands-on exhibits and interactive displays that make learning fun and exciting. Perfect for curious minds and group activities.',
                    cost: '₹12-18',
                    address: '789 Museum Ave',
                    tips: 'Check for special exhibitions and interactive workshops'
                },
                {
                    name: 'Rooftop Bar',
                    type: 'Nightlife',
                    time: '6:00 PM',
                    duration: '2 hours',
                    description: 'End your adventure with amazing city views, craft cocktails, and a lively atmosphere. Perfect for celebrating an exciting day.',
                    cost: '₹30-50',
                    address: '321 Sky Tower',
                    tips: 'Make a reservation for the best sunset views'
                }
            ],
            chill: [
                {
                    name: 'Botanical Garden',
                    type: 'Park',
                    time: '10:00 AM',
                    duration: '2 hours',
                    description: 'Wander through peaceful gardens filled with beautiful flowers and quiet walking paths. Perfect for meditation and connecting with nature.',
                    cost: '₹8-12',
                    address: '100 Garden Lane',
                    tips: 'Visit the rose garden and bring a book to read by the pond'
                },
                {
                    name: 'Cozy Bookstore Cafe',
                    type: 'Cafe',
                    time: '12:30 PM',
                    duration: '1.5 hours',
                    description: 'Relax in a quiet cafe surrounded by books, with excellent coffee and comfortable seating. Ideal for unwinding and people-watching.',
                    cost: '₹10-15',
                    address: '234 Literary St',
                    tips: 'Try their signature latte and browse the local authors section'
                },
                {
                    name: 'Art Gallery',
                    type: 'Cultural',
                    time: '2:30 PM',
                    duration: '1.5 hours',
                    description: 'Explore serene gallery spaces featuring local and contemporary art in a peaceful, contemplative environment.',
                    cost: '₹5-10',
                    address: '567 Arts District',
                    tips: 'Free admission on first Fridays, and they often have artist talks'
                },
                {
                    name: 'Spa & Wellness Center',
                    type: 'Wellness',
                    time: '4:30 PM',
                    duration: '2 hours',
                    description: 'Indulge in relaxing treatments and peaceful atmosphere for the ultimate unwinding experience. Perfect end to a chill day.',
                    cost: '₹40-80',
                    address: '890 Wellness Way',
                    tips: 'Book treatments in advance and arrive 15 minutes early'
                }
            ],
            nature: [
                {
                    name: 'Nature Trail',
                    type: 'Hiking',
                    time: '9:00 AM',
                    duration: '3 hours',
                    description: 'Explore scenic hiking trails with beautiful views and wildlife spotting opportunities. Perfect for connecting with the outdoors.',
                    cost: 'Free',
                    address: 'Trailhead at Pine Ridge Park',
                    tips: 'Bring water, comfortable shoes, and a camera for wildlife'
                },
                {
                    name: 'Lakeside Picnic Area',
                    type: 'Park',
                    time: '12:30 PM',
                    duration: '1.5 hours',
                    description: 'Enjoy lunch with stunning lake views and fresh air. Perfect spot for relaxation and taking in natural beauty.',
                    cost: '₹5 parking',
                    address: 'Crystal Lake Park',
                    tips: 'Pack a picnic or grab food from the nearby deli'
                },
                {
                    name: 'Wildlife Sanctuary',
                    type: 'Nature Center',
                    time: '2:30 PM',
                    duration: '2 hours',
                    description: 'Learn about local wildlife and conservation efforts while observing native animals in their natural habitats.',
                    cost: '₹8-15',
                    address: '456 Conservation Dr',
                    tips: 'Check feeding times for the best wildlife viewing opportunities'
                },
                {
                    name: 'Sunset Viewpoint',
                    type: 'Scenic Spot',
                    time: '5:30 PM',
                    duration: '1 hour',
                    description: 'Watch a breathtaking sunset over the landscape from this popular viewpoint. Perfect ending to a nature-filled day.',
                    cost: 'Free',
                    address: 'Eagle Point Overlook',
                    tips: 'Arrive 30 minutes before sunset for the best photos'
                }
            ],
            romantic: [
                {
                    name: 'Historic Garden',
                    type: 'Garden',
                    time: '10:00 AM',
                    duration: '1.5 hours',
                    description: 'Stroll through romantic gardens with beautiful flowers, fountains, and intimate pathways perfect for couples.',
                    cost: '₹10-15',
                    address: '123 Romance Lane',
                    tips: 'Perfect for photos together, especially near the fountain'
                },
                {
                    name: 'Wine Tasting Room',
                    type: 'Wine Bar',
                    time: '12:00 PM',
                    duration: '2 hours',
                    description: 'Enjoy an intimate wine tasting experience with local vintages and cheese pairings in a cozy, romantic setting.',
                    cost: '₹25-40',
                    address: '789 Vineyard St',
                    tips: 'Ask about private tastings and wine pairing recommendations'
                },
                {
                    name: 'Couples Spa',
                    type: 'Spa',
                    time: '3:00 PM',
                    duration: '2 hours',
                    description: 'Relax together with couples massage and spa treatments in a romantic, peaceful environment designed for two.',
                    cost: '₹80-150',
                    address: '456 Serenity Ave',
                    tips: 'Book the couples suite and arrive early to enjoy the amenities'
                },
                {
                    name: 'Fine Dining Restaurant',
                    type: 'Restaurant',
                    time: '6:30 PM',
                    duration: '2 hours',
                    description: 'End your romantic day with exceptional cuisine in an elegant restaurant with intimate ambiance and attentive service.',
                    cost: '₹60-100',
                    address: '321 Gourmet Blvd',
                    tips: 'Request a table by the window and mention if it\'s a special occasion'
                }
            ]
        };

        const activities = moodActivities[mood] || moodActivities.fun;
        const baseCoords = this.getMockCoordinates(location);

        // Add mock coordinates and IDs
        const itinerary = activities.map((activity, index) => ({
            ...activity,
            id: `place_${index}`,
            lat: baseCoords.lat + (Math.random() - 0.5) * 0.05,
            lng: baseCoords.lng + (Math.random() - 0.5) * 0.05,
            rating: (Math.random() * 2 + 3).toFixed(1),
            reviews: Math.floor(Math.random() * 500) + 50,
            image: `https://picsum.photos/300/200?random=${Math.floor(Math.random() * 1000)}`
        }));

        return {
            id: this.generateTripId(),
            title: `${moodTitles[mood]} in ${location}`,
            description: `A perfect ${mood} day planned just for you in ${location}. Discover amazing places and create unforgettable memories with this carefully curated itinerary.`,
            itinerary: itinerary,
            totalDistance: `${(Math.random() * 10 + 5).toFixed(1)} km`,
            estimatedCost: this.getEstimatedCost(budget),
            bestTimeToStart: '9:00 AM',
            transportationTips: 'Walking and public transport recommended for most locations. Consider ride-sharing for longer distances between stops.',
            weatherConsiderations: 'Check weather forecast and dress appropriately. Some outdoor activities may be weather-dependent, so have indoor alternatives ready.',
            additionalTips: 'Book reservations in advance for restaurants and spa treatments. Bring a camera to capture memories, and don\'t forget to stay hydrated throughout the day!',
            createdAt: new Date().toISOString(),
            mood: tripData.mood,
            location: tripData.location,
            duration: tripData.duration,
            budget: tripData.budget,
            preferences: tripData.preferences
        };
    }

    getMockCoordinates(location) {
        // Mock coordinates for common cities
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
            'Portland': { lat: 45.5152, lng: -122.6784 },
            'Las Vegas': { lat: 36.1699, lng: -115.1398 },
            'Orlando': { lat: 28.5383, lng: -81.3792 },
            'Nashville': { lat: 36.1627, lng: -86.7816 },
            'Phoenix': { lat: 33.4484, lng: -112.0740 },
            'San Diego': { lat: 32.7157, lng: -117.1611 }
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

    generateTripId() {
        return Math.random().toString(36).substr(2, 9);
    }

    // Health check method
    async healthCheck() {
        try {
            if (!this.model) {
                return { status: 'mock', message: 'Using mock responses' };
            }

            // Simple test generation
            const testResult = await this.model.generateContent('Say "Hello" in JSON format: {"message": "Hello"}');
            const response = await testResult.response;
            const text = response.text();
            
            return { 
                status: 'healthy', 
                message: 'Gemini API is working',
                test: text.substring(0, 100)
            };
        } catch (error) {
            return { 
                status: 'error', 
                message: error.message 
            };
        }
    }
}

module.exports = GeminiService;