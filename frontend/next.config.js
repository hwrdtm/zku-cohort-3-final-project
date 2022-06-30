/** @type {import('next').NextConfig} */

const CopyPlugin = require("copy-webpack-plugin");

const withBundleAnalyzer = require("@next/bundle-analyzer")({
  enabled: process.env.ANALYZE === "true",
});

const nextConfig = {
  reactStrictMode: true,
  webpack: (config, { buildId, dev, isServer, defaultLoaders, webpack }) => {
    const vercelTargetWasmDest = `/var/task/frontend/public/CheckTokenAllocations_15.wasm`;
    const vercelTargetZkeyDest = `/var/task/frontend/public/CheckTokenAllocations_15.final.zkey`;

    console.log("copying to", {
      __dirname,
      isServer,
      vercelTargetWasmDest,
      vercelTargetZkeyDest,
    });

    config.plugins.push(
      new CopyPlugin({
        patterns: [
          {
            from: "./public/CheckTokenAllocations_15.wasm",
            to: vercelTargetWasmDest,
          },
          {
            from: "./public/CheckTokenAllocations_15.final.zkey",
            to: vercelTargetZkeyDest,
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
