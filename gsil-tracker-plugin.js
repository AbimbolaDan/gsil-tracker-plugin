/**
 * GSIL Logistics Tracker Plugin
 * Author: Abimbola Daniel
 * Version: 1.0.0
 */

(function() {
    // 1. CSS Injection - This ensures the plugin styles are loaded automatically
    // Change this URL to your GitHub Raw / CDN link once you've pushed the CSS file
    // const CSS_URL = 'https://cdn.jsdelivr.net/gh/YOUR_USERNAME/YOUR_REPO/styling.css';
    const CSS_URL = 'https://cdn.jsdelivr.net/gh/AbimbolaDan/Shipment-tracker/styling.css';
    
    if (!document.querySelector(`link[href="${CSS_URL}"]`)) {
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = CSS_URL;
        document.head.appendChild(link);
    }

    // 2. Initialization Function
    function initGSILTracker() {
        const root = document.getElementById('gsil-tracker-root');
        if (!root) return;

        // Inject the HTML structure into the root element
        root.innerHTML = `
            <div class="gsil-plugin-container">
                <div class="content-wrapper">
                    <form id="track-form">
                        <label for="Number" id="track">Track your Shipment</label>
                        <div class="input-div">
                            <input type="text" id="Number" placeholder="E.g 123456789">
                            <button type="submit" id="track-btn">Track</button>
                        </div>
                    </form>
                    <div id="map-hero" class="hidden"></div>
                    <div id="tracking-results" class="hidden"></div>
                </div>
            </div>
        `;

        const track_form = root.querySelector('#track-form');
        const input = root.querySelector('#Number');
        const tracking_result = root.querySelector('#tracking-results');
        const mapHero = root.querySelector('#map-hero');

        // Clear UI when input is emptied
        input.addEventListener('input', () => {
            if (input.value.trim() === "") {
                tracking_result.classList.add('hidden');
                mapHero.classList.add('hidden');
            }
        });

        // Main Tracking Logic
        track_form.addEventListener('submit', (e) => {
            e.preventDefault();
            const inputvalue = input.value.trim();

            if (inputvalue === "") {
                alert('Please input a Shipment ID');
                return;
            }

            const allShipments = JSON.parse(localStorage.getItem('gsil_shipments')) || [];
            const foundShipment = allShipments.find(s => s.id === inputvalue);

            if (!foundShipment) {
                alert('Invalid Shipment ID. Please check with the GSIL Admin.');
                return;
            }

            renderResults(foundShipment, tracking_result, mapHero);
        });
    }

    // 3. UI Rendering Logic
    function renderResults(data, container, mapContainer) {
        const estDateObj = new Date(data.estimatedDate);
        const today = new Date();
        const isDelayed = today > estDateObj && data.status !== 'Delivered';

        container.innerHTML = `
            <div class="reveal">
                <div class="result-box">
                    <div class="Shipment-Details">
                        <p class="S-id">Shipment ID: <span>${data.id}</span></p>
                        <p class="status-badge ${data.status.toLowerCase()}">${data.status}</p>
                        ${isDelayed ? '<p class="delay-alert">⚠️ Delayed</p>' : ''}
                    </div>
                    <div class="Expected">
                        <p class="expect">Expected delivery date</p>
                        <p class="Expect-Date">${estDateObj.toDateString()}</p>
                    </div>
                </div>

                <div class="History">
                    <h3>Tracking History</h3>
                    <div class="timeline">
                        ${data.history.map((item, index) => `
                            <div class="timeline-item ${index === data.history.length - 1 ? 'active' : ''}">
                                <div class="timeline-dot"></div>
                                <div class="timeline-content">
                                    <p class="time-loc">${item.location}</p>
                                    <p class="time-status">${item.status}</p>
                                    <p class="time-date">${new Date(item.time).toLocaleString()}</p>
                                </div>
                            </div>
                        `).join('')}
                    </div>
                </div>
            </div>
        `;

        container.classList.remove('hidden');
        mapContainer.classList.remove('hidden');
        
        // Leaflet Map Initialization
        initMap(data, mapContainer.id);
    }

    async function initMap(data, elementId) {
        const originName = data.history[0].location;
        const destinationName = data.location;

        try {
            const [originRes, destRes] = await Promise.all([
                fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(originName)}`),
                fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destinationName)}`)
            ]);

            const originData = await originRes.json();
            const destData = await destRes.json();
            
            if (originData.length === 0 || destData.length === 0) return;

            const originCoords = [parseFloat(originData[0].lat), parseFloat(originData[0].lon)];
            const destCoords = [parseFloat(destData[0].lat), parseFloat(destData[0].lon)];

            // Initialize map if not already done, or update it
            if (window.gsilMap) { window.gsilMap.remove(); }

            window.gsilMap = L.map(elementId).setView(destCoords, 3);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(window.gsilMap);

            L.marker(originCoords).addTo(window.gsilMap).bindPopup(`<b>Origin:</b> ${originName}`);
            L.marker(destCoords).addTo(window.gsilMap).bindPopup(`<b>Destination:</b> ${destinationName}`).openPopup();

            L.polyline([originCoords, destCoords], {
                color: '#EF4444',
                weight: 3,
                dashArray: '10, 10'
            }).addTo(window.gsilMap);

            window.gsilMap.fitBounds(L.latLngBounds([originCoords, destCoords]));
        } catch (err) {
            console.error("Map loading error:", err);
        }
    }

    // Run when DOM is ready
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', initGSILTracker);
    } else {
        initGSILTracker();
    }
})();