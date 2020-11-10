const aws = require('aws-sdk');

const { getLoggerPath } = require('./utils');
const ddb = new aws.DynamoDB({ apiVersion: '2012-10-08' });

const logger = require(getLoggerPath()).child({
    service: 'categories-explore'
});

exports.handler = async (event, context) => {
    logger.info(`Received request at categories/explore endpoint 2!`);

    const tableName = process.env.CATEGORY_TABLE;
    const region = process.env.AWS_REGION;
    aws.config.update({ region: region });

    // call DynamoDB
    let categories = {}, response;
    try {
        categories = await ddb.scan({ TableName: tableName }).promise();
        logger.info(`Successfully retrieved ${categories.Count} categories from the table.`);

        response = {
            statusCode: 200,
            body: categories,
        }
    } catch (err) {
        logger.error(`ERROR when retrieving from DynamoDB: ${err.message}`);
        response = {
            statusCode: 500,
            body: 'Internal Server Error',
        }
    }

    return response;
};

