// Node.js Backend Server for MoodYatra
const express = require('express');
const cors = require('cors');
const path = require('path');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const { body, validationResult } = require('express-validator');

// Import database and AI modules
const Database = require('./database');
const GeminiService = require('./services/gemini');
const OpenMapsService = require('./services/openmaps');

class MoodYatraServer {
    constructor() {
        this.app = express();
        this.port = process.env.PORT || 3000;
        this.db = new Database();
        this.geminiService = new GeminiService();
        this.mapsService = new OpenMapsService();
        
        this.init();
    }

    async init() {
        await this.setupMiddleware();
        await this.setupRoutes();
        await this.db.init();
        this.startServer();
    }

    async setupMiddleware() {
        // Security middleware
        this.app.use(helmet({
            contentSecurityPolicy: {
                directives: {
                    defaultSrc: ["'self'"],
                    styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdnjs.cloudflare.com"],
                    fontSrc: ["'self'", "https://fonts.gstatic.com", "https://cdnjs.cloudflare.com"],
                    scriptSrc: ["'self'", "'unsafe-inline'", "https://maps.googleapis.com", "https://cdnjs.cloudflare.com"],
                    imgSrc: ["'self'", "data:", "https:", "blob:"],
                    connectSrc: ["'self'", "https://generativelanguage.googleapis.com", "https://maps.googleapis.com"]
                }
            }
        }));

        // CORS
        this.app.use(cors({
            origin: process.env.NODE_ENV === 'production' 
                ? ['https://MoodYatra.ai', 'https://www.MoodYatra.ai']
                : ['http://localhost:3000', 'http://127.0.0.1:3000'],
            credentials: true
        }));

        // Rate limiting
        const limiter = rateLimit({
            windowMs: 15 * 60 * 1000, // 15 minutes
            max: 100, // limit each IP to 100 requests per windowMs
            message: 'Too many requests from this IP, please try again later.'
        });
        this.app.use('/api/', limiter);

        // Stricter rate limiting for AI generation
        const aiLimiter = rateLimit({
            windowMs: 60 * 60 * 1000, // 1 hour
            max: 10, // limit each IP to 10 AI generations per hour
            message: 'AI generation limit reached. Please try again later.'
        });
        this.app.use('/api/generate-trip', aiLimiter);

        // Body parsing
        this.app.use(express.json({ limit: '10mb' }));
        this.app.use(express.urlencoded({ extended: true }));

        // Static files
        this.app.use(express.static(path.join(__dirname, '../')));

        // Request logging
        this.app.use((req, res, next) => {
            console.log(`${new Date().toISOString()} - ${req.method} ${req.path}`);
            next();
        });
    }

    async setupRoutes() {
        // Health check
        this.app.get('/api/health', (req, res) => {
            res.json({ 
                status: 'healthy', 
                timestamp: new Date().toISOString(),
                version: '1.0.0'
            });
        });

        // Authentication routes
        this.setupAuthRoutes();

        // Trip routes
        this.setupTripRoutes();

        // AI generation routes
        this.setupAIRoutes();

        // Serve frontend
        this.app.get('/', (req, res) => {
            res.sendFile(path.join(__dirname, '../index.html'));
        });

        this.app.get('/app', (req, res) => {
            res.sendFile(path.join(__dirname, '../app.html'));
        });

        this.app.get('/view', (req, res) => {
            res.sendFile(path.join(__dirname, '../view.html'));
        });

        // 404 handler
        this.app.use((req, res) => {
            res.status(404).json({ error: 'Route not found' });
        });

        // Error handler
        this.app.use((err, req, res, next) => {
            console.error('Server error:', err);
            res.status(500).json({ 
                error: 'Internal server error',
                message: process.env.NODE_ENV === 'development' ? err.message : 'Something went wrong'
            });
        });
    }

