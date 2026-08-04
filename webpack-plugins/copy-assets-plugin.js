'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const webpack = require('webpack');

const PLUGIN_NAME = 'CopyAssetsPlugin';

/**
 * Copies static files that are referenced by URL rather than imported, so they are
 * emitted to the output directory alongside the bundle.
 *
 * The PWA manifest, its icons, and the service worker are all fetched by the
 * browser at runtime; without this they never leave the assets directory.
 */
/**
 * Placeholders the service worker declares and the build fills in
 */
const PRECACHE_TOKEN = 'self.__PODR_PRECACHE__';
const BUILD_ID_TOKEN = 'self.__PODR_BUILD_ID__';

/**
 * Assets worth precaching: the app's own code and styles. The compressed copies
 * emitted alongside them are served by content negotiation, not by URL.
 */
const PRECACHE_PATTERN = /\.(?:js|css)$/;

class CopyAssetsPlugin {
  /**
   * @param {{ from?: string, files?: string[], injectManifestInto?: string }} options
   *   from - directory the files are read from, relative to the project root
   *   files - file names to copy, emitted at the root of the output directory
   *   injectManifestInto - a copied file whose PRECACHE/BUILD_ID placeholders are
   *     replaced with this build's hashed asset names. Without it a hand-written
   *     service worker cannot know what to precache, and an offline visit falls
   *     back to whatever the HTTP cache happens to have kept.
   */
  constructor(options = {}) {
    this.from = options.from || 'assets';
    this.files = options.files || [];
    this.injectManifestInto = options.injectManifestInto;
  }

  apply(compiler) {
    const context = compiler.options.context || process.cwd();
    const sourceDirectory = path.resolve(context, this.from);

    compiler.hooks.thisCompilation.tap(PLUGIN_NAME, (compilation) => {
      compilation.hooks.processAssets.tap(
        {
          name: PLUGIN_NAME,
          stage: webpack.Compilation.PROCESS_ASSETS_STAGE_ADDITIONAL
        },
        () => {
          for (const file of this.files) {
            const sourcePath = path.join(sourceDirectory, file);

            if (!fs.existsSync(sourcePath)) {
              compilation.warnings.push(
                new webpack.WebpackError(`${PLUGIN_NAME}: "${sourcePath}" does not exist`)
              );
              continue;
            }

            // Track the source so watch mode picks up edits
            compilation.fileDependencies.add(sourcePath);

            if (compilation.getAsset(file)) {
              continue;
            }

            compilation.emitAsset(file, new webpack.sources.RawSource(fs.readFileSync(sourcePath)));
          }
        }
      );

      if (!this.injectManifestInto) {
        return;
      }

      compilation.hooks.processAssets.tap(
        {
          name: PLUGIN_NAME,
          // Late enough that every hashed asset has been added and named
          stage: webpack.Compilation.PROCESS_ASSETS_STAGE_SUMMARIZE
        },
        (assets) => {
          const target = compilation.getAsset(this.injectManifestInto);

          if (!target) {
            return;
          }

          const precache = Object.keys(assets)
            // The worker itself is managed by the browser, not by its own cache
            .filter((name) => name !== this.injectManifestInto && PRECACHE_PATTERN.test(name))
            .map((name) => `/${name}`)
            .sort();

          // Derived from the asset names, so the worker's bytes change whenever the
          // build does. A byte-identical worker is never reinstalled by the browser.
          const buildId = crypto
            .createHash('sha256')
            .update(precache.join('|'))
            .digest('hex')
            .slice(0, 12);

          const source = target.source.source().toString();
          const updated = source
            .split(PRECACHE_TOKEN)
            .join(JSON.stringify(precache))
            .split(BUILD_ID_TOKEN)
            .join(JSON.stringify(buildId));

          compilation.updateAsset(this.injectManifestInto, new webpack.sources.RawSource(updated));
        }
      );
    });
  }
}

module.exports = CopyAssetsPlugin;
