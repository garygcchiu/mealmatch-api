const { getGoogleUtilsPath, getConfigUtilsPath, getLogger } = require('./utils');
const { getNearbyPlaces } = require(getGoogleUtilsPath());
const { getSSMParameter } = require(getConfigUtilsPath());

const getNearby = async (params, location, radius) => {
    const googlePlacesAPIKey = await getSSMParameter('GooglePlacesAPIKey');

    return getNearbyPlaces(googlePlacesAPIKey, location, radius);
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
