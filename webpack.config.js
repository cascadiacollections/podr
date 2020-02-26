const path = require('path');

module.exports = {
  entry: './lib/src/index.js',
  output: {
    path: path.resolve(__dirname, 'dist'),
    filename: 'app.bundle.js'
  },
  module: {
    rules: [
    ]
  }
};