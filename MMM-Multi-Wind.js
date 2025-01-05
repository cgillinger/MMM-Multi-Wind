/* MMM-Multi-Wind.js
 * 
 * Magic Mirror Module for displaying wind data from multiple providers
 * Supports SMHI (Swedish Meteorological and Hydrological Institute) 
 * and YR (Norwegian Meteorological Institute)
 * 
 * Version: 2.1.0
 * 
 * Version history:
 * 2.1.0 - 2024-01-05
 *       - Added dedicated Beaufort scale icons when using Beaufort display type
 *       - Enhanced icon selection logic with separate Beaufort handling
 *       - Improved documentation and code organization
 * 2.0.0 - 2024-01-05
 *       - Added support for all Nordic languages
 *       - Implemented nautical wind direction terms
 *       - Enhanced error handling and logging
 *       - Improved data refresh reliability
 * 1.0.0 - Initial version with support for SMHI and YR
 *       - Basic English and Swedish translations
 *       - Provider selection in config
 *       - Unified data handling
 * 
 * @author Christian Gillinger
 * @license MIT
 */

Module.register("MMM-Multi-Wind", {
    // Default configuration options
    defaults: {
        lat: 57.7089,        // Default latitude (Göteborg)
        lon: 11.9746,        // Default longitude (Göteborg)
        provider: "smhi",    // Weather data provider ("smhi" or "yr")
        updateInterval: 30 * 60 * 1000,  // Update every 30 minutes
        animationSpeed: 1000, // Animation speed for UI updates
        directionType: 'compass',    // Display wind direction as 'compass' or 'degrees'
        displayType: 'textsea',      // Wind speed display: 'textsea', 'beaufort', or 'ms'
        iconOnly: false,             // Show only icons without text labels
        language: 'en',              // 'en', 'sv', 'da', 'no', 'fi', or 'is'
        layout: 'vertical',          // Module layout: 'vertical' or 'horizontal'
        altitude: 0,                 // Location altitude (meters), required for YR
        retryDelay: 2000,           // Delay before retrying failed requests (ms)
        maxRetries: 3               // Maximum number of retry attempts
    },

    // Required external CSS files
    getStyles: function() {
        return [
            "weather-icons.css",     // Weather icon font
            "font-awesome.css",      // General icons
            this.file("css/MMM-Multi-Wind.css") // Module-specific styles
        ];
    },

    // Load translations for all supported languages
    getTranslations: function() {
        return {
            en: "translations/en.json",  // English
            sv: "translations/sv.json",  // Swedish
            da: "translations/da.json",  // Danish
            no: "translations/no.json",  // Norwegian
            fi: "translations/fi.json",  // Finnish
            is: "translations/is.json"   // Icelandic
        };
    },

    // Initialize the module
    start: function() {
        Log.info("Starting module: " + this.name);
        
        // Initialize module state
        this.loaded = false;
        this.windData = null;
        this.retryCount = 0;
        this.lastUpdateTime = null;
        
        // Validate configuration
        this.validateConfig();
        
        // Start data polling
        this.scheduleUpdate();
    },

    // Validate configuration settings
    validateConfig: function() {
        // Ensure latitude is within valid range
        this.config.lat = Math.min(Math.max(this.config.lat, -90), 90);
        
        // Ensure longitude is within valid range
        this.config.lon = Math.min(Math.max(this.config.lon, -180), 180);
        
        // Validate provider selection
        if (!["smhi", "yr"].includes(this.config.provider)) {
            Log.warn("Invalid provider specified, defaulting to SMHI");
            this.config.provider = "smhi";
        }

        // Validate language selection
        const validLanguages = ["en", "sv", "da", "no", "fi", "is"];
        if (!validLanguages.includes(this.config.language)) {
            Log.warn("Invalid language specified, defaulting to English");
            this.config.language = "en";
        }
    },

    // Schedule regular updates
    scheduleUpdate: function() {
        // Initial data fetch
        this.getData();
        
        // Set up regular polling
        setInterval(() => {
            this.getData();
        }, this.config.updateInterval);
    },

    // Request wind data from node_helper
    getData: function() {
        if (this.retryCount >= this.config.maxRetries) {
            Log.error("Maximum retry attempts reached");
            return;
        }

        this.sendSocketNotification("GET_WIND_DATA", {
            provider: this.config.provider,
            lat: this.config.lat,
            lon: this.config.lon,
            altitude: this.config.altitude
        });
    },

    // Convert wind speed to descriptive text
    getTextSea: function(speed) {
        if (speed >= 32.7) return this.translate("HURRICANE");
        if (speed >= 24.5) return this.translate("STORM");
        if (speed >= 13.9) return this.translate("GALE");
        if (speed >= 0.3) return this.translate("BREEZE");
        return this.translate("CALM");
    },

    // Get Beaufort-specific icon based on wind speed
    getBeaufortIcon: function(speed) {
        const force = this.getBeaufortForce(speed);
        return `wi-wind-beaufort-${force}`; // Uses Weather Icons' built-in Beaufort icons
    },

    // Get appropriate weather icon based on wind speed and display type
    getWindIcon: function(speed) {
        // Use Beaufort icons when displayType is 'beaufort'
        if (this.config.displayType === 'beaufort') {
            return this.getBeaufortIcon(speed);
        }
        
        // Use standard wind icons for other display types
        if (speed <= 0.2) return 'wi-cloud';
        if (speed <= 3.3) return 'wi-windy';
        if (speed <= 13.8) return 'wi-strong-wind';
        if (speed <= 24.4) return 'wi-gale-warning';
        if (speed <= 32.6) return 'wi-storm-warning';
        return 'wi-hurricane-warning';
    },

    // Convert degrees to direction icon
    getDirectionIcon: function(degrees) {
        if (degrees === 0) return 'wi-na';
        
        // Normalize degrees to 0-360 range
        const normalizedDegrees = ((degrees % 360) + 360) % 360;
        
        // Convert degrees to cardinal direction icon
        if (normalizedDegrees > 337.5 || normalizedDegrees <= 22.5) return 'wi-direction-down';
        if (normalizedDegrees <= 67.5) return 'wi-direction-down-left';
        if (normalizedDegrees <= 112.5) return 'wi-direction-left';
        if (normalizedDegrees <= 157.5) return 'wi-direction-up-left';
        if (normalizedDegrees <= 202.5) return 'wi-direction-up';
        if (normalizedDegrees <= 247.5) return 'wi-direction-up-right';
        if (normalizedDegrees <= 292.5) return 'wi-direction-right';
        if (normalizedDegrees <= 337.5) return 'wi-direction-down-right';
        
        return 'wi-na';
    },

    // Convert wind speed to Beaufort scale
    getBeaufortForce: function(speed) {
        const beaufortScale = [
            { max: 0.2, force: 0 },  // Calm
            { max: 1.5, force: 1 },  // Light air
            { max: 3.3, force: 2 },  // Light breeze
            { max: 5.4, force: 3 },  // Gentle breeze
            { max: 7.9, force: 4 },  // Moderate breeze
            { max: 10.7, force: 5 }, // Fresh breeze
            { max: 13.8, force: 6 }, // Strong breeze
            { max: 17.1, force: 7 }, // High wind
            { max: 20.7, force: 8 }, // Gale
            { max: 24.4, force: 9 }, // Strong gale
            { max: 28.4, force: 10 }, // Storm
            { max: 32.6, force: 11 }, // Violent storm
            { max: Infinity, force: 12 } // Hurricane
        ];

        return beaufortScale.find(scale => speed <= scale.max).force;
    },

    // Convert degrees to compass direction
    getWindDirection: function(degrees) {
        if (degrees === 0) return "N/A";

        if (this.config.directionType === 'compass') {
            // Define direction ranges
            const directions = [
                { min: 337.5, max: 22.5, dir: "N" },
                { min: 22.5, max: 67.5, dir: "NE" },
                { min: 67.5, max: 112.5, dir: "E" },
                { min: 112.5, max: 157.5, dir: "SE" },
                { min: 157.5, max: 202.5, dir: "S" },
                { min: 202.5, max: 247.5, dir: "SW" },
                { min: 247.5, max: 292.5, dir: "W" },
                { min: 292.5, max: 337.5, dir: "NW" }
            ];

            // Normalize degrees to 0-360 range
            const normalizedDegrees = ((degrees % 360) + 360) % 360;

            // Find matching direction
            const direction = directions.find(dir => 
                (dir.min < dir.max && normalizedDegrees >= dir.min && normalizedDegrees < dir.max) ||
                (dir.min > dir.max && (normalizedDegrees >= dir.min || normalizedDegrees < dir.max))
            );

            // Translate direction to current language
            return this.translate(direction ? direction.dir : "N");
        } else {
            // Return degrees if not using compass directions
            return degrees + "°";
        }
    },

    // Generate module's DOM
    getDom: function() {
        const wrapper = document.createElement("div");
        wrapper.className = `small wind-${this.config.layout}`;

        // Handle loading state
        if (!this.loaded) {
            wrapper.innerHTML = this.translate("LOADING");
            wrapper.className = "dimmed light small";
            return wrapper;
        }

        // Handle error state
        if (!this.windData) {
            wrapper.innerHTML = this.translate("ERROR");
            wrapper.className = "dimmed light small";
            return wrapper;
        }

        // Create wind speed element
        const windSpeedDiv = document.createElement("div");
        windSpeedDiv.className = "wind-speed";
        
        // Format wind speed based on display type
        let speedValue;
        switch(this.config.displayType) {
            case 'textsea':
                speedValue = this.getTextSea(this.windData.windSpeed);
                break;
            case 'beaufort':
                speedValue = this.getBeaufortForce(this.windData.windSpeed) + 
                           " " + this.translate("BEAUFORT");
                break;
            default: // 'ms'
                speedValue = this.windData.windSpeed + " " + this.translate("MS");
        }
        
        // Add wind speed content
        windSpeedDiv.innerHTML = `
            <i class="wi ${this.getWindIcon(this.windData.windSpeed)}"></i>
            ${this.config.iconOnly ? speedValue : this.translate("WIND_SPEED") + ": " + speedValue}
        `;
        
        // Create wind direction element
        const windDirDiv = document.createElement("div");
        windDirDiv.className = "wind-direction";
        const direction = this.getWindDirection(this.windData.windDirection);
        windDirDiv.innerHTML = `
            <i class="wi ${this.getDirectionIcon(this.windData.windDirection)}"></i>
            ${this.config.iconOnly ? direction : this.translate("WIND_DIRECTION") + ": " + direction}
        `;

        // Add elements to wrapper
        wrapper.appendChild(windSpeedDiv);
        wrapper.appendChild(windDirDiv);

        return wrapper;
    },

    // Handle socket notifications from node_helper
    socketNotificationReceived: function(notification, payload) {
        switch(notification) {
            case "WIND_DATA":
                this.loaded = true;
                this.windData = payload;
                this.lastUpdateTime = new Date();
                this.retryCount = 0;
                this.updateDom(this.config.animationSpeed);
                break;
                
            case "WIND_DATA_ERROR":
                Log.error("Failed to fetch wind data");
                this.loaded = true;
                this.windData = null;
                this.retryCount++;
                
                // Attempt retry if under max retry count
                if (this.retryCount < this.config.maxRetries) {
                    setTimeout(() => {
                        Log.info(`Retrying wind data fetch (attempt ${this.retryCount + 1})`);
                        this.getData();
                    }, this.config.retryDelay);
                }
                
                this.updateDom(this.config.animationSpeed);
                break;
        }
    }
});
