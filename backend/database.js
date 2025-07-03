// SQLite Database Manager for MoodYatra
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs').promises;

class Database {
    constructor() {
        this.dbPath = path.join(__dirname, 'MoodYatra.db');
        this.db = null;
    }

    async init() {
        try {
            // Create database connection
            this.db = new sqlite3.Database(this.dbPath, (err) => {
                if (err) {
                    console.error('Error opening database:', err);
                } else {
                    console.log('📊 Connected to SQLite database');
                }
            });

            // Enable foreign keys
            await this.run('PRAGMA foreign_keys = ON');

            // Create tables
            await this.createTables();
            
            console.log('✅ Database initialized successfully');
        } catch (error) {
            console.error('Database initialization error:', error);
            throw error;
        }
    }

    async createTables() {
        // Users table
        await this.run(`
            CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                email TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                name TEXT NOT NULL,
                provider TEXT DEFAULT 'email',
                provider_id TEXT,
                avatar_url TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )
        `);

        // Trips table
        await this.run(`
            CREATE TABLE IF NOT EXISTS trips (
                id TEXT PRIMARY KEY,
                user_id INTEGER,
                title TEXT NOT NULL,
                description TEXT,
                location TEXT NOT NULL,
                mood TEXT NOT NULL,
                duration INTEGER NOT NULL,
                budget INTEGER NOT NULL,
                preferences TEXT, -- JSON string
                itinerary TEXT NOT NULL, -- JSON string
                total_distance TEXT,
                estimated_cost TEXT,
                best_time_to_start TEXT,
                transportation_tips TEXT,
                weather_considerations TEXT,
                additional_tips TEXT,
                share_url TEXT,
                is_public BOOLEAN DEFAULT 1,
                views INTEGER DEFAULT 0,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
            )
        `);

        // Trip places table (for better querying)
        await this.run(`
            CREATE TABLE IF NOT EXISTS trip_places (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                trip_id TEXT NOT NULL,
                place_name TEXT NOT NULL,
                place_type TEXT NOT NULL,
                time TEXT NOT NULL,
                duration TEXT NOT NULL,
                description TEXT,
                cost TEXT,
                address TEXT,
                lat REAL,
                lng REAL,
                rating REAL,
                reviews INTEGER,
                image_url TEXT,
                tips TEXT,
                order_index INTEGER NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE
            )
        `);

        // User favorites table
        await this.run(`
            CREATE TABLE IF NOT EXISTS user_favorites (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER NOT NULL,
                trip_id TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE CASCADE,
                FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE CASCADE,
                UNIQUE(user_id, trip_id)
            )
        `);

        // Analytics table
        await this.run(`
            CREATE TABLE IF NOT EXISTS analytics (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                event_type TEXT NOT NULL,
                trip_id TEXT,
                user_id INTEGER,
                data TEXT, -- JSON string
                ip_address TEXT,
                user_agent TEXT,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (trip_id) REFERENCES trips (id) ON DELETE SET NULL,
                FOREIGN KEY (user_id) REFERENCES users (id) ON DELETE SET NULL
            )
        `);

        // Create indexes for better performance
        await this.run('CREATE INDEX IF NOT EXISTS idx_trips_user_id ON trips (user_id)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_trips_mood ON trips (mood)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_trips_location ON trips (location)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_trips_created_at ON trips (created_at)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_trip_places_trip_id ON trip_places (trip_id)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_analytics_event_type ON analytics (event_type)');
        await this.run('CREATE INDEX IF NOT EXISTS idx_analytics_created_at ON analytics (created_at)');
    }

    // User methods
    async createUser(userData) {
        const { email, password, name, provider = 'email', provider_id = null, avatar_url = null } = userData;
        
        const result = await this.run(
            `INSERT INTO users (email, password, name, provider, provider_id, avatar_url) 
             VALUES (?, ?, ?, ?, ?, ?)`,
            [email, password, name, provider, provider_id, avatar_url]
        );
        
        return result.lastID;
    }

    async getUserByEmail(email) {
        return await this.get('SELECT * FROM users WHERE email = ?', [email]);
    }

