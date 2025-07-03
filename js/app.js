// Main Application Logic
class MoodYatraApp {
    constructor() {
        this.currentStep = 1;
        this.tripData = {
            mood: null,
            location: '',
            duration: 6,
            budget: 2,
            customPrompt: '',
            preferences: {
                foodie: false,
                cultural: false,
                shopping: false
            }
        };
        this.generatedTrip = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.loadSelectedMood();
        this.updateBudgetDisplay();
    }

    setupEventListeners() {
        // Mood selection
        document.querySelectorAll('.mood-option').forEach(option => {
            option.addEventListener('click', (e) => {
                this.selectMood(e.currentTarget.dataset.mood);
            });
        });

        // Budget slider
        const budgetSlider = document.getElementById('budget');
        if (budgetSlider) {
            budgetSlider.addEventListener('input', () => {
                this.updateBudgetDisplay();
            });
        }

        // Form inputs
        const locationInput = document.getElementById('location');
        if (locationInput) {
            locationInput.addEventListener('input', () => {
                this.validateStep2();
            });
            
            // Listen for location selection from autocomplete
            locationInput.addEventListener('locationSelected', (e) => {
                this.handleLocationSelected(e.detail);
            });
        }

        // Preferences checkboxes
        document.querySelectorAll('#foodie, #cultural, #shopping').forEach(checkbox => {
            checkbox.addEventListener('change', () => {
                this.updatePreferences();
            });
        });

        // Custom prompt character counter
        const customPrompt = document.getElementById('customPrompt');
        if (customPrompt) {
            customPrompt.addEventListener('input', () => {
                this.updateCharacterCount();
            });
        }

        // Auth form
        const authForm = document.getElementById('authForm');
        if (authForm) {
            authForm.addEventListener('submit', (e) => {
                e.preventDefault();
                this.handleAuth();
            });
        }
    }

    loadSelectedMood() {
        const selectedMood = localStorage.getItem('selectedMood');
        if (selectedMood) {
            this.selectMood(selectedMood);
            localStorage.removeItem('selectedMood');
        }
    }

    selectMood(mood) {
        // Remove previous selection
        document.querySelectorAll('.mood-option').forEach(option => {
            option.classList.remove('selected');
        });

        // Add selection to clicked option
        const selectedOption = document.querySelector(`[data-mood="${mood}"]`);
        if (selectedOption) {
            selectedOption.classList.add('selected');
        }

        this.tripData.mood = mood;
        
        // Enable next button
        const nextBtn = document.getElementById('nextBtn1');
        if (nextBtn) {
            nextBtn.disabled = false;
        }
    }

    updateBudgetDisplay() {
        const budgetSlider = document.getElementById('budget');
        const budgetDisplay = document.getElementById('budgetDisplay');
        
        if (!budgetSlider || !budgetDisplay) return;

        const budgetLabels = ['Free', 'Budget ($)', 'Moderate ($$)', 'Premium ($$$)', 'Luxury ($$$$)'];
        const value = parseInt(budgetSlider.value);
        budgetDisplay.textContent = budgetLabels[value];
        this.tripData.budget = value;
    }

    updatePreferences() {
        this.tripData.preferences = {
            foodie: document.getElementById('foodie')?.checked || false,
            cultural: document.getElementById('cultural')?.checked || false,
            shopping: document.getElementById('shopping')?.checked || false
        };
    }

    updateCharacterCount() {
        const customPrompt = document.getElementById('customPrompt');
        const charCountElement = document.getElementById('promptCharCount');
        
        if (!customPrompt || !charCountElement) return;
        
        const currentLength = customPrompt.value.length;
        const maxLength = 500;
        
        charCountElement.textContent = currentLength;
        
        // Change color based on character count
        if (currentLength > maxLength * 0.9) {
            charCountElement.style.color = '#ef4444'; // Red when near limit
        } else if (currentLength > maxLength * 0.7) {
            charCountElement.style.color = '#f59e0b'; // Orange when getting close
        } else {
            charCountElement.style.color = '#00ffff'; // Cyan default
        }
        
        // Prevent exceeding max length
        if (currentLength > maxLength) {
            customPrompt.value = customPrompt.value.substring(0, maxLength);
            charCountElement.textContent = maxLength;
            charCountElement.style.color = '#ef4444';
        }
    }

    validateStep2() {
        const location = document.getElementById('location')?.value.trim();
        const nextBtn = document.getElementById('nextBtn2');
        
        if (nextBtn) {
            nextBtn.disabled = !location;
        }
        
        if (location) {
            this.tripData.location = location;
        }
    }

