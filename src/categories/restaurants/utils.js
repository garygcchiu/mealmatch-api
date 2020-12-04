// Layers must follow this structure, see more info here: https://docs.aws.amazon.com/lambda/latest/dg/configuration-layers.html#configuration-layers-manage
const getLayersPath = (path) => {
    console.log('wtf is node env? ', process.env.NODE_ENV);
    return process.env.NODE_ENV === 'local' || !process.env.NODE_ENV
        ? `../layers/nodejs/node_modules/${path}`
        : path;
};

const getConfigUtilsPath = () => {
    return getLayersPath('config-utils');
};

const getLoggerPath = () => {
    return getLayersPath('logger');
};

const getFoursquareUtilsPath = () => {
    return getLayersPath('google-utils');
};

module.exports = {
    getConfigUtilsPath,
    getLoggerPath,
    getFoursquareUtilsPath,
};
