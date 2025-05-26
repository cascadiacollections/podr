// Example of how to use the inlined data in your app

// Using window variables approach
function loadProductsData() {
  // First check for the window variable (inlined at build time)
  if (window.EXAMPLE_PRODUCTS) {
    console.log('Using inlined products data');
    return Promise.resolve(window.EXAMPLE_PRODUCTS);
  }

  // Fall back to static JSON file
  console.log('Fetching products from static JSON file');
  return fetch('/products.json')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .catch(error => {
      console.error('Failed to load static products data:', error);
      // Fall back to API call
      return fetchProductsFromAPI();
    });
}

// Fallback to API function
function fetchProductsFromAPI() {
  console.log('Fetching products from API');
  return fetch('https://api.example.com/products')
    .then(response => {
      if (!response.ok) {
        throw new Error(`HTTP error! Status: ${response.status}`);
      }
      return response.json();
    })
    .catch(error => {
      console.error('Failed to fetch products from API:', error);
      // Return empty products array as last resort
      return { products: [] };
    });
}

// React Hook example
function useApiData(variableName, jsonPath) {
  const [data, setData] = React.useState(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState(null);

  React.useEffect(() => {
    // Check for window variable first (fastest)
    if (window[variableName]) {
      setData(window[variableName]);
      setLoading(false);
      return;
    }

    // Fall back to static JSON file
    fetch(`/${jsonPath}`)
      .then(response => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then(result => {
        setData(result);
      })
      .catch(err => {
        setError(err);
        // Could add a third fallback to API here
      })
      .finally(() => {
        setLoading(false);
      });
  }, [variableName, jsonPath]);

  return { data, loading, error };
}

// Usage in React component
function ProductList() {
  const { data, loading, error } = useApiData('EXAMPLE_PRODUCTS', 'products.json');
  
  if (loading) return <div>Loading products...</div>;
  if (error) return <div>Error loading products: {error.message}</div>;
  if (!data || !data.products) return <div>No products found</div>;
  
  return (
    <div>
      <h2>Products</h2>
      <ul>
        {data.products.map(product => (
          <li key={product.id}>{product.name}</li>
        ))}
      </ul>
    </div>
  );
}