    handleLocationSelected(detail) {
        // Store additional location data from autocomplete
        this.tripData.locationDetails = {
            placeId: detail.suggestion.place_id,
            fullDescription: detail.suggestion.description,
            mainText: detail.mainText,
            types: detail.suggestion.types
        };
        
        // Update the location in trip data
        this.tripData.location = detail.mainText;
        
        // Validate the step
        this.validateStep2();
        
        console.log('Location selected:', this.tripData.locationDetails);
    }

    nextStep() {
        if (this.currentStep === 1) {
            if (!this.tripData.mood) {
                alert('Please select a mood for your trip!');
                return;
            }
            this.goToStep(2);
        } else if (this.currentStep === 2) {
            if (!this.tripData.location.trim()) {
                alert('Please enter your starting location!');
                return;
            }
            this.collectFormData();
            this.goToStep(3);
            this.generateTrip();
        }
    }

    prevStep() {
        if (this.currentStep > 1) {
            this.goToStep(this.currentStep - 1);
        }
    }

    goToStep(step) {
        // Hide current step
        document.querySelectorAll('.form-step').forEach(stepEl => {
            stepEl.classList.remove('active');
        });

        // Show target step
        const targetStep = document.getElementById(`step${step}`);
        if (targetStep) {
            targetStep.classList.add('active');
        }

        // Update step indicator
        document.querySelectorAll('.step-indicator .step').forEach((stepEl, index) => {
            stepEl.classList.toggle('active', index + 1 <= step);
        });

        this.currentStep = step;
    }

    collectFormData() {
        this.tripData.location = document.getElementById('location')?.value.trim() || '';
        this.tripData.duration = parseInt(document.getElementById('duration')?.value) || 6;
        this.tripData.budget = parseInt(document.getElementById('budget')?.value) || 2;
        this.tripData.customPrompt = document.getElementById('customPrompt')?.value.trim() || '';
        this.updatePreferences();
    }

    async generateTrip() {
        try {
            this.showLoadingState();
            
            // Generate trip using Gemini AI
            const generatedTrip = await this.callGeminiAPI();
            
            // Get places data from Google Maps
            const placesData = await this.getPlacesData(generatedTrip.places);
            
            // Combine data
            this.generatedTrip = {
                ...generatedTrip,
                places: placesData,
                id: this.generateTripId(),
                createdAt: new Date().toISOString(),
                ...this.tripData
            };

            // Save trip (if user is logged in)
            await this.saveTrip();

            // Display results
            this.displayResults();
            
        } catch (error) {
            console.error('Error generating trip:', error);
            this.showError('Failed to generate trip. Please try again.');
        }
    }

    showLoadingState() {
        const loadingTexts = [
            'Analyzing your preferences...',
            'Finding amazing places nearby...',
            'Creating your perfect itinerary...',
            'Adding local recommendations...',
            'Almost ready!'
        ];

        let currentIndex = 0;
        const loadingText = document.getElementById('loadingText');
        
        const updateText = () => {
            if (loadingText && currentIndex < loadingTexts.length) {
                loadingText.textContent = loadingTexts[currentIndex];
                currentIndex++;
                setTimeout(updateText, 1000);
            }
        };

        updateText();
    }

