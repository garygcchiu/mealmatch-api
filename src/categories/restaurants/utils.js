// Layers must follow this structure, see more info here: https://docs.aws.amazon.com/lambda/latest/dg/configuration-layers.html#configuration-layers-manage
const getLayersPath = (path) => {
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
    return getLayersPath('foursquare-utils');
};

module.exports = {
    getConfigUtilsPath,
    getLoggerPath,
    getFoursquareUtilsPath,
};
