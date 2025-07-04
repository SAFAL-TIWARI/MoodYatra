# 🧭 MoodYatra

**AI-powered micro-trip generator for spontaneous travelers**

*Building Tomorrow's Utility Tools – Before They Exist Today*

## 🌟 Overview

MoodYatra is a lightweight, AI-powered web application that generates personalized day trip itineraries based on your mood, location, time, and budget. Perfect for spontaneous travelers who want amazing local experiences without the planning hassle.

### ✨ Key Features

- **🤖 AI-Powered Planning**: Uses Gemini AI to create unique, personalized itineraries
- **🎭 Mood-Based Recommendations**: Choose from Fun, Chill, Nature, or Romantic vibes
- **🗺️ Interactive Maps**: Open-source Leaflet.js with OpenStreetMap tiles and routing
- **📱 Mobile-First Design**: Responsive, clean interface that works on all devices
- **📄 PDF Export**: Download your itinerary as a beautiful PDF
- **🔗 Easy Sharing**: Share trips via link or QR code - no login required to view
- **👤 Optional Authentication**: Save and sync trips across devices
- **⚡ Lightning Fast**: Lightweight vanilla JavaScript, no heavy frameworks

## 🚀 Quick Start

### Prerequisites

- Node.js 16+ and npm 8+
- Gemini AI API key (required for AI features)
- OpenTripMap API key (optional - enhances place data)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/SAFAL-TIWARI/MoodYatra.git
   cd MoodYatra
   ```

2. **Install dependencies**
   ```bash
   npm install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   # Edit .env with your API keys
   ```

4. **Start the development server**
   ```bash
   npm run dev
   ```

5. **Open your browser**
   ```
   http://localhost:3000
   or https://localhost:5500
   ```

## 🔧 Configuration

### Required API Keys

1. **Gemini AI API Key** (Required)
   - Go to [Google AI Studio](https://makersuite.google.com/app/apikey)
   - Create a new API key for Gemini AI
   - Add to your `.env` file

2. **OpenTripMap API Key** (Optional)
   - Get your key from [OpenTripMap](https://opentripmap.io/product)
   - Enhances place information with ratings and details
   - Add to `.env` (app works with mock data if not provided)

### Environment Variables

```env
# Required
GEMINI_API_KEY=your_gemini_api_key_here

# Open Source Map Services (Optional - uses mock data if not provided)
OPENTRIPMAP_API_KEY=your_opentripmap_api_key_here
NOMINATIM_API_URL=https://nominatim.openstreetmap.org
WIKIPEDIA_API_URL=https://en.wikipedia.org/api/rest_v1

# Optional
GEMINI_API_KEY=your_gemini_api_key_here

# Security
JWT_SECRET=your_super_secret_jwt_key_here

