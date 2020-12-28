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
    const { categoryId, latitude, longitude } = queryStringParameters;

    // call foursquare utils
    let res;
    try {
        res = await getNearbyByCategoryId(
            clientId,
            clientSecret,
            categoryId,
            latitude,
            longitude
        );
        logger.info('Got Foursquare res!');
    } catch (err) {
        logger.error('getNearbyByCategoryId err: ', { err });
    }

    return {
        statusCode: 200,
        body: JSON.stringify(res.data),
    };
};
