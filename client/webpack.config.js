const path = require("path");
const HtmlWebpackPlugin = require("html-webpack-plugin")

module.exports = {
	target: "web",
	entry: "./main.jsx",
	devtool: "inline-source-map",
	plugins: [
		new HtmlWebpackPlugin({
			template: "index.html",
		}),
	],
	resolve: {
		extensions: [".js", ".jsx", ".json"],
	},
	output: {
		path: path.resolve(__dirname, "../server/templates/"),
		filename: "../static/js/bundle.min.js",
	},
    externals: {
			"fs": "commonjs fs", 
			"perf_hooks": "commonjs perf_hooks",
			"readline": "commonjs readline",
			"ws": "commonjs ws",
    },
};