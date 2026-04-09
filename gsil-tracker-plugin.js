(function() {
    const SETTINGS = {
        cssUrl: 'https://cdn.jsdelivr.net/gh/AbimbolaDan/gsil-tracker-plugin@Main/styling.css',
        rootId: 'gsil-tracker-root',
        storageKey: 'gsil_shipments'
    };

    function injectStyles() {
        if (!document.querySelector(`link[href="${SETTINGS.cssUrl}"]`)) {
            const link = document.createElement('link');
            link.rel = 'stylesheet';
            link.href = SETTINGS.cssUrl;
            document.head.appendChild(link);
        }
    }

    function initTracker() {
        const root = document.getElementById(SETTINGS.rootId);
        if (!root) return;

        root.innerHTML = `
            <div class="gsil-tracker-plugin">
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

        const form = root.querySelector('#track-form');
        const input = root.querySelector('#Number');
        const resultsDiv = root.querySelector('#tracking-results');
        const mapDiv = root.querySelector('#map-hero');

        input.addEventListener('input', () => {
            if (input.value.trim() === "") {
                resultsDiv.classList.add('hidden');
                mapDiv.classList.add('hidden');
            }
        });

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const inputvalue = input.value.trim();
            const allShipments = JSON.parse(localStorage.getItem(SETTINGS.storageKey)) || [];
            const foundShipment = allShipments.find(s => s.id === inputvalue);

            if (!foundShipment) return alert('Invalid Shipment ID.');

            renderTrackerUI(foundShipment, resultsDiv, mapDiv);
        });
    }

    function renderTrackerUI(shipment, container, mapHero) {
        const estDateObj = new Date(shipment.estimatedDate);
        const today = new Date();
        const isDelayed = today > estDateObj && shipment.status !== 'Delivered';

        let currentColor = 'var(--primary-blue)';
        const sLower = (shipment.status || "").toLowerCase();
        if (sLower.includes('out for delivery')) currentColor = 'var(--primary-red)';
        else if (sLower.includes('in transit')) currentColor = 'var(--primary-yellow)';
        else if (sLower.includes('delivered')) currentColor = 'var(--primary-green)';

        const timelineHTML = shipment.history.map((item) => {
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

        container.innerHTML = `
            <div class="reveal">
                <div class="trackingcard">
                    <h2 style="margin-bottom: 20px; font-weight: 800;"><span class='GS'>GSIL</span> Shipment Timeline</h2>
                    <div class="result-box">
                        <div class="timeline-container">
                            ${timelineHTML}
                        </div>
                        <div class="status_container">
                            <h3 style="border-bottom: 2px solid var(--primary-yellow); padding-bottom: 8px; margin-bottom: 15px;">Current Status</h3>
                            <h4 style="color: ${currentColor}; font-size: 1.3rem;">${shipment.status}</h4>
                            <p><strong>Location:</strong> ${shipment.location}</p>
                            <p><strong>Remarks:</strong> <em>${shipment.remarks || 'Processing...'}</em></p>
                        </div>
                    </div>
                    <div class="est-delivery-box">
                        <p class="Expect-Date">Estimated Delivery: <strong>${shipment.estimatedDate || 'TBD'}</strong></p>
                        ${isDelayed ? '<p style="color:red; font-weight:bold;">⚠️ Delayed</p>' : ''}
                    </div>
                </div>
            </div>
        `;

        container.classList.remove('hidden');
        mapHero.classList.remove('hidden');
        initGlobalMap(shipment.history[0].location, shipment.location, shipment.status);
    }

    async function initGlobalMap(originName, destinationName, currentStatus) {
        try {
            const container = L.DomUtil.get('map-hero');
            if (container != null) { container._leaflet_id = null; }

            const [originRes, destRes] = await Promise.all([
                fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(originName)}`),
                fetch(`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(destinationName)}`)
            ]);

            const originData = await originRes.json();
            const destData = await destRes.json();
            if (!originData.length || !destData.length) return;

            const originCoords = [parseFloat(originData[0].lat), parseFloat(originData[0].lon)];
            const destCoords = [parseFloat(destData[0].lat), parseFloat(destData[0].lon)];

            const map = L.map('map-hero').setView(destCoords, 3);
            L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);

            L.marker(originCoords).addTo(map).bindPopup(`Origin: ${originName}`);
            L.marker(destCoords).addTo(map).bindPopup(`Currently at: ${destinationName}`).openPopup();
            L.polyline([originCoords, destCoords], { color: 'var(--primary-red)', weight: 3, dashArray: '10, 10' }).addTo(map);
            map.fitBounds(L.latLngBounds([originCoords, destCoords]));
        } catch (e) { console.error("Map Error", e); }
    }

    injectStyles();
    window.addEventListener('load', initTracker);
})();