module.exports = {
  plugins: [
    // Modern CSS features and optimizations
    require('postcss-preset-env')({
      stage: 2, // Use stage 2 features (stable)
      features: {
        'nesting-rules': true,
        'custom-media-queries': true,
        'custom-properties': true,
        'media-query-ranges': true,
        'logical-properties-and-values': true,
        'color-function': true,
        'oklab-function': true,
      },
      autoprefixer: {
        grid: 'autoplace', // Enable CSS Grid autoprefixing
      },
      browsers: ['> 1%', 'last 2 versions', 'not dead', 'not ie 11'],
    }),

    // CSS optimization for production
    ...(process.env.NODE_ENV === 'production'
      ? [
          require('cssnano')({
            preset: [
              'default',
              {
                discardComments: {
                  removeAll: true,
                },
                normalizeWhitespace: false, // Preserve formatting for debugging
              },
            ],
          }),
        ]
      : []),

    // Development tools
    ...(process.env.NODE_ENV !== 'production'
      ? [
          require('postcss-reporter')({
            clearReportedMessages: true,
          }),
        ]
      : []),
  ],
};