    async callGeminiAPI() {
        const prompt = this.buildGeminiPrompt();
        
        try {
            const response = await fetch('/api/generate-trip', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    prompt: prompt,
                    tripData: this.tripData
                })
            });

            if (!response.ok) {
                throw new Error('Failed to generate trip');
            }

            return await response.json();
        } catch (error) {
            console.error('Gemini API error:', error);
            // Fallback to mock data for demo
            return this.getMockTripData();
        }
    }

    buildGeminiPrompt() {
        const { mood, location, duration, budget, preferences } = this.tripData;
        const budgetLabels = ['free', 'budget-friendly', 'moderate', 'premium', 'luxury'];
        const budgetText = budgetLabels[budget];

        let preferencesText = '';
        if (preferences.foodie) preferencesText += ' Include food experiences and local cuisine.';
        if (preferences.cultural) preferencesText += ' Include cultural attractions and museums.';
        if (preferences.shopping) preferencesText += ' Include shopping opportunities.';

        return `Create a ${duration}-hour ${mood} day trip itinerary for ${location}. 
                Budget level: ${budgetText}. 
                ${preferencesText}
                
                Please provide:
                1. A catchy trip title
                2. A brief description
                3. 4-6 specific places/activities with:
                   - Name and type
                   - Time to spend there
                   - Brief description
                   - Estimated cost
                   - Suggested time of day
                4. Restaurant recommendations
                5. Transportation tips
                
                Format as JSON with clear structure for easy parsing.`;
    }

    getMockTripData() {
        // Mock data for demo purposes
        const moodTitles = {
            fun: 'Epic Adventure Day',
            chill: 'Peaceful Relaxation Day',
            nature: 'Nature Explorer Day',
            romantic: 'Romantic Escape Day'
        };

        return {
            title: moodTitles[this.tripData.mood] || 'Amazing Day Trip',
            description: `A perfect ${this.tripData.mood} day planned just for you in ${this.tripData.location}.`,
            places: [
                {
                    name: 'Local Park',
                    type: 'Park',
                    time: '10:00 AM',
                    duration: '2 hours',
                    description: 'Beautiful park perfect for morning activities',
                    cost: 'Free',
                    lat: 40.7128,
                    lng: -74.0060
                },
                {
                    name: 'Cozy Cafe',
                    type: 'Restaurant',
                    time: '12:30 PM',
                    duration: '1 hour',
                    description: 'Perfect spot for lunch with local flavors',
                    cost: '$15-25',
                    lat: 40.7589,
                    lng: -73.9851
                },
                {
                    name: 'Art Gallery',
                    type: 'Cultural',
                    time: '2:00 PM',
                    duration: '1.5 hours',
                    description: 'Local art and cultural exhibitions',
                    cost: '$10',
                    lat: 40.7505,
                    lng: -73.9934
                },
                {
                    name: 'Scenic Viewpoint',
                    type: 'Attraction',
                    time: '4:00 PM',
                    duration: '1 hour',
                    description: 'Amazing views perfect for photos',
                    cost: 'Free',
                    lat: 40.7614,
                    lng: -73.9776
                }
            ],
            totalDistance: '12.5',
            estimatedCost: '$35-50'
        };
    }

    async getPlacesData(places) {
        // This would integrate with Google Places API
        // For now, return the places with mock image data
        return places.map(place => ({
            ...place,
            image: `https://picsum.photos/300/200?random=${Math.floor(Math.random() * 1000)}`,
            rating: (Math.random() * 2 + 3).toFixed(1), // Random rating between 3-5
            reviews: Math.floor(Math.random() * 500) + 50
        }));
    }

    displayResults() {
        document.getElementById('loadingState').style.display = 'none';
        document.getElementById('resultsState').style.display = 'block';

        // Update trip header
        document.getElementById('tripTitle').textContent = this.generatedTrip.title;
        document.getElementById('tripDuration').textContent = `${this.generatedTrip.duration} hours`;
        document.getElementById('tripBudget').textContent = this.getBudgetDisplay(this.generatedTrip.budget);
        document.getElementById('tripMood').textContent = this.capitalizeMood(this.generatedTrip.mood);

        // Display itinerary
        this.displayItinerary();

        // Initialize map
        if (window.initializeMap) {
            window.initializeMap(this.generatedTrip.places, this.generatedTrip.location);
        }
    }

    displayItinerary() {
        const container = document.getElementById('itineraryList');
        if (!container) return;

        container.innerHTML = '';

        this.generatedTrip.places.forEach((place, index) => {
            const itemElement = document.createElement('div');
            itemElement.className = 'itinerary-item slide-up';
            itemElement.style.animationDelay = `${index * 0.1}s`;
            
            itemElement.innerHTML = `
                <div class="item-time">${place.time}</div>
                <div class="item-content">
                    <h3>${place.name}</h3>
                    <p>${place.description}</p>
                    <div class="item-details">
                        <span class="item-type">${place.type}</span>
                        <span class="item-duration">${place.duration}</span>
                        ${place.cost ? `<span class="item-cost">${place.cost}</span>` : ''}
                        ${place.rating ? `<span class="item-rating">⭐ ${place.rating}</span>` : ''}
                    </div>
                </div>
                ${place.image ? `<div class="item-image"><img src="${place.image}" alt="${place.name}" loading="lazy"></div>` : ''}
            `;
            
            container.appendChild(itemElement);
        });
    }

    getBudgetDisplay(budget) {
        const budgetMap = {
            0: 'Free',
            1: '$',
            2: '$$',
            3: '$$$',
            4: '$$$$'
        };
        return budgetMap[budget] || '$$';
    }

    capitalizeMood(mood) {
        return mood.charAt(0).toUpperCase() + mood.slice(1);
    }

    generateTripId() {
        return Math.random().toString(36).substr(2, 9);
    }

    async saveTrip() {
        try {
            const response = await fetch('/api/trips', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify(this.generatedTrip)
            });

            if (response.ok) {
                const result = await response.json();
                this.generatedTrip.shareUrl = `${window.location.origin}/view.html?id=${result.id}`;
            }
        } catch (error) {
            console.error('Error saving trip:', error);
            // Generate local share URL as fallback
            this.generatedTrip.shareUrl = `${window.location.origin}/view.html?id=${this.generatedTrip.id}`;
        }
    }

    showError(message) {
        document.getElementById('loadingState').style.display = 'none';
        alert(message); // In production, use a better error display
    }

    generateNew() {
        // Reset form and go back to step 1
        this.tripData = {
            mood: null,
            location: '',
            duration: 6,
            budget: 2,
            preferences: {
                foodie: false,
                cultural: false,
                shopping: false
            }
        };
        this.generatedTrip = null;
        this.goToStep(1);
        
        // Reset form elements
        document.querySelectorAll('.mood-option').forEach(option => {
            option.classList.remove('selected');
        });
        
        const locationInput = document.getElementById('location');
        if (locationInput) locationInput.value = '';
        
        const nextBtn1 = document.getElementById('nextBtn1');
        if (nextBtn1) nextBtn1.disabled = true;
    }

    async exportPDF() {
        if (!this.generatedTrip) return;

        try {
            if (window.generatePDF) {
                await window.generatePDF(this.generatedTrip);
            } else {
                alert('PDF export feature is loading. Please try again in a moment.');
            }
        } catch (error) {
            console.error('Error exporting PDF:', error);
            alert('Failed to export PDF. Please try again.');
        }
    }

    shareTrip() {
        if (!this.generatedTrip) return;

        // Set share URL
        const shareUrl = this.generatedTrip.shareUrl || `${window.location.origin}/view.html?id=${this.generatedTrip.id}`;
        document.getElementById('shareUrl').value = shareUrl;

        // Generate QR code
        if (window.QRCode) {
            const qrContainer = document.getElementById('qrCode');
            qrContainer.innerHTML = '';
            QRCode.toCanvas(qrContainer, shareUrl, { width: 200 }, function (error) {
                if (error) console.error(error);
            });
        }

        // Show modal
        document.getElementById('shareModal').style.display = 'block';
    }
}