# Server
NODE_ENV=development
PORT=3000
```

## 🏗️ Architecture

### Frontend (Vanilla JavaScript)
- **HTML5**: Semantic, accessible markup
- **CSS3**: Modern styling with CSS Grid and Flexbox
- **Vanilla JS**: Lightweight, no framework dependencies
- **Progressive Enhancement**: Works without JavaScript for basic functionality

### Backend (Node.js)
- **Express.js**: Lightweight web framework
- **SQLite**: File-based database for simplicity
- **JWT Authentication**: Secure, stateless auth
- **Rate Limiting**: API protection and abuse prevention

### APIs & Services
- **Gemini AI**: Trip generation and recommendations
- **Leaflet.js**: Interactive maps with OpenStreetMap tiles
- **Nominatim**: Geocoding and place search (OpenStreetMap)
- **OpenTripMap**: Enhanced place information and ratings
- **Wikipedia API**: Place images and descriptions
- **OSRM**: Route calculation and directions

## 🌍 Open Source Mapping Benefits

### Why We Chose Open Source Over Google Maps

- **🆓 Cost-Effective**: No usage fees or billing setup required
- **🔒 Privacy-First**: No user tracking or data collection
- **🌍 Community-Driven**: Powered by OpenStreetMap's global community
- **🛡️ No Vendor Lock-in**: Full control over mapping infrastructure
- **📈 Scalable**: No request limits for basic features
- **🔧 Customizable**: Full control over map appearance and functionality

### Mapping Stack

| Component | Service | Purpose | Cost |
|-----------|---------|---------|------|
| **Interactive Maps** | Leaflet.js + OSM Tiles | Map display and interaction | Free |
| **Geocoding** | Nominatim | Address to coordinates | Free |
| **Place Search** | Nominatim + OpenTripMap | Location autocomplete | Free/Optional |
| **Place Images** | Wikipedia Media API | High-quality place photos | Free |
| **Routing** | OSRM | Directions and route optimization | Free |
| **Place Details** | OpenTripMap | Ratings, descriptions, POI data | Optional API |

## 📱 Usage

### Creating a Trip

1. **Choose Your Mood**
   - Fun: Adventure and excitement
   - Chill: Relaxation and peace
   - Nature: Outdoor activities
   - Romantic: Intimate experiences

2. **Set Your Details**
   - Starting location (or use GPS)
   - Time available (2-12+ hours)
   - Budget range (Free to Luxury)
   - Additional preferences

3. **Get Your Plan**
   - AI generates personalized itinerary
   - Interactive map with route
   - Real place data and photos

4. **Share & Export**
   - Download as PDF
   - Share via link or QR code
   - Save to account (optional)

### Sharing Trips

- **Public Links**: Anyone can view without login
- **QR Codes**: Easy mobile sharing
- **Social Media**: Direct sharing to Twitter, Facebook, WhatsApp
- **PDF Export**: Offline-ready itineraries

## 🛠️ Development

### Project Structure

```
MoodYatra/
├── index.html              # Homepage
├── app.html               # Trip generator
├── view.html              # Shared trip viewer
├── css/
│   └── styles.css         # Main stylesheet
├──assets/
|   └── images
├── js/
│   ├── app.js            # Main application logic
│   ├── auth.js           # Authentication system
│   ├── gemini.js         # AI integration
│   ├── leaflet-maps.js   # Leaflet maps integration
│   └── pdf.js            # PDF export functionality
├── backend/
│   ├── server.js         # Express server
│   ├── database.js       # SQLite database manager
│   └── services/
│       ├── gemini.js     # Gemini AI service
│       └── openmaps.js   # Open source maps service
└── package.json
```

### Available Scripts

```bash
# Development
npm run dev          # Start with nodemon
npm start           # Production start
npm test            # Run tests
npm run setup       # Initial setup
npm run seed-db     # Seed database with sample data
npm run backup-db   # Backup database
```

### API Endpoints

```
GET  /                     # Homepage
GET  /app                  # Trip generator
GET  /view                 # Trip viewer
GET  /api/health          # Health check
POST /api/auth/signup     # User registration
POST /api/auth/signin     # User login
POST /api/generate-trip   # AI trip generation
GET  /api/trips/:id       # Get trip by ID
POST /api/trips           # Save trip
GET  /api/user/trips      # Get user trips
```

## 🎨 Design Philosophy

### Mobile-First
- Responsive design that works on all screen sizes
- Touch-friendly interfaces
- Fast loading on mobile networks

### Accessibility
- Semantic HTML structure
- ARIA labels and roles
- Keyboard navigation support
- High contrast color schemes

### Performance
- Vanilla JavaScript for minimal bundle size
- Lazy loading of images and maps
- Efficient database queries
- CDN-ready static assets

### User Experience
- Zero-friction trip generation
- No login required for basic features
- Instant sharing capabilities
- Offline-ready PDF exports

## 🔒 Security

- **Rate Limiting**: Prevents API abuse
- **Input Validation**: Server-side validation for all inputs
- **SQL Injection Protection**: Parameterized queries
- **XSS Prevention**: Content Security Policy headers
- **HTTPS Enforcement**: Secure connections in production
- **JWT Security**: Secure token-based authentication

## 🚀 Deployment

### Production Setup

1. **Environment Configuration**
   ```bash
   NODE_ENV=production
   PORT=80
   # Add production API keys
   ```

2. **Database Setup**
   ```bash
   npm run setup
   ```

3. **Start Production Server**
   ```bash
   npm start
   ```

### Deployment Options

- **Heroku**: Easy deployment with Heroku CLI
- **Vercel**: Serverless deployment
- **DigitalOcean**: VPS deployment
- **AWS**: EC2 or Lambda deployment
- **Docker**: Containerized deployment

## 📊 Analytics & Monitoring

- **Built-in Analytics**: Track trip generation and sharing
- **Error Logging**: Comprehensive error tracking
- **Performance Monitoring**: API response times
- **User Behavior**: Trip preferences and patterns

## 🤝 Contributing

We welcome contributions! Please see our [Contributing Guide](CONTRIBUTING.md) for details.

### Development Workflow

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

### Code Style

- ESLint configuration for JavaScript
- Prettier for code formatting
- Semantic commit messages
- Comprehensive documentation

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- **Google Gemini AI** for intelligent trip generation
- **OpenStreetMap & Leaflet.js** for location services
- **OpenStreetMap** for additional mapping data
- **Unsplash/Picsum** for placeholder images
- **Font Awesome** for beautiful icons

## 📞 Support

- **Documentation**: [docs.MoodYatra.ai](https://docs.MoodYatra.ai)
- **Issues**: [GitHub Issues](https://github.com/MoodYatra/MoodYatra/issues)
- **Email**: support@MoodYatra.ai
- **Discord**: [Join our community](https://discord.gg/MoodYatra)

## 🗺️ Roadmap

### Version 1.1
- [ ] Multi-day trip planning
- [ ] Weather integration
- [ ] Transportation booking
- [ ] Group trip planning

### Version 1.2
- [ ] Mobile app (React Native)
- [ ] Offline mode
- [ ] Trip collaboration
- [ ] Advanced AI preferences

### Version 2.0
- [ ] AR navigation
- [ ] Real-time updates
- [ ] Social features
- [ ] Marketplace integration

---

## Contributors
- [UtkiVish](https://github.com/UtkiVish) 🛠️ Code, 📖 Docs

---

**Built with ❤️ for spontaneous travelers everywhere**

*MoodYatra - Building Tomorrow's Utility Tools, Today*
