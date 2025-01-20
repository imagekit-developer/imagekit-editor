// import {BundleStatsWebpackPlugin} from "bundle-stats-webpack-plugin";
import path from "path";
import {Configuration} from "webpack";
import {Configuration as WebpackDevServerConfiguration} from "webpack-dev-server";

const config = (env, {mode}): Array<WebpackDevServerConfiguration | Configuration> => {
  return [
    {
      entry: "./src/index.tsx",
      watch: mode === "development",
      externals: {
        react: {
          root: "React",
          commonjs2: "react",
          commonjs: "react",
          amd: "react",
          umd: "react",
        },
        "react-dom": {
          root: "ReactDOM",
          commonjs2: "react-dom",
          commonjs: "react-dom",
          amd: "react-dom",
          umd: "react-dom",
        },
      },
      output: {
        path: path.join(__dirname, "build", "dist", "cjs"),
        filename: "index.js",
        library: "ImageKitEditor",
        libraryTarget: "umd",
      },
      resolve: {
        extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
      },
      mode,
      optimization: {
        minimize: true,
      },
      devtool: mode === "development" ? "source-map" : false,
      module: {
        rules: [
          {
            test: /\.(js|jsx|ts|tsx)$/,
            exclude: /node_modules/,
            use: [
              {
                loader: "babel-loader",
              },
              {
                loader: "ts-loader",
                options: {
                  configFile: path.resolve("./tsconfig.json"),
                },
              },
            ],
          },
          {
            test: /\.(jpg|png|gif|svg|woff|ttf|eot)$/,
            use: {
              loader: "url-loader",
            },
          },
        ],
      },
    },
    {
      entry: "./src/index.tsx",
      watch: mode === "development",
      externals: {
        react: {
          root: "React",
          commonjs2: "react",
          commonjs: "react",
          amd: "react",
          umd: "react",
        },
        "react-dom": {
          root: "ReactDOM",
          commonjs2: "react-dom",
          commonjs: "react-dom",
          amd: "react-dom",
          umd: "react-dom",
        },
      },
      output: {
        path: path.join(__dirname, "build", "dist", "module"),
        filename: "index.js",
        library: "ImageKitEditor",
        libraryTarget: "umd",
      },
      resolve: {
        extensions: [".ts", ".tsx", ".js", ".jsx", ".json"],
      },
      mode,
      optimization: {
        minimize: true,
      },
      devtool: mode === "development" ? "source-map" : false,
      module: {
        rules: [
          {
            test: /\.(js|jsx|ts|tsx)$/,
            exclude: /node_modules/,
            use: [
              {
                loader: "babel-loader",
              },
              {
                loader: "ts-loader",
                options: {
                  configFile: path.resolve("./tsconfig.json"),
                },
              },
            ],
          },
          {
            test: /\.(jpg|png|gif|svg|woff|ttf|eot)$/,
            use: {
              loader: "url-loader",
            },
          },
        ],
      },
    },
  ];
};

export default config;