    setupAuthRoutes() {
        // Sign up
        this.app.post('/api/auth/signup', [
            body('email').isEmail().normalizeEmail(),
            body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
        ], async (req, res) => {
            try {
                const errors = validationResult(req);
                if (!errors.isEmpty()) {
                    return res.status(400).json({ errors: errors.array() });
                }

                const { email, password } = req.body;

                // Check if user exists
                const existingUser = await this.db.getUserByEmail(email);
                if (existingUser) {
                    return res.status(400).json({ message: 'User already exists' });
                }

                // Hash password
                const hashedPassword = await bcrypt.hash(password, 12);

                // Create user
                const userId = await this.db.createUser({
                    email,
                    password: hashedPassword,
                    name: email.split('@')[0]
                });

                // Generate JWT
                const token = jwt.sign(
                    { userId, email },
                    process.env.JWT_SECRET || 'your-secret-key',
                    { expiresIn: '7d' }
                );

                res.status(201).json({
                    id: userId,
                    email,
                    name: email.split('@')[0],
                    token
                });
            } catch (error) {
                console.error('Signup error:', error);
                res.status(500).json({ message: 'Failed to create account' });
            }
        });

        // Sign in
        this.app.post('/api/auth/signin', [
            body('email').isEmail().normalizeEmail(),
            body('password').exists()
        ], async (req, res) => {
            try {
                const errors = validationResult(req);
                if (!errors.isEmpty()) {
                    return res.status(400).json({ errors: errors.array() });
                }

                const { email, password } = req.body;

                // Get user
                const user = await this.db.getUserByEmail(email);
                if (!user) {
                    return res.status(401).json({ message: 'Invalid credentials' });
                }

                // Check password
                const isValidPassword = await bcrypt.compare(password, user.password);
                if (!isValidPassword) {
                    return res.status(401).json({ message: 'Invalid credentials' });
                }

                // Generate JWT
                const token = jwt.sign(
                    { userId: user.id, email: user.email },
                    process.env.JWT_SECRET || 'your-secret-key',
                    { expiresIn: '7d' }
                );

                res.json({
                    id: user.id,
                    email: user.email,
                    name: user.name,
                    token
                });
            } catch (error) {
                console.error('Signin error:', error);
                res.status(500).json({ message: 'Failed to sign in' });
            }
        });
    }

    setupTripRoutes() {
        // Get trip by ID (public)
        this.app.get('/api/trips/:id', async (req, res) => {
            try {
                const { id } = req.params;
                const trip = await this.db.getTripById(id);
                
                if (!trip) {
                    return res.status(404).json({ message: 'Trip not found' });
                }

                res.json(trip);
            } catch (error) {
                console.error('Get trip error:', error);
                res.status(500).json({ message: 'Failed to get trip' });
            }
        });

        // Save trip
        this.app.post('/api/trips', async (req, res) => {
            try {
                const tripData = req.body;
                
                // Validate trip data
                if (!tripData.title || !tripData.itinerary) {
                    return res.status(400).json({ message: 'Invalid trip data' });
                }

                // Save trip
                const tripId = await this.db.saveTrip(tripData);
                
                res.status(201).json({ 
                    id: tripId,
                    message: 'Trip saved successfully' 
                });
            } catch (error) {
                console.error('Save trip error:', error);
                res.status(500).json({ message: 'Failed to save trip' });
            }
        });

        // Get user trips (protected)
        this.app.get('/api/user/trips', this.authenticateToken, async (req, res) => {
            try {
                const trips = await this.db.getUserTrips(req.user.userId);
                res.json(trips);
            } catch (error) {
                console.error('Get user trips error:', error);
                res.status(500).json({ message: 'Failed to get trips' });
            }
        });
    }

