const path = require('path');
// console.log(process.env.FLUENTFFMPEG_COV);
module.exports = {
    // mode: 'development',
    mode:"production",
    entry: './src/server.js',
    output: {
        filename: 'middle.js',
        path: path.resolve(__dirname, 'middle')
    },
    target: "node",
    resolve: {
        fallback: {
            "path": require.resolve("path"),
            "assert": require.resolve("assert"),
            "util": require.resolve("util"),
            "url": require.resolve("url"),
            "stream": require.resolve("stream"),
            "crypto": require.resolve("crypto"),
            "http": require.resolve("http"),
            "https": require.resolve("https"),
            "timers": require.resolve("timers"),
            "os": require.resolve("os"),
            "express": require.resolve("express"),
            "fluent-ffmpeg": require.resolve("fluent-ffmpeg"),
            "keyv": require.resolve("keyv"),
            "ws": require.resolve("ws"),
            "querystring": require.resolve("querystring"),
        }
    },
    // externals: {
    //     express: 'require(`express`)',
    //     'fluent-ffmpeg':"require(`fluent-ffmpeg`)",
    //     keyv:'require(`keyv`)',
    //     ws:'require(`ws`)'
    //   },
    module: {
        rules:[
            {
                test: /\.js$/,
                // exclude: /node_modules/,
                use: {
                    loader: 'babel-loader',
                    options: {
                        presets: [['@babel/preset-env', {
                            "targets": {
                                "node": true
                            }
                        }]]
                    }
                },
            }
        ]
    },
};