// PDF Export Functionality
class PDFExporter {
    constructor() {
        this.jsPDF = null;
        this.init();
    }

    async init() {
        // Load jsPDF library dynamically
        try {
            await this.loadJsPDF();
        } catch (error) {
            console.error('Failed to load PDF library:', error);
        }
    }

    async loadJsPDF() {
        return new Promise((resolve, reject) => {
            if (window.jsPDF) {
                this.jsPDF = window.jsPDF;
                resolve();
                return;
            }

            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js';
            script.onload = () => {
                this.jsPDF = window.jspdf.jsPDF;
                resolve();
            };
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }

    async generatePDF(tripData) {
        if (!this.jsPDF) {
            await this.loadJsPDF();
        }

        if (!this.jsPDF) {
            throw new Error('PDF library not available');
        }

        try {
            const doc = new this.jsPDF();
            
            // Set up document
            this.setupDocument(doc);
            
            // Add header
            this.addHeader(doc, tripData);
            
            // Add trip overview
            this.addTripOverview(doc, tripData);
            
            // Add itinerary
            this.addItinerary(doc, tripData);
            
            // Add footer
            this.addFooter(doc);
            
            // Save the PDF
            const fileName = `${tripData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_itinerary.pdf`;
            doc.save(fileName);
            
            return true;
        } catch (error) {
            console.error('Error generating PDF:', error);
            throw error;
        }
    }

    setupDocument(doc) {
        // Set document properties
        doc.setProperties({
            title: 'MoodYatra Itinerary',
            subject: 'Travel Itinerary',
            author: 'MoodYatra',
            creator: 'MoodYatra'
        });
    }

    addHeader(doc, tripData) {
        const pageWidth = doc.internal.pageSize.width;
        
        // Add logo/title
        doc.setFontSize(24);
        doc.setTextColor(102, 126, 234); // #667eea
        doc.setFont(undefined, 'bold');
        doc.text('MoodYatra', 20, 25);
        
        // Add trip title
        doc.setFontSize(18);
        doc.setTextColor(51, 51, 51); // #333
        doc.text(tripData.title, 20, 40);
        
        // Add date
        doc.setFontSize(10);
        doc.setTextColor(102, 102, 102); // #666
        doc.setFont(undefined, 'normal');
        const date = new Date().toLocaleDateString('en-US', { 
            year: 'numeric', 
            month: 'long', 
            day: 'numeric' 
        });
        doc.text(`Generated on ${date}`, pageWidth - 20, 25, { align: 'right' });
        
        // Add line separator
        doc.setDrawColor(233, 236, 239); // #e9ecef
        doc.line(20, 50, pageWidth - 20, 50);
    }

    addTripOverview(doc, tripData) {
        let yPosition = 65;
        
        // Section title
        doc.setFontSize(14);
        doc.setTextColor(102, 126, 234); // #667eea
        doc.setFont(undefined, 'bold');
        doc.text('Trip Overview', 20, yPosition);
        yPosition += 15;
        
        // Trip details
        doc.setFontSize(10);
        doc.setTextColor(51, 51, 51); // #333
        doc.setFont(undefined, 'normal');
        
        const details = [
            `Location: ${tripData.location}`,
            `Duration: ${tripData.duration} hours`,
            `Mood: ${this.capitalizeMood(tripData.mood)}`,
            `Budget: ${this.getBudgetDisplay(tripData.budget)}`,
            `Total Distance: ${tripData.totalDistance || 'N/A'}`,
            `Estimated Cost: ${tripData.estimatedCost || 'N/A'}`
        ];
        
        details.forEach(detail => {
            doc.text(detail, 25, yPosition);
            yPosition += 8;
        });
        
        // Description
        if (tripData.description) {
            yPosition += 5;
            doc.setFont(undefined, 'italic');
            const splitDescription = doc.splitTextToSize(tripData.description, 170);
            doc.text(splitDescription, 25, yPosition);
            yPosition += splitDescription.length * 6;
        }
        
        return yPosition + 10;
    }

    addItinerary(doc, tripData) {
        let yPosition = this.addTripOverview(doc, tripData);
        const pageHeight = doc.internal.pageSize.height;
        const pageWidth = doc.internal.pageSize.width;
        
        // Section title
        doc.setFontSize(14);
        doc.setTextColor(102, 126, 234); // #667eea
        doc.setFont(undefined, 'bold');
        doc.text('Your Itinerary', 20, yPosition);
        yPosition += 15;
        
        // Itinerary items
        tripData.itinerary.forEach((item, index) => {
            // Check if we need a new page
            if (yPosition > pageHeight - 60) {
                doc.addPage();
                yPosition = 30;
            }
            
            // Item number and time
            doc.setFontSize(12);
            doc.setTextColor(102, 126, 234); // #667eea
            doc.setFont(undefined, 'bold');
            doc.text(`${index + 1}. ${item.time}`, 20, yPosition);
            yPosition += 8;
            
            // Item name
            doc.setFontSize(11);
            doc.setTextColor(51, 51, 51); // #333
            doc.setFont(undefined, 'bold');
            doc.text(item.name, 25, yPosition);
            yPosition += 8;
            
            // Item type and duration
            doc.setFontSize(9);
            doc.setTextColor(102, 102, 102); // #666
            doc.setFont(undefined, 'normal');
            doc.text(`${item.type} • ${item.duration}${item.cost ? ` • ${item.cost}` : ''}`, 25, yPosition);
            yPosition += 8;
            
            // Description
            doc.setFontSize(9);
            doc.setTextColor(51, 51, 51); // #333
            const splitDescription = doc.splitTextToSize(item.description, 160);
            doc.text(splitDescription, 25, yPosition);
            yPosition += splitDescription.length * 5;
            
            // Tips
            if (item.tips) {
                yPosition += 3;
                doc.setFont(undefined, 'italic');
                doc.setTextColor(102, 126, 234); // #667eea
                doc.text('💡 Tip: ', 25, yPosition);
                doc.setTextColor(51, 51, 51); // #333
                const splitTips = doc.splitTextToSize(item.tips, 150);
                doc.text(splitTips, 40, yPosition);
                yPosition += splitTips.length * 5;
            }
            
            // Address
            if (item.address) {
                yPosition += 3;
                doc.setFont(undefined, 'normal');
                doc.setTextColor(102, 102, 102); // #666
                doc.text(`📍 ${item.address}`, 25, yPosition);
                yPosition += 6;
            }
            
            // Rating
            if (item.rating) {
                doc.setTextColor(255, 193, 7); // Gold color for stars
                doc.text(`⭐ ${item.rating}`, 25, yPosition);
                if (item.reviews) {
                    doc.setTextColor(102, 102, 102); // #666
                    doc.text(`(${item.reviews} reviews)`, 50, yPosition);
                }
                yPosition += 6;
            }
            
            // Separator line
            yPosition += 5;
            doc.setDrawColor(233, 236, 239); // #e9ecef
            doc.line(25, yPosition, pageWidth - 25, yPosition);
            yPosition += 10;
        });
        
        // Additional tips section
        if (tripData.additionalTips) {
            yPosition += 10;
            
            // Check if we need a new page
            if (yPosition > pageHeight - 80) {
                doc.addPage();
                yPosition = 30;
            }
            
            doc.setFontSize(12);
            doc.setTextColor(102, 126, 234); // #667eea
            doc.setFont(undefined, 'bold');
            doc.text('Additional Tips', 20, yPosition);
            yPosition += 10;
            
            doc.setFontSize(9);
            doc.setTextColor(51, 51, 51); // #333
            doc.setFont(undefined, 'normal');
            const splitTips = doc.splitTextToSize(tripData.additionalTips, 170);
            doc.text(splitTips, 25, yPosition);
        }
        
        // Transportation tips
        if (tripData.transportationTips) {
            yPosition += splitTips ? splitTips.length * 5 + 10 : 10;
            
            doc.setFontSize(12);
            doc.setTextColor(102, 126, 234); // #667eea
            doc.setFont(undefined, 'bold');
            doc.text('Transportation', 20, yPosition);
            yPosition += 10;
            
            doc.setFontSize(9);
            doc.setTextColor(51, 51, 51); // #333
            doc.setFont(undefined, 'normal');
            const splitTransport = doc.splitTextToSize(tripData.transportationTips, 170);
            doc.text(splitTransport, 25, yPosition);
        }
    }

    addFooter(doc) {
        const pageHeight = doc.internal.pageSize.height;
        const pageWidth = doc.internal.pageSize.width;
        
        // Add footer line
        doc.setDrawColor(233, 236, 239); // #e9ecef
        doc.line(20, pageHeight - 30, pageWidth - 20, pageHeight - 30);
        
        // Footer text
        doc.setFontSize(8);
        doc.setTextColor(102, 102, 102); // #666
        doc.setFont(undefined, 'normal');
        doc.text('Generated by MoodYatra - Building Tomorrow\'s Utility Tools', 20, pageHeight - 20);
        
        // Website
        doc.setTextColor(102, 126, 234); // #667eea
        doc.text('MoodYatra.ai', pageWidth - 20, pageHeight - 20, { align: 'right' });
        
        // QR code placeholder (if share URL exists)
        if (window.app && window.app.generatedTrip && window.app.generatedTrip.shareUrl) {
            doc.setFontSize(7);
            doc.setTextColor(102, 102, 102); // #666
            doc.text('Scan to view online:', pageWidth - 60, pageHeight - 12, { align: 'right' });
            
            // Add small QR code (would need QR code library integration)
            doc.rect(pageWidth - 25, pageHeight - 25, 15, 15);
            doc.setFontSize(6);
            doc.text('QR', pageWidth - 19, pageHeight - 17);
        }
    }

    getBudgetDisplay(budget) {
        const budgetMap = {
            0: 'Free',
            1: 'Budget ($)',
            2: 'Moderate ($$)',
            3: 'Premium ($$$)',
            4: 'Luxury ($$$$)'
        };
        return budgetMap[budget] || 'Moderate ($$)';
    }

    capitalizeMood(mood) {
        return mood.charAt(0).toUpperCase() + mood.slice(1);
    }

    // Alternative method using html2canvas for visual PDF
    async generateVisualPDF(tripData) {
        try {
            // Load html2canvas if not already loaded
            if (!window.html2canvas) {
                await this.loadHtml2Canvas();
            }

            const doc = new this.jsPDF();
            
            // Capture the results container
            const element = document.getElementById('resultsState');
            if (!element) {
                throw new Error('Results container not found');
            }

            const canvas = await html2canvas(element, {
                scale: 2,
                useCORS: true,
                allowTaint: true
            });

            const imgData = canvas.toDataURL('image/png');
            const imgWidth = 210; // A4 width in mm
            const pageHeight = 295; // A4 height in mm
            const imgHeight = (canvas.height * imgWidth) / canvas.width;
            let heightLeft = imgHeight;

            let position = 0;

            // Add first page
            doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
            heightLeft -= pageHeight;

            // Add additional pages if needed
            while (heightLeft >= 0) {
                position = heightLeft - imgHeight;
                doc.addPage();
                doc.addImage(imgData, 'PNG', 0, position, imgWidth, imgHeight);
                heightLeft -= pageHeight;
            }

            const fileName = `${tripData.title.replace(/[^a-z0-9]/gi, '_').toLowerCase()}_visual.pdf`;
            doc.save(fileName);

            return true;
        } catch (error) {
            console.error('Error generating visual PDF:', error);
            throw error;
        }
    }

    async loadHtml2Canvas() {
        return new Promise((resolve, reject) => {
            const script = document.createElement('script');
            script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
            script.onload = resolve;
            script.onerror = reject;
            document.head.appendChild(script);
        });
    }
}

// Global function for PDF export
async function generatePDF(tripData) {
    if (!window.pdfExporter) {
        window.pdfExporter = new PDFExporter();
    }
    
    try {
        await window.pdfExporter.generatePDF(tripData);
        
        // Show success message
        const successElement = document.createElement('div');
        successElement.className = 'pdf-success';
        successElement.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: #d4edda;
            color: #155724;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            border: 1px solid #c3e6cb;
            z-index: 1001;
            animation: slideIn 0.3s ease;
        `;
        successElement.innerHTML = `
            <i class="fas fa-check-circle"></i>
            PDF downloaded successfully!
        `;
        
        document.body.appendChild(successElement);
        
        setTimeout(() => {
            if (successElement.parentNode) {
                successElement.remove();
            }
        }, 3000);
        
    } catch (error) {
        console.error('PDF generation failed:', error);
        alert('Failed to generate PDF. Please try again.');
    }
}

// Initialize PDF exporter
document.addEventListener('DOMContentLoaded', () => {
    window.pdfExporter = new PDFExporter();
});