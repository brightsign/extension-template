const path = require('path');
const CopyPlugin = require('copy-webpack-plugin');

module.exports = {
    entry: './src/index.ts',
    output: {
        filename: 'index.js',
        path: path.resolve(__dirname, 'install'),
    },
    mode: 'development',
    target: 'node',
    resolve: {
        extensions: ['.ts', '.js'],
    },
    module: {
        rules: [
            {
                test: /\.ts$/,
                use: 'ts-loader',
                exclude: /node_modules/,
            },
        ],
    },
    externals: {
        // BrightSign APIs are available at runtime on the player
        '@brightsign/deviceinfo': 'commonjs @brightsign/deviceinfo',
        '@brightsign/networkconfiguration': 'commonjs @brightsign/networkconfiguration',
        '@brightsign/screenshot': 'commonjs @brightsign/screenshot',
        '@brightsign/registry': 'commonjs @brightsign/registry',
        '@brightsign/videooutput': 'commonjs @brightsign/videooutput',
    },
    plugins: [
        new CopyPlugin({
            patterns: [
                { from: 'bsext_init', to: '.' }
            ]
        })
    ]
};
