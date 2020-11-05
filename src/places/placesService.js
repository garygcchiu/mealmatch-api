const { getGoogleUtilsPath, getConfigUtilsPath, getLoggerPath } = require('./utils');
const { getGoogleApiStuff } = require(getGoogleUtilsPath());
const { getSSMParameter } = require(getConfigUtilsPath());

const getNearby = async (params) => {
    return 'handleNearby';
}

const getSearchResults = async (params) => {
    return 'handleSearch';
}

const getPlaceDetails = async (params) => {
    return 'handleDetails';
}

module.exports = {
    getNearby,
    getSearchResults,
    getPlaceDetails,
}
