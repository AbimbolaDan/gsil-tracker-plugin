const track_form = document.getElementById('track-form');
const input = document.getElementById('Number');
const tracking_result = document.getElementById('tracking-results');
const mapHero = document.getElementById('map-hero');
const loadingOverlay = document.getElementById('loading-overlay');

const API_BASE_URL = "https://logistics-tracker-sxg2.onrender.com/api";

input.addEventListener('input', () => {
    if (input.value.trim() === "") {
        tracking_result.classList.add('hidden');
        tracking_result.classList.remove('reveal');
        if (mapHero) mapHero.classList.add('hidden');
    }
});

track_form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const inputvalue = input.value.trim();

    if (inputvalue === "") {
        alert('Please enter a Shipment ID');
        return;
    }

    // --- 5-SECOND TIMEOUT ---
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    loadingOverlay.classList.remove('hidden');

    try {
        const response = await fetch(`${API_BASE_URL}/shipments/${inputvalue}`, {
            signal: controller.signal 
        });
        
        clearTimeout(timeoutId);

        if (!response.ok) {
            loadingOverlay.classList.add('hidden');
            alert('Shipment ID not found. Please verify your tracking number.');
            return;
        }

        const foundShipment = await response.json();

        // LOGIC: Estimated Date & Delay Warning
        const estDateObj = new Date(foundShipment.estimatedDate);
        const today = new Date();
        const isDelayed = today > estDateObj && foundShipment.status !== 'Delivered';

        // LOGIC: Status Colors
        let currentColor = 'var(--primary-blue)';
        const sLower = (foundShipment.status || "").toLowerCase();
        if (sLower.includes('out for delivery')) currentColor = 'var(--primary-red)';
        else if (sLower.includes('in transit')) currentColor = 'var(--primary-yellow)';
        else if (sLower.includes('delivered')) currentColor = 'var(--primary-green)';

        // LOGIC: Timeline Construction
        const timelineHTML = (foundShipment.history || []).map((item) => {
            let dotClass = 'dot-blue';
            const itemStatus = (item.status || "").toLowerCase();
            if (itemStatus.includes('delivered')) dotClass = 'dot-green';
            else if (itemStatus.includes('in transit')) dotClass = 'dot-yellow';
            else if (itemStatus.includes('out for delivery')) dotClass = 'dot-red';

            return `
                <div class="timeline-item done">
                    <div class="timeline-dot ${dotClass}"></div>
                    <div class="timeline-content">
                        <h4>${item.status}</h4>
                        <p class="timeline-meta">${item.location} ${item.time ? '— ' + item.time : ''}</p>
                        <p class="timeline-remark">"${item.remarks || ''}"</p>
                    </div>
                </div>
            `;
        }).join('');

        // INJECTING YOUR ORIGINAL DESIGN
        tracking_result.innerHTML = `
            <div class="trackingcard">
                <h2 style="margin-bottom: 20px; font-weight: 800;"><span class='GS'>GSIL</span> Shipment Timeline</h2>
                <div class="result-box">
                    <div class="timeline-container" style="flex: 2;">
                        ${timelineHTML}
                    </div>
                    <div class="status_container">
                        <h3 style="border-bottom: 2px solid var(--primary-yellow); padding-bottom: 8px; margin-bottom: 15px;">Current Status</h3>
                        
                        <p style="font-size: 0.8rem; color: var(--text-muted);">Status:</p>
                        <h4 style="color: ${currentColor}; margin-bottom: 15px; font-size: 1.3rem;">${foundShipment.status}</h4>

                        <p style="font-size: 0.8rem; color: var(--text-muted);">Current Location:</p>
                        <p style="font-weight: 600; margin-bottom: 15px;">${foundShipment.location}</p>

                        <div style="background: white; padding: 12px; border-radius: 8px; border-left: 4px solid var(--primary-yellow);">
                            <p style="font-size: 0.8rem; color: var(--text-muted); margin: 0;">Remarks:</p>
                            <p style="font-size: 0.85rem; font-style: italic;">${foundShipment.remarks || 'Updating status...'}</p>
                        </div>

                        <div style="margin-top: 20px;">
                            <p style="font-size: 0.8rem; color: var(--text-muted);">Last Updated:</p>
                            <p style="font-weight: bold; color: var(--primary-blue); font-size: 1.1rem;">${foundShipment.date || 'Live'}</p>
                        </div>
                    </div>
                </div>

                <div class="est-delivery-box" style="margin-top: 25px; padding: 15px; background: #fffbe6; border-radius: 8px; border: 1px solid #ffe58f;">
                    <p style="margin: 0; color: var(--text-dark); text-align: center;">
                        Estimated Delivery: <strong>${foundShipment.estimatedDate || 'TBD'}</strong>
                    </p>
                    ${isDelayed ? '<p style="color: var(--primary-red); font-weight: bold; text-align: center; margin-top: 5px;">⚠️ Shipment Delayed</p>' : ''}
                </div>

                <div class="link-back" style="text-align: center; margin-top: 30px;">
                    <a href="Admin.html" class="back">Back to Home</a>
                </div>
            </div>
        `;

        // REVEAL UI
        tracking_result.classList.remove('hidden');
        tracking_result.classList.add('reveal');
        mapHero.classList.remove('hidden');
        loadingOverlay.classList.add('hidden'); // Close loader first for map visibility

        // MAP INITIALIZATION
        setTimeout(async () => {
            await initGlobalMap(foundShipment.departure, foundShipment.location);
        }, 400);

    } catch (error) {
        loadingOverlay.classList.add('hidden');
        if (error.name === 'AbortError') {
            alert("Request timed out (5s limit). Please check your connection.");
        } else {
            console.error("Connection Error:", error);
            alert("Failed to reach the tracking server.");
        }
    }
});

