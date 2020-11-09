const { getLoggerPath } = require('./utils');
const placesService = require('./placesService');

const logger = require(getLoggerPath()).child({
    service: 'places'
});

const ROUTE_MAP = {
    SEARCH: 'search',
    DETAILS: 'details',
    NEARBY: 'nearby',
}

/**
 *
 * Event doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html#api-gateway-simple-proxy-for-lambda-input-format
 * @param {Object} event - API Gateway Lambda Proxy Input Format
 *
 * Context doc: https://docs.aws.amazon.com/lambda/latest/dg/nodejs-prog-model-context.html
 * @param {Object} context
 *
 * Return doc: https://docs.aws.amazon.com/apigateway/latest/developerguide/set-up-lambda-proxy-integrations.html
 * @returns {Object} object - API Gateway Lambda Proxy Output Format
 *
 */
exports.handler = async (event, context) => {
    let serviceResponse;
    const { path = '', queryStringParameters } = event;
    logger.info(`Processing request at ${path} with params ${JSON.stringify(queryStringParameters)}`);

    // read params
    const location = queryStringParameters['location'];
    const query = queryStringParameters['query'];
    const radius = queryStringParameters['radius'] || 7500;

    console.log(`url params = ${location}, query ${query} , radius = ${radius}`);

    try {
        switch (path.split('/').pop()) {
            case ROUTE_MAP.SEARCH:
                const sessiontoken = '50501023901239123';
                serviceResponse = await placesService.getSearchResults(location, radius, query, sessiontoken);
                break;
            case ROUTE_MAP.DETAILS:
                serviceResponse = await placesService.getPlaceDetails(queryStringParameters);
                break;
            case ROUTE_MAP.NEARBY:
                serviceResponse = await placesService.getNearby(queryStringParameters, location,2000);
                break;
        }
    } catch (err) {
        logger.error(`Places Function caught error when processing ${path} with params ${queryStringParameters}: ${err.message}`);
        serviceResponse = err.message;
    }

    return {
        statusCode: 200,
        body: JSON.stringify(serviceResponse)
    };
};

