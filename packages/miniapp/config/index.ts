import { defineConfig } from "@tarojs/cli";
export default defineConfig({
  projectName: "javis",
  date: "2026-10-27",
  designWidth: 375,
  deviceRatio: { 375: 2, 750: 1 },
  sourceRoot: "src",
  outputRoot: process.env.TARO_ENV === "h5" ? "dist-h5" : "dist",
  framework: "react",
  compiler: { type: "webpack5", prebundle: { enable: false } },
  plugins: ["@tarojs/plugin-framework-react"],
  mini: {
    postcss: {
      pxtransform: { enable: true },
      url: { enable: true, config: { limit: 1024 } },
    },
  },
  h5: {
    publicPath: "/",
    staticDirectory: "static",
    router: { mode: "hash" },
    devServer: { port: 10086, host: "127.0.0.1" },
  },
});
