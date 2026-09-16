// Initialize Map
const map = L.map('map').setView([20.5937, 78.9629], 5); // Default view (India)

// Add OpenStreetMap tiles
L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    maxZoom: 18,
    attribution: '© OpenStreetMap contributors'
}).addTo(map);

let locations = [];

// Marker colors mapping according to your design specification
function getColor(risk) {
    if (risk >= 75) return "#d64545"; // Red
    if (risk >= 50) return "#e07828"; // Orange
    if (risk >= 30) return "#e5b83d"; // Yellow
    return "#3eae74";                 // Green
}

// Fetch Monitored Locations from Backend
async function fetchLocations() {
    try {
        const res = await fetch('http://localhost:3000/api/locations');
        locations = await res.json();

        updateDashboardStats();
        renderMarkersAndList();
    } catch (err) {
        console.error("Failed to load locations from backend:", err);
    }
}

// Render Map Markers & Dynamic Location Cards
function renderMarkersAndList() {
    const locationListEl = document.getElementById('locationList');
    locationListEl.innerHTML = '';

    locations.forEach(location => {
        // Add circle marker to Leaflet map
        const marker = L.circleMarker(location.position, {
            radius: 10,
            fillColor: getColor(location.risk),
            color: "#ffffff",
            weight: 3,
            fillOpacity: 0.9
        }).addTo(map);

        marker.bindPopup(`
      <strong>${location.name}</strong><br>
      Temperature: <b>${location.temp}°C</b><br>
      Risk Score: <b>${location.risk}%</b><br>
      Status: <b>${location.level}</b>
    `);

        // Add card to bottom locations grid
        const item = document.createElement('div');
        item.className = 'location-item';
        item.innerHTML = `
      <strong>${location.name}</strong>
      <span>Temp: ${location.temp} °C</span>
      <span>Risk: <strong>${location.risk}\%</strong> (${location.level})</span>
    `;
        locationListEl.appendChild(item);
    });
}

// Dynamic Stats Counter Update
function updateDashboardStats() {
    document.getElementById('totalZones').innerText = locations.length;
    document.getElementById('highRiskZones').innerText = locations.filter(l => l.risk >= 75).length;
    document.getElementById('modRiskZones').innerText = locations.filter(l => l.risk >= 50 && l.risk < 75).length;
}

// Handle City Search via Backend API
document.getElementById('searchBtn').addEventListener('click', async () => {
    const city = document.getElementById('cityInput').value.trim();
    if (!city) return alert("Please enter a city name");

    try {
        const response = await fetch(`http://localhost:3000/api/weather/search?city=${encodeURIComponent(city)}`);
        const data = await response.json();

        if (response.status !== 200) {
            return alert(data.error || "City search failed");
        }

        // Update Result Card UI in Sidebar
        document.getElementById('cityResultCard').style.display = 'flex';
        document.getElementById('resCityName').innerText = data.name;
        document.getElementById('resTemp').innerText = `${data.temp} °C`;
        document.getElementById('resRisk').innerText = `${data.risk} %`;

        const badge = document.getElementById('resStatusBadge');
        badge.innerText = data.level;
        badge.style.backgroundColor = getColor(data.risk);

        // Fly map to selected city
        map.flyTo(data.position, 10);

        // Add dynamic marker for searched location
        const searchMarker = L.circleMarker(data.position, {
            radius: 12,
            fillColor: getColor(data.risk),
            color: "#ffffff",
            weight: 4,
            fillOpacity: 1
        }).addTo(map);

        searchMarker.bindPopup(`
      <strong>${data.name}</strong><br>
      Temperature: <b>${data.temp}°C</b><br>
      Landslide Risk: <b>${data.risk}\%</b> (${data.level})
    `).openPopup();

        // Optionally add searched item to location state list
        locations.push(data);
        updateDashboardStats();

    } catch (error) {
        console.error("Search failed:", error);
        alert("Error searching city details.");
    }
});

// Initial load
fetchLocations();