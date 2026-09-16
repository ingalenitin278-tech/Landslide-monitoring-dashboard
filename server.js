const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('.'));

function calculateLandslideRisk(temp, precipitation, windSpeed) {
    let risk = Math.min(100, Math.round((precipitation * 4.5) + (windSpeed * 0.8) + (temp > 25 ? 10 : 5)));
    let level = "Low";
    if (risk >= 75) level = "High";
    else if (risk >= 50) level = "Moderate";
    else if (risk >= 30) level = "Elevated";

    return { risk, level };
}

app.get('/api/weather/search', async (req, res) => {
    const city = req.query.city;
    if (!city) return res.status(400).json({ error: "City query is required" });

    try {
        const geoRes = await fetch(`https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1&language=en&format=json`);
        const geoData = await geoRes.json();

        if (!geoData.results || geoData.results.length === 0) {
            return res.status(404).json({ error: "City not found" });
        }

        const location = geoData.results[0];
        const { latitude, longitude, name, country } = location;

        const weatherRes = await fetch(`https://api.open-meteo.com/v1/forecast?latitude=${latitude}&longitude=${longitude}&current=temperature_2m,wind_speed_10m,precipitation`);
        const weatherData = await weatherRes.json();

        const current = weatherData.current || {};
        const temp = current.temperature_2m ?? 20;
        const precip = current.precipitation ?? 0;
        const wind = current.wind_speed_10m ?? 5;

        const { risk, level } = calculateLandslideRisk(temp, precip, wind);

        res.json({
            name: `${name}${country ? ', ' + country : ''}`,
            position: [latitude, longitude],
            temp: temp,
            windSpeed: wind,
            precipitation: precip,
            risk: risk,
            level: level
        });
    } catch (error) {
        console.error("Backend Error:", error);
        res.status(500).json({ error: "Internal Server Error" });
    }
});

app.get('/api/locations', (req, res) => {
    const defaultLocations = [
        { name: "Shimla, India", position: [31.1048, 77.1734], temp: 18.5, risk: 82, level: "High" },
        { name: "Darjeeling, India", position: [27.0410, 88.2663], temp: 16.2, risk: 65, level: "Moderate" },
        { name: "Wayanad, India", position: [11.6854, 76.1320], temp: 24.1, risk: 88, level: "High" },
        { name: "Dehradun, India", position: [30.3165, 78.0322], temp: 22.0, risk: 42, level: "Elevated" },
        { name: "Gangtok, India", position: [27.3389, 88.6065], temp: 15.0, risk: 25, level: "Low" }
    ];
    res.json(defaultLocations);
});

app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});