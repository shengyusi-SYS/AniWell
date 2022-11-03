const path = require('path');
// console.log(process.env.FLUENTFFMPEG_COV);
module.exports = {
    mode: 'production',
    entry: './src/server.js',
    output: {
        filename: 'bundle.js',
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
            "querystring": require.resolve("querystring"),
            "express": require.resolve("express"),
        }
    }
};