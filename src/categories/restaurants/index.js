const { getLoggerPath, getFoursquareUtilsPath } = require('./utils');
const { getNearbyByCategoryId } = require(getFoursquareUtilsPath());

const logger = require(getLoggerPath()).child({
    service: 'categories-restaurants',
});

exports.handler = async (event, context) => {
    const { queryStringParameters } = event;
    logger.info('Received request @ categories/restaurants with params ', {
        queryStringParameters,
    });

    const clientId = process.env.FOURSQUARE_API_CLIENT_ID;
    const clientSecret = process.env.FOURSQUARE_API_CLIENT_SECRET;
    const { categoryId } = queryStringParameters;

    // call foursquare utils
    let res;
    try {
        res = await getNearbyByCategoryId(clientId, clientSecret, categoryId);
    } catch (err) {
        logger.error('getNearbyByCategoryId err: ', { err });
    }

    return {
        status: 200,
        body: JSON.stringify(res),
    };
};
