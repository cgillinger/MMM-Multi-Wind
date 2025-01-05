# MMM-Multi-Wind

A MagicMirror² module that displays wind conditions from either SMHI (Swedish Meteorological Institute) or YR (Norwegian Meteorological Institute). Perfect for sailors, windsurfers, or anyone interested in wind conditions!

## What Does It Look Like?

Default display (Swedish):
![MMM-Multi-Wind Screenshot](/screenshots/screenshot.png)

Norwegian display:

![MMM-Multi-Wind Norwegian](/screenshots/screenshot_no.png)

Danish display:

![MMM-Multi-Wind Danish](/screenshots/screenshot_da.png)

Beaufort scale display:

![MMM-Multi-Wind Beaufort](/screenshots/screenshot_beaufort.png)

## How It Works

This module fetches wind data from your chosen weather service (SMHI or YR) and displays:
- Wind speed (in various formats)
- Wind direction (as compass direction or degrees)
- Visual indicators that change color based on wind intensity

The data updates every 30 minutes by default, and you can choose how you want it displayed.

## Prerequisites

Before you begin, make sure you have:
1. A working MagicMirror² installation
2. Node.js version 12 or later
3. npm (usually comes with Node.js)
4. Basic knowledge of how to use terminal/command prompt

Not sure about these? Don't worry! Here are some helpful links:
- [How to install MagicMirror²](https://docs.magicmirror.builders/)
- [How to install Node.js](https://nodejs.org/)

## Installation

Here's how to install the module, step by step:

1. Navigate to your MagicMirror's modules folder:
```bash
cd ~/MagicMirror/modules
```

2. Clone this repository:
```bash
git clone https://github.com/christian-gillinger/MMM-Multi-Wind.git
```

3. Install dependencies:
```bash
cd MMM-Multi-Wind
npm install
```

## Configuration

### Basic Configuration

Add this to your `config/config.js` file in the `modules` array:

```javascript
{
    module: "MMM-Multi-Wind",
    position: "top_right",
    config: {
        provider: "smhi",  // Use "smhi" for Swedish locations, "yr" for everywhere else
        lat: 57.7089,      // Your latitude
        lon: 11.9746      // Your longitude
    }
}
```

### Provider Selection
- Use `provider: "smhi"` for locations within Sweden
- Use `provider: "yr"` for locations outside Sweden (YR has global coverage)

### Finding Your Coordinates

Not sure about your latitude and longitude? Here's how to find them:
1. Go to [Google Maps](https://www.google.com/maps)
2. Right-click your location
3. The coordinates will appear at the top of the menu

### All Configuration Options

Here's every option you can customize:

| Option           | Description                                  | Default Value     |
|-----------------|----------------------------------------------|------------------|
| `provider`      | Weather data provider ("smhi" or "yr")       | "smhi"          |
| `lat`           | Latitude                                     | 57.7089         |
| `lon`           | Longitude                                    | 11.9746         |
| `altitude`      | Altitude in meters (required for YR)         | 0               |
| `updateInterval`| How often to update (in milliseconds)        | 1800000 (30min) |
| `directionType` | How to show direction ("compass" or "degrees")| "compass"       |
| `displayType`   | Speed display ("textsea", "beaufort", "ms")  | "textsea"       |
| `iconOnly`      | Show only icons without text                 | false           |
| `layout`        | Display layout ("vertical" or "horizontal")   | "vertical"      |

### Language Support

The module follows MagicMirror's global language settings as defined in your `config.js`. It supports:
- English
- Swedish
- Danish
- Norwegian
- Finnish
- Icelandic

To change the language, update the global `language` setting in your MagicMirror's `config.js` file.

### Example Configurations

#### Basic Weather Station (Sweden)
```javascript
{
    module: "MMM-Multi-Wind",
    position: "top_right",
    config: {
        provider: "smhi",
        lat: 57.7089,
        lon: 11.9746,
        displayType: "ms",
        directionType: "compass"
    }
}
```

#### Sailor's Display
```javascript
{
    module: "MMM-Multi-Wind",
    position: "top_right",
    config: {
        provider: "yr",
        lat: 57.7089,
        lon: 11.9746,
        displayType: "beaufort",
        directionType: "degrees",
        updateInterval: 900000  // More frequent updates (15min)
    }
}
```

## Troubleshooting

### Common Issues and Solutions

1. **Module not appearing?**
   - Check your config.js for syntax errors
   - Look for errors in the console (press F2 in MagicMirror)
   - Verify your coordinates are valid

2. **No data showing?**
   - Verify your internet connection
   - Check if the weather service is accessible
   - Confirm your coordinates are in the correct format
   - NOTE: If using SMHI as provider, make sure your location is within Sweden. SMHI only provides data for Swedish locations. If you're outside Sweden, use "yr" as your provider instead.

3. **Getting 404 errors with SMHI?**
   - SMHI's weather service only covers locations within Sweden
   - If you're getting a 404 error, check your coordinates
   - For locations outside Sweden, change provider to "yr" in your config:
     ```javascript
     config: {
         provider: "yr",  // Use YR instead of SMHI for non-Swedish locations
         lat: your_latitude,
         lon: your_longitude
     }
     ```

4. **Wrong language?**
   - Check your MagicMirror's global language setting in config.js
   - Verify that the language is supported by the module

### Provider Coverage

- **SMHI**: Only provides data for locations within Sweden
- **YR**: Provides global coverage, use this for locations outside Sweden

### Getting Help

If you're stuck:
1. Check the console for error messages
2. Look through [existing issues](https://github.com/christian-gillinger/MMM-Multi-Wind/issues)
3. Create a new issue if needed

## Contributing

Want to help improve this module? Great! Here's how:

1. Fork the repository
2. Create a new branch for your feature
3. Make your changes
4. Submit a pull request

All contributions are welcome, especially:
- Bug fixes
- New features
- Documentation improvements
- Translations

## Version History

### 2.0.0
- Added support for all Nordic languages (Danish, Norwegian, Finnish, Icelandic)
- Implemented nautical wind direction terms
- Enhanced error handling and logging
- Improved data refresh reliability

### 1.0.0
- Initial version with support for SMHI and YR
- Basic English and Swedish translations
- Provider selection in config
- Unified data handling

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Acknowledgments

- Thanks to the MagicMirror² community
- Weather data provided by SMHI and YR
- Icons from the Weather Icons pack

## Author

**Christian Gillinger**
- GitHub: [christian-gillinger](https://github.com/christian-gillinger)