// Utility Functions
function getCurrentLocation() {
    if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
            (position) => {
                const lat = position.coords.latitude;
                const lng = position.coords.longitude;
                
                // Reverse geocode to get address
                if (window.reverseGeocode) {
                    window.reverseGeocode(lat, lng);
                } else {
                    document.getElementById('location').value = `${lat.toFixed(4)}, ${lng.toFixed(4)}`;
                    app.validateStep2();
                }
            },
            (error) => {
                console.error('Geolocation error:', error);
                alert('Unable to get your location. Please enter it manually.');
            }
        );
    } else {
        alert('Geolocation is not supported by this browser.');
    }
}

function nextStep() {
    if (window.app) {
        window.app.nextStep();
    }
}

function prevStep() {
    if (window.app) {
        window.app.prevStep();
    }
}

function generateNew() {
    if (window.app) {
        window.app.generateNew();
    }
}

function exportPDF() {
    if (window.app) {
        window.app.exportPDF();
    }
}

function shareTrip() {
    if (window.app) {
        window.app.shareTrip();
    }
}

function closeShareModal() {
    document.getElementById('shareModal').style.display = 'none';
}

function copyShareLink() {
    const shareUrl = document.getElementById('shareUrl');
    shareUrl.select();
    document.execCommand('copy');
    
    // Show feedback
    const button = event.target.closest('button');
    const originalHTML = button.innerHTML;
    button.innerHTML = '<i class="fas fa-check"></i>';
    setTimeout(() => {
        button.innerHTML = originalHTML;
    }, 2000);
}

function shareToTwitter() {
    const shareUrl = document.getElementById('shareUrl').value;
    const text = `Check out this amazing trip itinerary created with MoodYatra!`;
    window.open(`https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent(shareUrl)}`, '_blank');
}

function shareToFacebook() {
    const shareUrl = document.getElementById('shareUrl').value;
    window.open(`https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}`, '_blank');
}

function shareToWhatsApp() {
    const shareUrl = document.getElementById('shareUrl').value;
    const text = `Check out this amazing trip itinerary: ${shareUrl}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
}

// Initialize app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.app = new MoodYatraApp();
});

// Close modals when clicking outside
window.onclick = function(event) {
    const shareModal = document.getElementById('shareModal');
    const authModal = document.getElementById('authModal');
    
    if (event.target == shareModal) {
        shareModal.style.display = 'none';
    }
    if (event.target == authModal) {
        authModal.style.display = 'none';
    }
}