    setupAIRoutes() {
        // Generate trip with AI
        this.app.post('/api/generate-trip', [
            body('tripData').exists(),
            body('tripData.mood').isIn(['fun', 'chill', 'nature', 'romantic']),
            body('tripData.location').isLength({ min: 1 }),
            body('tripData.duration').isInt({ min: 1, max: 24 })
        ], async (req, res) => {
            try {
                const errors = validationResult(req);
                if (!errors.isEmpty()) {
                    return res.status(400).json({ errors: errors.array() });
                }

                const { tripData } = req.body;

                // Generate trip using Gemini AI
                const generatedTrip = await this.geminiService.generateTrip(tripData);

                // Enhance with open source maps data
                const enhancedTrip = await this.mapsService.enhanceTripData(generatedTrip, tripData.location);

                res.json(enhancedTrip);
            } catch (error) {
                console.error('AI generation error:', error);
                res.status(500).json({ 
                    message: 'Failed to generate trip',
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
        });

        // Get place details
        this.app.get('/api/places/:placeId', async (req, res) => {
            try {
                const { placeId } = req.params;
                const placeDetails = await this.mapsService.getPlaceDetails(placeId);
                res.json(placeDetails);
            } catch (error) {
                console.error('Place details error:', error);
                res.status(500).json({ message: 'Failed to get place details' });
            }
        });

        // Geocoding
        this.app.post('/api/geocode', [
            body('address').isLength({ min: 1 })
        ], async (req, res) => {
            try {
                const { address } = req.body;
                const coordinates = await this.mapsService.geocode(address);
                res.json(coordinates);
            } catch (error) {
                console.error('Geocoding error:', error);
                res.status(500).json({ message: 'Failed to geocode address' });
            }
        });

        // Place autocomplete
        this.app.post('/api/places/autocomplete', [
            body('input').isLength({ min: 1, max: 100 }).withMessage('Input must be between 1 and 100 characters'),
            body('sessionToken').optional().isString()
        ], async (req, res) => {
            try {
                const errors = validationResult(req);
                if (!errors.isEmpty()) {
                    return res.status(400).json({ errors: errors.array() });
                }

                const { input, sessionToken } = req.body;
                const suggestions = await this.mapsService.placeAutocomplete(input, sessionToken);
                res.json(suggestions);
            } catch (error) {
                console.error('Place autocomplete error:', error);
                res.status(500).json({ 
                    message: 'Failed to get place suggestions',
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
        });

        // Nearby places search
        this.app.post('/api/places/nearby', [
            body('lat').isFloat({ min: -90, max: 90 }).withMessage('Valid latitude required'),
            body('lng').isFloat({ min: -180, max: 180 }).withMessage('Valid longitude required'),
            body('type').optional().isString().withMessage('Type must be a string'),
            body('radius').optional().isInt({ min: 100, max: 50000 }).withMessage('Radius must be between 100 and 50000 meters')
        ], async (req, res) => {
            try {
                const errors = validationResult(req);
                if (!errors.isEmpty()) {
                    return res.status(400).json({ errors: errors.array() });
                }

                const { lat, lng, type, radius } = req.body;
                const nearbyPlaces = await this.mapsService.searchNearbyPlaces(
                    { lat, lng }, 
                    type || 'point_of_interest', 
                    radius || 1000
                );
                
                res.json(nearbyPlaces);
            } catch (error) {
                console.error('Nearby places search error:', error);
                res.status(500).json({ 
                    message: 'Failed to search nearby places',
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
        });

        // Place details
        this.app.post('/api/places/details', [
            body('placeId').isString().withMessage('Place ID required')
        ], async (req, res) => {
            try {
                const errors = validationResult(req);
                if (!errors.isEmpty()) {
                    return res.status(400).json({ errors: errors.array() });
                }

                const { placeId } = req.body;
                
                // For OSM place IDs, extract coordinates from the ID format
                if (placeId.startsWith('osm_')) {
                    const parts = placeId.split('_');
                    if (parts.length >= 3) {
                        // For now, return mock coordinates - in a real implementation,
                        // you'd query Nominatim with the OSM ID
                        res.json({
                            lat: 40.7128 + (Math.random() - 0.5) * 0.1,
                            lng: -74.0060 + (Math.random() - 0.5) * 0.1,
                            address: 'Address not available'
                        });
                        return;
                    }
                }
                
                res.json({
                    lat: 40.7128,
                    lng: -74.0060,
                    address: 'Address not available'
                });
            } catch (error) {
                console.error('Place details error:', error);
                res.status(500).json({ 
                    message: 'Failed to get place details',
                    error: process.env.NODE_ENV === 'development' ? error.message : undefined
                });
            }
        });
    }

    // Authentication middleware
    authenticateToken(req, res, next) {
        const authHeader = req.headers['authorization'];
        const token = authHeader && authHeader.split(' ')[1];

        if (!token) {
            return res.status(401).json({ message: 'Access token required' });
        }

        jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key', (err, user) => {
            if (err) {
                return res.status(403).json({ message: 'Invalid token' });
            }
            req.user = user;
            next();
        });
    }

    startServer() {
        this.app.listen(this.port, () => {
            console.log(`🚀 MoodYatra server running on port ${this.port}`);
            console.log(`📱 Frontend: http://localhost:${this.port}`);
            console.log(`🔧 API: http://localhost:${this.port}/api`);
            console.log(`💡 Environment: ${process.env.NODE_ENV || 'development'}`);
        });
    }
}

// Start server if this file is run directly
if (require.main === module) {
    new MoodYatraServer();
}

module.exports = MoodYatraServer;