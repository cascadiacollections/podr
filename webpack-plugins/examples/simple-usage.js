const ApiInlinerPlugin = require('webpack-api-inliner-plugin');

module.exports = {
  // ... other webpack config
  plugins: [
    // Basic usage with a single endpoint
    new ApiInlinerPlugin({
      production: process.env.NODE_ENV === 'production',
      endpoints: [
        {
          url: 'https://api.example.com/products',
          outputFile: 'products.json',
          fallbackData: { products: [] },
          variableName: 'EXAMPLE_PRODUCTS'
        }
      ]
    }),
    
    // Advanced usage with multiple endpoints
    new ApiInlinerPlugin({
      production: process.env.NODE_ENV === 'production',
      endpoints: [
        {
          url: 'https://api.example.com/products',
          outputFile: 'products.json',
          fallbackData: { products: [] },
          variableName: 'EXAMPLE_PRODUCTS',
          requestOptions: {
            headers: {
              'Authorization': '******',
              'Content-Type': 'application/json'
            }
          }
        },
        {
          url: 'https://api.example.com/categories',
          outputFile: 'categories.json',
          fallbackData: { categories: [] },
          // Only save as JSON file, don't inline as variable
          inlineAsVariable: false
        },
        {
          url: 'https://api.example.com/settings',
          outputFile: 'settings.json',
          fallbackData: { settings: {} },
          // Custom variable name
          variableName: 'APP_SETTINGS'
        }
      ],
      // Global plugin settings
      inlineAsVariable: true,
      variablePrefix: 'API_DATA',
      saveAsFile: true,
      requestTimeout: 5000,
      retryCount: 3,
      // Custom callbacks
      onSuccess: (data, endpoint) => {
        console.log(`Data fetched successfully from ${endpoint.url}`);
      },
      onError: (error, endpoint) => {
        console.error(`Error fetching from ${endpoint.url}:`, error);
      }
    })
  ]
};