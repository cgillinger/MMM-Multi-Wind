/* MMM-Multi-Wind.js
 * 
 * Magic Mirror Module for displaying wind data from multiple providers (SMHI, YR)
 * By default supports SMHI (Swedish Meteorological and Hydrological Institute) 
 * and YR (Norwegian Meteorological Institute)
 * 
 * Version: 1.0.0
 * 
 * Version history:
 * 1.0.0 - Initial version with support for both SMHI and YR
 *       - Added provider selection in config
 *       - Unified data handling for both services
 *       - Maintained display consistency across providers
 * 
 * @author Christian Gillinger
 * @license MIT
 * 
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 * 
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 * 
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

Module.register("MMM-Multi-Wind", {
    // Default module config
    defaults: {
        lat: 57.7089,        // Default latitude (Göteborg)
        lon: 11.9746,        // Default longitude (Göteborg)
        provider: "smhi",    // Default provider ("smhi" or "yr")
        updateInterval: 30 * 60 * 1000,  // Update every 30 minutes
        animationSpeed: 1000,
        directionType: 'compass',    // 'compass' or 'degrees'
        displayType: 'textsea',      // 'textsea', 'beaufort', or 'ms'
        iconOnly: false,             // If true, shows only icons without labels
        language: 'en',              // 'en' or 'sv'
        layout: 'vertical',          // 'vertical' or 'horizontal'
        altitude: 0                  // Required for YR, defaults to 0
    },

    // Require external CSS files
    getStyles: function() {
        return [
            "weather-icons.css",
            "font-awesome.css",
            "MMM-Multi-Wind.css"
        ];
    },

    // Define translation files
    getTranslations: function() {
        return {
            en: "translations/en.json",
            sv: "translations/sv.json"
        };
    },

    // Initialize module
    start: function() {
        Log.info("Starting module: " + this.name);
        this.loaded = false;
        this.windData = null;
        
        // Initial data fetch
        this.sendSocketNotification("GET_WIND_DATA", {
            provider: this.config.provider,
            lat: this.config.lat,
            lon: this.config.lon,
            altitude: this.config.altitude
        });

        // Set up regular updates
        setInterval(() => {
            this.sendSocketNotification("GET_WIND_DATA", {
                provider: this.config.provider,
                lat: this.config.lat,
                lon: this.config.lon,
                altitude: this.config.altitude
            });
        }, this.config.updateInterval);
    },

    // Convert wind speed to text description
    getTextSea: function(speed) {
        if (speed >= 32.7) return this.translate("HURRICANE");
        if (speed >= 24.5) return this.translate("STORM");
        if (speed >= 13.9) return this.translate("GALE");
        if (speed >= 0.3) return this.translate("BREEZE");
        return this.translate("CALM");
    },

    // Get appropriate weather icon based on wind speed
    getWindIcon: function(speed) {
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
        
        const normalizedDegrees = ((degrees % 360) + 360) % 360;
        
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

    // Generate the module's DOM elements
    getDom: function() {
        const wrapper = document.createElement("div");
        wrapper.className = `small wind-${this.config.layout}`;

        if (!this.loaded) {
            wrapper.innerHTML = this.translate("LOADING");
            return wrapper;
        }

        if (!this.windData) {
            wrapper.innerHTML = this.translate("ERROR");
            return wrapper;
        }

        // Create wind speed element
        const windSpeedDiv = document.createElement("div");
        windSpeedDiv.className = "wind-speed";
        
        let speedValue;
        switch(this.config.displayType) {
            case 'textsea':
                speedValue = this.getTextSea(this.windData.windSpeed);
                break;
            case 'beaufort':
                speedValue = this.getBeaufortForce(this.windData.windSpeed) + " " + this.translate("BEAUFORT");
                break;
            default: // 'ms'
                speedValue = this.windData.windSpeed + " " + this.translate("MS");
        }
        
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

        wrapper.appendChild(windSpeedDiv);
        wrapper.appendChild(windDirDiv);

        return wrapper;
    },

    // Convert wind speed to Beaufort scale
    getBeaufortForce: function(speed) {
        if (speed >= 32.7) return 12;
        if (speed >= 28.5) return 11;
        if (speed >= 24.5) return 10;
        if (speed >= 20.8) return 9;
        if (speed >= 17.2) return 8;
        if (speed >= 13.9) return 7;
        if (speed >= 10.8) return 6;
        if (speed >= 8.0) return 5;
        if (speed >= 5.5) return 4;
        if (speed >= 3.4) return 3;
        if (speed >= 1.6) return 2;
        if (speed >= 0.3) return 1;
        return 0;
    },

    // Convert degrees to compass direction
    getWindDirection: function(degrees) {
        if (degrees === 0) {
            return "N/A";
        }

        if (this.config.directionType === 'compass') {
            const normalizedDegrees = ((degrees % 360) + 360) % 360;
            
            if (normalizedDegrees > 337.5 || normalizedDegrees <= 22.5) {
                return "N";
            } else if (normalizedDegrees > 22.5 && normalizedDegrees <= 67.5) {
                return "NE";
            } else if (normalizedDegrees > 67.5 && normalizedDegrees <= 112.5) {
                return "E";
            } else if (normalizedDegrees > 112.5 && normalizedDegrees <= 157.5) {
                return "SE";
            } else if (normalizedDegrees > 157.5 && normalizedDegrees <= 202.5) {
                return "S";
            } else if (normalizedDegrees > 202.5 && normalizedDegrees <= 247.5) {
                return "SW";
            } else if (normalizedDegrees > 247.5 && normalizedDegrees <= 292.5) {
                return "W";
            } else if (normalizedDegrees > 292.5 && normalizedDegrees <= 337.5) {
                return "NW";
            }
        } else {
            return degrees + "°";
        }
    },

    // Handle socket notifications from node_helper
    socketNotificationReceived: function(notification, payload) {
        if (notification === "WIND_DATA") {
            this.loaded = true;
            this.windData = payload;
            this.updateDom(this.config.animationSpeed);
        }
        if (notification === "WIND_DATA_ERROR") {
            this.loaded = true;
            this.windData = null;
            this.updateDom(this.config.animationSpeed);
        }
    }
});