/** @type {import('next').NextConfig} */

const CopyPlugin = require("copy-webpack-plugin");

const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    config.plugins.push(
      new CopyPlugin({
        patterns: [
          {
            from: "./public/CheckTokenAllocations_15.wasm",
            to: `${__dirname}/public/CheckTokenAllocations_15.wasm`,
          },
          {
            from: "./public/CheckTokenAllocations_15.final.zkey",
            to: `${__dirname}/public/CheckTokenAllocations_15.final.zkey`,
          },
        ],
      })
    );

    if (!isServer) {
      config.plugins.push(
        new webpack.ProvidePlugin({
          global: "global",
        })
      );

      config.resolve.fallback = {
        fs: false,
        stream: false,
        crypto: false,
        os: false,
        readline: false,
        ejs: false,
        assert: require.resolve("assert"),
        path: false,
      };

      return config;
    }

    return config;
  },
  serverRuntimeConfig: {
    PROJECT_ROOT: __dirname,
  },
};

module.exports = withBundleAnalyzer(nextConfig);