    async getUserById(id) {
        return await this.get('SELECT * FROM users WHERE id = ?', [id]);
    }

    async updateUser(id, userData) {
        const { name, avatar_url } = userData;
        await this.run(
            'UPDATE users SET name = ?, avatar_url = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
            [name, avatar_url, id]
        );
    }

    // Trip methods
    async saveTrip(tripData) {
        const tripId = tripData.id || this.generateTripId();
        
        const {
            user_id = null,
            title,
            description = '',
            location,
            mood,
            duration,
            budget,
            preferences = {},
            itinerary = [],
            total_distance = '',
            estimated_cost = '',
            best_time_to_start = '',
            transportation_tips = '',
            weather_considerations = '',
            additional_tips = '',
            share_url = '',
            is_public = 1
        } = tripData;

        // Save main trip record
        await this.run(`
            INSERT OR REPLACE INTO trips (
                id, user_id, title, description, location, mood, duration, budget,
                preferences, itinerary, total_distance, estimated_cost,
                best_time_to_start, transportation_tips, weather_considerations,
                additional_tips, share_url, is_public, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CURRENT_TIMESTAMP)
        `, [
            tripId, user_id, title, description, location, mood, duration, budget,
            JSON.stringify(preferences), JSON.stringify(itinerary), total_distance,
            estimated_cost, best_time_to_start, transportation_tips,
            weather_considerations, additional_tips, share_url, is_public
        ]);

        // Save individual places
        await this.run('DELETE FROM trip_places WHERE trip_id = ?', [tripId]);
        
        for (let i = 0; i < itinerary.length; i++) {
            const place = itinerary[i];
            await this.run(`
                INSERT INTO trip_places (
                    trip_id, place_name, place_type, time, duration, description,
                    cost, address, lat, lng, rating, reviews, image_url, tips, order_index
                ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            `, [
                tripId, place.name, place.type, place.time, place.duration,
                place.description, place.cost, place.address, place.lat, place.lng,
                place.rating, place.reviews, place.image, place.tips, i
            ]);
        }

        return tripId;
    }

    async getTripById(id) {
        const trip = await this.get('SELECT * FROM trips WHERE id = ?', [id]);
        
        if (!trip) {
            return null;
        }

        // Parse JSON fields
        trip.preferences = JSON.parse(trip.preferences || '{}');
        trip.itinerary = JSON.parse(trip.itinerary || '[]');

        // Increment view count
        await this.run('UPDATE trips SET views = views + 1 WHERE id = ?', [id]);

        return trip;
    }

    async getUserTrips(userId) {
        const trips = await this.all(
            'SELECT * FROM trips WHERE user_id = ? ORDER BY created_at DESC',
            [userId]
        );

        return trips.map(trip => ({
            ...trip,
            preferences: JSON.parse(trip.preferences || '{}'),
            itinerary: JSON.parse(trip.itinerary || '[]')
        }));
    }

    async getPublicTrips(limit = 20, offset = 0) {
        const trips = await this.all(`
            SELECT id, title, description, location, mood, duration, budget,
                   total_distance, estimated_cost, views, created_at
            FROM trips 
            WHERE is_public = 1 
            ORDER BY created_at DESC 
            LIMIT ? OFFSET ?
        `, [limit, offset]);

        return trips;
    }

    async searchTrips(query, mood = null, location = null, limit = 20) {
        let sql = `
            SELECT id, title, description, location, mood, duration, budget,
                   total_distance, estimated_cost, views, created_at
            FROM trips 
            WHERE is_public = 1 AND (title LIKE ? OR description LIKE ? OR location LIKE ?)
        `;
        let params = [`%${query}%`, `%${query}%`, `%${query}%`];

        if (mood) {
            sql += ' AND mood = ?';
            params.push(mood);
        }

        if (location) {
            sql += ' AND location LIKE ?';
            params.push(`%${location}%`);
        }

        sql += ' ORDER BY created_at DESC LIMIT ?';
        params.push(limit);

        return await this.all(sql, params);
    }

