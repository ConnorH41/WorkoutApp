const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync({
    ...env,
    devServer: {
      ...env.devServer,
      allowedHosts: 'all',
      host: '0.0.0.0',
      port: 5000,
    },
  }, argv);
  return config;
};
