module.exports = {
  presets: [
    ["@babel/preset-env", { "targets": { "node": "current" } }],
    ["@babel/preset-typescript", { "jsxPragma": "h" }],
    ["@babel/preset-react", { "runtime": "automatic", "importSource": "preact" }]
  ],
  "plugins": [],
  "env": {
    "test": {
      "presets": [
        ["@babel/preset-env", { "modules": "commonjs", "targets": { "node": "current" } }],
        ["@babel/preset-typescript", { "jsxPragma": "h" }],
        ["@babel/preset-react", { "runtime": "automatic", "importSource": "preact" }]
      ]
    }
  }
};
