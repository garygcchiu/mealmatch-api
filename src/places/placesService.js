const { getGoogleUtilsPath, getConfigUtilsPath, getLogger } = require('./utils');
const { getNearbyPlaces, getPlacesAutocomplete } = require(getGoogleUtilsPath());
const { getSSMParameter } = require(getConfigUtilsPath());

const getNearby = async (params, location, radius) => {
    const googlePlacesAPIKey = await getSSMParameter('GooglePlacesAPIKey');

    return getNearbyPlaces(googlePlacesAPIKey, location, radius);
}

const getSearchResults = async (location, radius, query, sessiontoken) => {
    const googlePlacesAPIKey = await getSSMParameter('GooglePlacesAPIKey');

    return getPlacesAutocomplete(googlePlacesAPIKey, location, radius, query, sessiontoken);
}

const getPlaceDetails = async (params) => {
    return 'handleDetails';
}

module.exports = {
    getNearby,
    getSearchResults,
    getPlaceDetails,
}