    async deleteTrip(id, userId = null) {
        let sql = 'DELETE FROM trips WHERE id = ?';
        let params = [id];

        if (userId) {
            sql += ' AND user_id = ?';
            params.push(userId);
        }

        const result = await this.run(sql, params);
        return result.changes > 0;
    }

    // Favorites methods
    async addFavorite(userId, tripId) {
        try {
            await this.run(
                'INSERT INTO user_favorites (user_id, trip_id) VALUES (?, ?)',
                [userId, tripId]
            );
            return true;
        } catch (error) {
            if (error.code === 'SQLITE_CONSTRAINT_UNIQUE') {
                return false; // Already favorited
            }
            throw error;
        }
    }

    async removeFavorite(userId, tripId) {
        const result = await this.run(
            'DELETE FROM user_favorites WHERE user_id = ? AND trip_id = ?',
            [userId, tripId]
        );
        return result.changes > 0;
    }

    async getUserFavorites(userId) {
        return await this.all(`
            SELECT t.id, t.title, t.description, t.location, t.mood, t.duration,
                   t.budget, t.total_distance, t.estimated_cost, t.views, t.created_at
            FROM trips t
            JOIN user_favorites f ON t.id = f.trip_id
            WHERE f.user_id = ?
            ORDER BY f.created_at DESC
        `, [userId]);
    }

    // Analytics methods
    async logEvent(eventType, data = {}) {
        await this.run(`
            INSERT INTO analytics (event_type, trip_id, user_id, data, ip_address, user_agent)
            VALUES (?, ?, ?, ?, ?, ?)
        `, [
            eventType,
            data.trip_id || null,
            data.user_id || null,
            JSON.stringify(data),
            data.ip_address || null,
            data.user_agent || null
        ]);
    }

    async getAnalytics(eventType = null, days = 30) {
        let sql = `
            SELECT event_type, COUNT(*) as count, DATE(created_at) as date
            FROM analytics
            WHERE created_at >= datetime('now', '-${days} days')
        `;
        let params = [];

        if (eventType) {
            sql += ' AND event_type = ?';
            params.push(eventType);
        }

        sql += ' GROUP BY event_type, DATE(created_at) ORDER BY date DESC';

        return await this.all(sql, params);
    }

    // Utility methods
    generateTripId() {
        return Math.random().toString(36).substr(2, 9);
    }

    // Database helper methods
    run(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.run(sql, params, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve({ lastID: this.lastID, changes: this.changes });
                }
            });
        });
    }

    get(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.get(sql, params, (err, row) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(row);
                }
            });
        });
    }

    all(sql, params = []) {
        return new Promise((resolve, reject) => {
            this.db.all(sql, params, (err, rows) => {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    async close() {
        return new Promise((resolve, reject) => {
            this.db.close((err) => {
                if (err) {
                    reject(err);
                } else {
                    console.log('📊 Database connection closed');
                    resolve();
                }
            });
        });
    }

    // Backup and maintenance
    async backup() {
        try {
            const backupPath = path.join(__dirname, `backup_${Date.now()}.db`);
            await fs.copyFile(this.dbPath, backupPath);
            console.log(`📦 Database backed up to: ${backupPath}`);
            return backupPath;
        } catch (error) {
            console.error('Backup error:', error);
            throw error;
        }
    }

    async vacuum() {
        await this.run('VACUUM');
        console.log('🧹 Database vacuumed');
    }

    async getStats() {
        const stats = {};
        
        stats.users = await this.get('SELECT COUNT(*) as count FROM users');
        stats.trips = await this.get('SELECT COUNT(*) as count FROM trips');
        stats.publicTrips = await this.get('SELECT COUNT(*) as count FROM trips WHERE is_public = 1');
        stats.totalViews = await this.get('SELECT SUM(views) as total FROM trips');
        stats.favorites = await this.get('SELECT COUNT(*) as count FROM user_favorites');
        
        return {
            users: stats.users.count,
            trips: stats.trips.count,
            publicTrips: stats.publicTrips.count,
            totalViews: stats.totalViews.total || 0,
            favorites: stats.favorites.count
        };
    }
}

module.exports = Database;