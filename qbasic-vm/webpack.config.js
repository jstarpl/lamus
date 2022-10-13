const path = require('path')
const webpack = require('webpack')

module.exports = {
	mode: 'development',
	entry: './src/index.ts',
	output: {
		path: path.join(__dirname, 'dist'),
		filename: 'qbasic-vm.js',
		library: 'qbasic-vm',
		libraryTarget: 'umd'
	},
	devtool: 'source-map',
	resolve: {
		modules: [path.resolve('./node_modules'), path.resolve('./src')],
		extensions: ['.js', '.ts', '.json'],
		fallback: {
			"assert": require.resolve("assert-browserify"),
			"process": false,
		}
	},
	module: {
		rules: [
			{
				test: /\.tsx?$/,
				exclude: /node_modules/,
				use: {
					loader: 'ts-loader',
					options: {
						transpileOnly: false
					}
				}
			}
		]
	},
	devServer: {
		static: [
			{
				directory: path.join(__dirname, 'demo')
			},
			{
				directory: path.join(__dirname, 'assets')
			},
			{
				directory: path.join(__dirname, 'dist')
			}
		],
		compress: true,
		port: 9000,
		open: ['index.html'],
		watchFiles: ['dist/qbasic-vm.js', 'demo/**/*']
	},
	plugins: [
		new webpack.ProvidePlugin({
			process: 'process/browser',
		}),
	]
}