async function initGlobalMap(originName, currentLocationName) {
    const mapContainer = document.getElementById('map-hero');
    try {
        const container = L.DomUtil.get('map-hero');
        if (container != null) { 
            container._leaflet_id = null; 
            container.innerHTML = ""; 
        }

        // Map-specific timeout for geocoding (4 seconds)
        const mapController = new AbortController();
        const mapTimeoutId = setTimeout(() => mapController.abort(), 4000);

        const [originRes, currentRes] = await Promise.all([
            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(originName)}`, { signal: mapController.signal }),
            fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(currentLocationName)}`, { signal: mapController.signal })
        ]);

        clearTimeout(mapTimeoutId);

        const originData = await originRes.json();
        const currentData = await currentRes.json();
        
        if (originData.length === 0 || currentData.length === 0) throw new Error("No Coords");

        const originCoords = [parseFloat(originData[0].lat), parseFloat(originData[0].lon)];
        const currentCoords = [parseFloat(currentData[0].lat), parseFloat(currentData[0].lon)];

        const map = L.map('map-hero').setView(currentCoords, 5);

        setTimeout(() => { map.invalidateSize(); }, 200);

        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '© OpenStreetMap'
        }).addTo(map);

        L.marker(originCoords).addTo(map).bindPopup(`<b>Origin:</b> ${originName}`);
        L.marker(currentCoords).addTo(map).bindPopup(`<b>Current:</b> ${currentLocationName}`).openPopup();

        const polyline = L.polyline([originCoords, currentCoords], {
            color: '#3B3EA5', 
            weight: 3,
            dashArray: '5, 10'
        }).addTo(map);

        map.fitBounds(polyline.getBounds(), { padding: [40, 40] });

    } catch (error) {
        console.warn("Map block/timeout:", error);
        mapContainer.innerHTML = `
            <div style="height:100%; display:flex; flex-direction:column; align-items:center; justify-content:center; background:#f0f2ff; color:#3B3EA5; border-radius:12px; text-align:center; padding:20px; border:1px solid #d0d7ff;">
                <p style="font-size:1.5rem; margin-bottom:10px;">📍</p>
                <p style="font-weight:bold;">Map preview unavailable</p>
                <p style="font-size:0.85rem; color:#666;">Shipment Route: ${originName} ➔ ${currentLocationName}</p>
            </div>`;
    }
}