/**
 * MMM-Multi-Wind Node Helper
 */

const NodeHelper = require("node_helper");
const https = require("https");

module.exports = NodeHelper.create({
    start: function() {
        console.log("Starting node helper for: " + this.name);
        this.headers = {
            yr: {
                "User-Agent": "MagicMirror-Multi-Wind/1.0.0 github.com/christian-gillinger/MMM-Multi-Wind",
                "Accept": "application/json"
            },
            smhi: {
                "Accept": "application/json",
                "User-Agent": "MagicMirror-Multi-Wind/1.0.0"
            }
        };
    },

    getWindData: function(config) {
        const provider = config.provider || "smhi";
        const url = this.getProviderUrl(config);
        
        console.log(`Fetching wind data from ${provider.toUpperCase()} API:`, url);

        const options = {
            headers: this.headers[provider],
            timeout: 10000
        };

        const request = https.get(url, options, (resp) => {
            const { statusCode } = resp;
            const contentType = resp.headers['content-type'];

            console.log(`Response status: ${statusCode}`);
            console.log(`Content-Type: ${contentType}`);

            if (statusCode !== 200) {
                console.error(`Request Failed. Status Code: ${statusCode}`);
                resp.resume();
                this.sendSocketNotification("WIND_DATA_ERROR");
                return;
            }

            let rawData = '';

            resp.on('data', (chunk) => {
                rawData += chunk;
            });

            resp.on('end', () => {
                try {
                    const jsonData = JSON.parse(rawData);
                    console.log(`Successfully received data from ${provider}`);
                    
                    const windData = this.parseProviderData(jsonData, provider);
                    console.log(`Parsed wind data:`, windData);
                    
                    this.sendSocketNotification("WIND_DATA", windData);
                } catch (e) {
                    console.error(`Error parsing ${provider} response:`, e.message);
                    console.error("Raw response:", rawData.substring(0, 500));
                    this.sendSocketNotification("WIND_DATA_ERROR");
                }
            });
        });

        request.on('error', (err) => {
            console.error(`Error making request to ${provider}:`, err.message);
            this.sendSocketNotification("WIND_DATA_ERROR");
        });

        request.on('timeout', () => {
            console.error(`Request to ${provider} timed out`);
            request.abort();
            this.sendSocketNotification("WIND_DATA_ERROR");
        });
    },

    formatCoordinate: function(coord) {
        // Ensure coord is a number and has max 6 decimals
        const numCoord = typeof coord === 'string' ? parseFloat(coord) : coord;
        return numCoord.toFixed(6);
    },

    getProviderUrl: function(config) {
        // Convert string coordinates to numbers
        const lat = parseFloat(config.lat);
        const lon = parseFloat(config.lon);
        const altitude = parseInt(config.altitude || 0);
        const provider = config.provider;
        
        if (provider === "yr") {
            return `https://api.met.no/weatherapi/locationforecast/2.0/complete?altitude=${altitude}&lat=${lat}&lon=${lon}`;
        } else {
            // SMHI requires specific coordinate formatting
            const formattedLon = this.formatCoordinate(lon);
            const formattedLat = this.formatCoordinate(lat);
            return `https://opendata-download-metfcst.smhi.se/api/category/pmp3g/version/2/geotype/point/lon/${formattedLon}/lat/${formattedLat}/data.json`;
        }
    },

    parseProviderData: function(data, provider) {
        try {
            if (provider === "yr") {
                return this.parseYrData(data);
            } else {
                return this.parseSmhiData(data);
            }
        } catch (error) {
            console.error(`Error parsing ${provider} data:`, error);
            throw error;
        }
    },

    parseYrData: function(data) {
        if (!data?.properties?.timeseries?.[0]?.data?.instant?.details) {
            throw new Error("Invalid YR data structure");
        }
        
        const details = data.properties.timeseries[0].data.instant.details;
        return {
            windSpeed: details.wind_speed,
            windDirection: details.wind_from_direction
        };
    },

    parseSmhiData: function(data) {
        if (!data?.timeSeries?.[0]?.parameters) {
            throw new Error("Invalid SMHI data structure");
        }

        const currentData = data.timeSeries[0];
        const windSpeed = currentData.parameters.find(p => p.name === "ws")?.values?.[0];
        const windDirection = currentData.parameters.find(p => p.name === "wd")?.values?.[0];

        if (typeof windSpeed !== 'number' || typeof windDirection !== 'number') {
            throw new Error("Missing wind parameters");
        }

        return { windSpeed, windDirection };
    },

    socketNotificationReceived: function(notification, payload) {
        if (notification === "GET_WIND_DATA") {
            this.getWindData(payload);
        }
    }
});
