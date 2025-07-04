// Setup script for MoodYatra
const fs = require('fs').promises;
const path = require('path');
const Database = require('../backend/database');

async function setup() {
    console.log('🚀 Setting up MoodYatra...\n');

    try {
        // Check if .env file exists
        await checkEnvironmentFile();
        
        // Initialize database
        await initializeDatabase();
        
        // Create necessary directories
        await createDirectories();
        
        // Verify API keys (optional)
        await verifyAPIKeys();
        
        console.log('✅ Setup completed successfully!');
        console.log('\n🎉 MoodYatra is ready to use!');
        console.log('📝 Run "npm run dev" to start the development server');
        console.log('🌐 Then open http://localhost:3000 in your browser\n');
        
    } catch (error) {
        console.error('❌ Setup failed:', error.message);
        process.exit(1);
    }
}

async function checkEnvironmentFile() {
    console.log('📋 Checking environment configuration...');
    
    try {
        await fs.access('.env');
        console.log('✅ .env file found');
    } catch (error) {
        console.log('⚠️  .env file not found, creating from template...');
        
        try {
            const template = await fs.readFile('.env.example', 'utf8');
            await fs.writeFile('.env', template);
            console.log('✅ .env file created from template');
            console.log('📝 Please edit .env file with your API keys');
        } catch (templateError) {
            throw new Error('Could not create .env file from template');
        }
    }
}

async function initializeDatabase() {
    console.log('🗄️  Initializing database...');
    
    const db = new Database();
    await db.init();
    
    // Check if database has data
    const stats = await db.getStats();
    console.log(`📊 Database stats: ${stats.users} users, ${stats.trips} trips`);
    
    await db.close();
    console.log('✅ Database initialized successfully');
}

async function createDirectories() {
    console.log('📁 Creating necessary directories...');
    
    const directories = [
        'logs',
        'uploads',
        'backups'
    ];
    
    for (const dir of directories) {
        try {
            await fs.mkdir(dir, { recursive: true });
            console.log(`✅ Created directory: ${dir}`);
        } catch (error) {
            if (error.code !== 'EEXIST') {
                throw error;
            }
            console.log(`📁 Directory already exists: ${dir}`);
        }
    }
}

async function verifyAPIKeys() {
    console.log('🔑 Verifying API keys...');
    
    // Load environment variables
    require('dotenv').config();
    
    const requiredKeys = {
        'GEMINI_API_KEY': 'Gemini AI API',
        'JWT_SECRET': 'JWT Secret'
    };
    
    const optionalKeys = {
        'GEMINI_API_KEY': 'Gemini AI API'
    };
    
    let hasAllRequired = true;
    
    // Check required keys
    for (const [key, name] of Object.entries(requiredKeys)) {
        if (process.env[key]) {
            console.log(`✅ ${name} key found`);
        } else {
            console.log(`❌ ${name} key missing`);
            hasAllRequired = false;
        }
    }
    
    // Check optional keys
    for (const [key, name] of Object.entries(optionalKeys)) {
        if (process.env[key]) {
            console.log(`✅ ${name} key found`);
        } else {
            console.log(`⚠️  ${name} key missing (optional - will use mock data)`);
        }
    }
    
    if (!hasAllRequired) {
        console.log('\n📝 Please add the missing API keys to your .env file:');
        console.log('   - Get Gemini AI API key from: https://makersuite.google.com/app/apikey');
        console.log('   - Generate a secure JWT secret (random string)');
        console.log('   - Optionally get OpenTripMap API key from: https://opentripmap.io/product');
    }
}

// Run setup if this file is executed directly
if (require.main === module) {
    setup();
}

module.exports = setup;