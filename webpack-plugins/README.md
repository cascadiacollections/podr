# Webpack API Inliner Plugin

A webpack plugin that fetches API data at build time and makes it available to your web app either as inlined window variables or static JSON files.

## Benefits

- **Faster Initial Render**: Load critical API data at build time instead of client-side.
- **SEO Friendly**: Content is immediately available without client-side API calls.
- **Better Reliability**: Fallback to static data when APIs are unavailable.
- **Performance First**: Eliminates render-blocking API requests in the critical rendering path.
- **Flexible**: Configure multiple endpoints with different options.

## Installation

```bash
npm install --save-dev webpack-api-inliner-plugin
# or
yarn add --dev webpack-api-inliner-plugin
```

## Usage

```javascript
// webpack.config.js
const ApiInlinerPlugin = require('webpack-api-inliner-plugin');

module.exports = {
  // ... other webpack config
  plugins: [
    new ApiInlinerPlugin({
      production: process.env.NODE_ENV === 'production',
      endpoints: [
        {
          url: 'https://api.example.com/products',
          outputFile: 'products.json',
          fallbackData: { products: [] },
          variableName: 'EXAMPLE_PRODUCTS'
        },
        {
          url: 'https://api.example.com/categories',
          outputFile: 'categories.json',
          fallbackData: { categories: [] },
          inlineAsVariable: false // Only save as JSON file
        }
      ]
    })
  ]
};
```

Then in your app, use the data:

```javascript
// Access inlined data
if (window.EXAMPLE_PRODUCTS) {
  // Use data from window variable
  renderProducts(window.EXAMPLE_PRODUCTS);
} else {
  // Fall back to fetching from static JSON
  fetch('/products.json')
    .then(response => response.json())
    .then(data => renderProducts(data))
    .catch(error => {
      console.error('Failed to load products data:', error);
      // Fall back to API if needed
      fetchProductsFromAPI();
    });
}
```

## Options

### Plugin Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `endpoints` | `EndpointConfig \| EndpointConfig[]` | `[]` | Single endpoint or array of endpoint configurations |
| `production` | `boolean` | `true` | Whether to fetch data from API (production) or just use fallback (development) |
| `inlineAsVariable` | `boolean` | `true` | Global setting for whether to inline data as window variables |
| `variablePrefix` | `string` | `'API_DATA'` | Prefix for all window variables when auto-generating names |
| `saveAsFile` | `boolean` | `true` | Whether to save data as static JSON files |
| `requestTimeout` | `number` | `10000` | Timeout in milliseconds for API requests |
| `retryCount` | `number` | `2` | Number of times to retry a failed request |
| `outputPath` | `string` | `''` | Custom path to save JSON files to (relative to webpack output path) |
| `onSuccess` | `function` | `undefined` | Callback function to run after successful data fetch |
| `onError` | `function` | `undefined` | Callback function to run after failed data fetch |

### Endpoint Configuration

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `url` | `string` | Yes | The API endpoint URL to fetch data from |
| `outputFile` | `string` | Yes | The filename to save the fetched data to (if saveAsFile is true) |
| `fallbackData` | `object` | Yes | The fallback data to use if the API request fails or in development mode |
| `inlineAsVariable` | `boolean` | No | Whether to inline data as window variable (overrides global setting) |
| `variableName` | `string` | No | Name of the window variable to use when inlining |
| `requestOptions` | `object` | No | Options to pass to the http/https request (headers, method, etc) |
| `saveAsFile` | `boolean` | No | Whether to save data as static JSON file (overrides global setting) |

## Advanced Configuration

### Custom Headers and Authentication

```javascript
new ApiInlinerPlugin({
  endpoints: [
    {
      url: 'https://api.example.com/secure-data',
      outputFile: 'secure-data.json',
      fallbackData: { data: [] },
      requestOptions: {
        headers: {
          'Authorization': '******',
          'Content-Type': 'application/json'
        }
      }
    }
  ]
})
```

### Callbacks for Custom Processing

```javascript
new ApiInlinerPlugin({
  endpoints: [/* ... */],
  onSuccess: (data, endpoint) => {
    console.log(`Data fetched successfully from ${endpoint.url}`);
    // Do additional processing if needed
  },
  onError: (error, endpoint) => {
    console.error(`Error fetching from ${endpoint.url}:`, error);
    // Report to error tracking service
  }
})
```

### Using with CI/CD

This plugin works great with CI/CD pipelines that rebuild your app regularly to keep the data fresh.

## License

MIT