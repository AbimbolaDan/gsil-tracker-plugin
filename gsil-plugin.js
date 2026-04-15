(function() {

    const style = document.createElement('style');
    style.innerHTML = `
        :root {
            --primary-blue: #3B3EA5; --hover-blue: #1E1B9E;
            --primary-green: #22C55E; --hover-green: #1A9F4B;
            --primary-red: #EF4444; --hover-red: #D63030;
            --primary-yellow: #FFCC2A; --hover-yellow: #E6B800;
            --light-blue-bg: #F0F2FF; --text-dark: #1A1A2E;
            --text-muted: #646691; --border: #D8DAF0;
        }
        #gsil-tracker-plugin { width: 100%; max-width: 900px; margin: 0 auto; padding: 20px; font-family: 'Segoe UI', sans-serif; }
        .plugin-card { background: white; border-radius: 16px; padding: 30px; box-shadow: 0 10px 30px rgba(59, 62, 165, 0.1); border: 1px solid var(--border); }
        .input-group { display: flex; gap: 10px; margin-top: 15px; }
        #track-num { flex: 1; padding: 15px; border: 2px solid var(--border); border-radius: 10px; outline: none; font-size: 1rem; }
        #track-num:focus { border-color: var(--primary-blue); }
        #track-btn-plugin { padding: 15px 30px; background: var(--primary-blue); color: white; border: none; border-radius: 10px; cursor: pointer; font-weight: 700; transition: 0.3s; }
        #track-btn-plugin:hover { background: var(--hover-blue); transform: translateY(-2px); }
        #map-hero-plugin { width: 100%; height: 400px; border-radius: 12px; margin-top: 25px; display: none; border: 1px solid var(--border); }
        .results-area { margin-top: 25px; display: none; animation: fadeIn 0.6s ease forwards; }
        .spinner-plugin { width: 40px; height: 40px; border: 4px solid rgba(59,62,165,0.1); border-top: 4px solid var(--primary-blue); border-radius: 50%; animation: spin 1s linear infinite; margin: 20px auto; }
        @keyframes spin { 0% { transform: rotate(0deg); } 100% { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
        .timeline-item { border-left: 2px solid var(--primary-yellow); padding-left: 20px; margin-bottom: 20px; position: relative; }
        .timeline-dot { position: absolute; left: -9px; top: 0; width: 16px; height: 16px; border-radius: 50%; background: var(--primary-blue); border: 3px solid white; }
    `;
    document.head.appendChild(style);

    
    if (!document.getElementById('leaflet-css')) {
        const link = document.createElement('link');
        link.id = 'leaflet-css'; link.rel = 'stylesheet'; link.href = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';
        document.head.appendChild(link);
    }
    const script = document.createElement('script');
    script.src = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
    document.head.appendChild(script);

    // 3. BUILD THE HTML STRUCTURE
    const container = document.createElement('div');
    container.id = 'gsil-tracker-plugin';
    container.innerHTML = `
        <div class="plugin-card">
            <h2 style="color:var(--primary-blue); margin:0;">Track your Shipment</h2>
            <p style="color:var(--text-muted); margin-bottom:15px;">Enter your GSIL tracking number below</p>
            <div class="input-group">
                <input type="text" id="track-num" placeholder="E.g. GS882930">
                <button id="track-btn-plugin">Track</button>
            </div>
            <div id="plugin-loader" style="display:none;"><div class="spinner-plugin"></div></div>
            <div id="map-hero-plugin"></div>
            <div id="results-plugin" class="results-area"></div>
        </div>
    `;
    
  
    const target = document.querySelector('.active-page') || document.body;
    target.appendChild(container);

    
    const API_BASE_URL = "https://logistics-tracker-sxg2.onrender.com/api";
    let map = null;

    const handleTracking = async () => {
        const id = document.getElementById('track-num').value.trim();
        const resDiv = document.getElementById('results-plugin');
        const mapDiv = document.getElementById('map-hero-plugin');
        const loader = document.getElementById('plugin-loader');

        if (!id) return alert("Please enter a Shipment ID");

        loader.style.display = 'block';
        resDiv.style.display = 'none';
        mapDiv.style.display = 'none';

        try {
            const response = await fetch(`${API_BASE_URL}/shipments/${id}`);
            if (!response.ok) throw new Error("Not Found");
            const data = await response.json();

            
            const timeline = (data.history || []).map(h => `
                <div class="timeline-item">
                    <div class="timeline-dot"></div>
                    <strong style="color:var(--text-dark)">${h.status}</strong><br>
                    <small style="color:var(--text-muted)">${h.location} | ${h.time || ''}</small>
                </div>
            `).join('');

            resDiv.innerHTML = `
                <div style="margin-top:20px;">
                    <h3 style="color:var(--primary-blue)">Live Status</h3>
                    <div style="background:var(--light-blue-bg); padding:15px; border-radius:10px; margin-bottom:20px;">
                        <p style="margin:5px 0;"><strong>Current Status:</strong> ${data.status}</p>
                        <p style="margin:5px 0;"><strong>Expected Delivery:</strong> ${data.estimatedDate || 'TBA'}</p>
                    </div>
                    ${timeline}
                </div>
            `;

            loader.style.display = 'none';
            resDiv.style.display = 'block';
            mapDiv.style.display = 'block';

            if (window.L) {
                if (map) map.remove();
                map = L.map('map-hero-plugin').setView([6.5244, 3.3792], 4); 
                L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png').addTo(map);
                
            }

        } catch (err) {
            loader.style.display = 'none';
            alert("Shipment not found. Please verify the ID.");
        }
    };

    document.getElementById('track-btn-plugin').onclick = handleTracking;
})();