# @cascadiacollections/webpack-api-inliner

A webpack plugin that fetches API data at build time and makes it available to your web app either as inlined window variables or static JSON files.

## Benefits

- **Faster Initial Render**: Load critical API data at build time instead of client-side.
- **SEO Friendly**: Content is immediately available without client-side API calls.
- **Better Reliability**: Fallback to static data when APIs are unavailable.
- **Performance First**: Eliminates render-blocking API requests in the critical rendering path.
- **Flexible**: Configure multiple endpoints with different options.

## Installation

```bash
npm install --save-dev @cascadiacollections/webpack-api-inliner
# or
yarn add --dev @cascadiacollections/webpack-api-inliner
```

## Usage

```javascript
// webpack.config.js
const { ApiInlinerPlugin } = require('@cascadiacollections/webpack-api-inliner');

module.exports = {
  // ... other webpack config
  plugins: [
    new ApiInlinerPlugin({
      // production is automatically set from process.env.NODE_ENV
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
| `production` | `boolean` | `process.env.NODE_ENV === 'production'` | Whether to fetch data from API (production) or just use fallback (development) |
| `inlineAsVariable` | `boolean` | `true` | Global setting for whether to inline data as window variables |
| `variablePrefix` | `string` | `'API_DATA'` | Prefix for all window variables when auto-generating names |
| `saveAsFile` | `boolean` | `true` | Whether to save data as static JSON files |
| `requestTimeout` | `number` | `10000` | Timeout in milliseconds for API requests |
| `retryCount` | `number` | `2` | Number of times to retry a failed request |
| `outputPath` | `string` | `''` | Custom path to save JSON files to (relative to webpack output path) |
| `emitDeclarationFile` | `boolean` | `false` | Whether to emit TypeScript declaration (.d.ts) files for inlined variables |
| `declarationFilePath` | `string` | `'api-inliner.d.ts'` | Output path for TypeScript declaration file (relative to webpack output path) |
| `defaultType` | `string` | `'any'` | Default type to use for window variables when no specific type is provided |
| `onSuccess` | `function` | `undefined` | Callback function to run after successful data fetch |
| `onError` | `function` | `undefined` | Callback function to run after failed data fetch |

### Endpoint Configuration

| Option | Type | Required | Description |
|--------|------|----------|-------------|
| `url` | `string` | Yes | The API endpoint URL to fetch data from |
| `outputFile` | `string` | No | The filename to save the fetched data to (if saveAsFile is true) |
| `fallbackData` | `object` | No | The fallback data to use if the API request fails or in development mode |
| `inlineAsVariable` | `boolean` | No | Whether to inline data as window variable (overrides global setting) |
| `variableName` | `string` | No | Name of the window variable to use when inlining |
| `requestOptions` | `object` | No | Options to pass to the fetch API (headers, method, etc) |
| `saveAsFile` | `boolean` | No | Whether to save data as static JSON file (overrides global setting) |
| `typeReference` | `string` | No | TypeScript type reference for this endpoint's data |
| `production` | `boolean` | No | Override the production setting for this specific endpoint |

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

### TypeScript Type Safety

The plugin can generate TypeScript declaration files for your inlined window variables:

```javascript
new ApiInlinerPlugin({
  emitDeclarationFile: true, // Enable declaration file generation
  declarationFilePath: 'api-inliner.d.ts', // Path relative to webpack output
  endpoints: [
    {
      url: 'https://api.example.com/products',
      variableName: 'EXAMPLE_PRODUCTS',
      // Use custom type reference for this endpoint
      typeReference: 'import("../src/types").IProduct[]'
    }
  ]
})
```

The generated declaration file will look like:

```typescript
/**
 * Auto-generated TypeScript declarations for API Inliner Plugin
 * Generated on: 2023-05-25T12:34:56.789Z
 * DO NOT EDIT DIRECTLY
 */

declare global {
  interface Window {
    EXAMPLE_PRODUCTS: import("../src/types").IProduct[];
  }
}

export {}; // This file is a module
```

Add the declaration file to your `tsconfig.json`:

```json
{
  "compilerOptions": {
    // ...other options
    "typeRoots": [
      "./node_modules/@types",
      "./dist" // Include the directory where declaration files are generated
    ]
  }
}
```

## Hooks for Accessing Inlined Data

The plugin provides hooks for easily accessing the inlined data in your application. These hooks are compatible with both Preact and React.

### `useApiInliner<T>`

A custom hook for accessing data inlined by the API Inliner Plugin:

```typescript
import { useApiInliner } from '@cascadiacollections/webpack-api-inliner';

function ProductList() {
  // Generic type parameter provides type safety
  const { data, isLoading, error } = useApiInliner<ProductsData>('EXAMPLE_PRODUCTS', 'products.json');

  if (isLoading) return <div>Loading products...</div>;
  if (error) return <div>Error loading products: {error.message}</div>;
  
  return (
    <div>
      <h2>Products ({data.products.length})</h2>
      <ul>
        {data.products.map(product => (
          <li key={product.id}>{product.name} - ${product.price}</li>
        ))}
      </ul>
    </div>
  );
}
```

#### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `variableName` | `string` | The name of the window variable to check |
| `jsonPath` | `string` | Path to the fallback JSON file if the window variable isn't available |
| `options` | `RequestInit` | Optional fetch options for the JSON request |

#### Return Value

| Property | Type | Description |
|----------|------|-------------|
| `data` | `T \| null` | The fetched data, or null if not loaded yet |
| `isLoading` | `boolean` | Whether the data is currently loading |
| `error` | `Error \| null` | Error object if the fetch failed, or null if successful |

## Node.js Version Support

This plugin requires Node.js v18 or later. It uses modern Node.js features such as:
- Native fetch API
- Modern file system promises API
- AbortSignal.timeout()

## License

MIT