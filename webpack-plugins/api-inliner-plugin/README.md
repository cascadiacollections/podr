# RushStack API Inliner Webpack Plugin

A webpack plugin for RushStack/Heft build systems that inlines API responses at build time for faster initial rendering.

## Features

- **Build-time API Integration**: Fetches API data during the build process
- **Synchronous Initial Render**: Pre-loads data for instant page rendering without client-side API request delay
- **Configuration-driven**: Easily configurable through JSON files
- **RushStack/Heft Compatible**: Designed to work seamlessly in the RushStack ecosystem
- **Multiple Integration Options**:
  - Inline data as window variables
  - Generate static JSON files
  - Both options simultaneously

## Installation

```bash
npm install --save-dev @rushstack/api-inliner-webpack-plugin
```

## Usage

### As a Webpack Plugin

```typescript
// webpack.config.js
const { ApiInlinerPlugin } = require('@rushstack/api-inliner-webpack-plugin');

module.exports = {
  // ... other webpack config
  plugins: [
    new ApiInlinerPlugin({
      // Configuration (see options below)
      endpoints: [{
        url: 'https://api.example.com/data',
        outputFile: 'api-data.json',
        fallbackData: { /* default data */ }
      }]
    })
  ]
};
```

### As a Heft Plugin

Create a `config/api-inliner.json` file:

```json
{
  "endpoints": [
    {
      "url": "https://api.example.com/data",
      "outputFile": "api-data.json",
      "inlineAsVariable": true,
      "variableName": "MY_API_DATA",
      "fallbackData": { "example": "data" }
    }
  ],
  "inlineAsVariable": true,
  "saveAsFile": true
}
```

Then register the plugin in your Heft configuration:

```js
// config/heft.plugin.js
const { setupApiInlinerPlugin } = require('@rushstack/api-inliner-webpack-plugin/lib/heft-plugin');

module.exports = {
  pluginDefinitions: [
    {
      pluginName: 'api-inliner-plugin',
      entryPoint: setupApiInlinerPlugin
    }
  ]
};
```

## Configuration Options

### Top-level Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `endpoints` | Array/Object | [] | API endpoints to fetch data from (required) |
| `production` | boolean | true | Whether to fetch from API or use fallback data |
| `inlineAsVariable` | boolean | true | Global setting for inlining as window variables |
| `variablePrefix` | string | "API_DATA" | Prefix for auto-generated variable names |
| `saveAsFile` | boolean | true | Whether to save data as static JSON files |
| `requestTimeout` | number | 10000 | Timeout in ms for API requests |
| `retryCount` | number | 2 | Number of times to retry failed requests |
| `outputPath` | string | "" | Custom path for JSON files |

### Endpoint Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `url` | string | - | The API endpoint URL (required) |
| `outputFile` | string | - | Filename to save data to |
| `fallbackData` | object | {} | Fallback data for errors or dev mode |
| `inlineAsVariable` | boolean | inherited | Override global inline setting |
| `variableName` | string | auto-generated | Name of the window variable |
| `requestOptions` | object | {} | Options for http/https request |
| `saveAsFile` | boolean | inherited | Override global file saving setting |

## Using the Data in Your Application

### From Window Variable

```typescript
// Access data inlined as a window variable
const myData = window.MY_API_DATA || {};
```

### From JSON File

```typescript
// First try to load data from the pre-fetched JSON file
fetch('/api-data.json')
  .then(response => response.json())
  .then(data => {
    // Use the data
  })
  .catch(error => {
    // Fall back to API call if needed
  });
```

## License

MIT