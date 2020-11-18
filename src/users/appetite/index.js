const aws = require('aws-sdk');
const { getLoggerPath } = require('./utils');

const ddb = new aws.DynamoDB.DocumentClient({ apiVersion: '2012-10-08' });

const logger = require(getLoggerPath()).child({
    service: 'user-appetite'
});

const MODES = {
    GET: 0,
    EDIT: 1,
}

exports.handler = async (event, context) => {
    const { path = '', queryStringParameters: queryStringParams, httpMethod, body } = event;
    const MODE = httpMethod === 'GET' ? MODES.GET : MODES.EDIT;

    const tableName = process.env.USER_TABLE;
    const region = process.env.AWS_REGION;
    aws.config.update({ region: region });

    logger.info(`Processing ${httpMethod} request at ${path}...`);

    // retrieve user sub
    let userSub;
    try {
        userSub = event.requestContext.authorizer.claims.sub;
    } catch (err) {
        logger.error('Received error trying to get user sub:', { err });
        return {
            statusCode: 500,
            body: JSON.stringify('Error retrieving user sub')
        };
    }

    // call DynamoDB
    let userAppetite;

    switch (MODE) {
        case MODES.GET:
            try {
                const ddbResponse = await ddb
                    .get({ TableName: tableName, Key: { "id": userSub }, AttributesToGet: ['appetite'] })
                    .promise();
                logger.info(`Successfully retrieved user appetite from the table.`);

                userAppetite = ddbResponse.Item.appetite || [];
            } catch (err) {
                logger.error(`ERROR when retrieving from DynamoDB: ${err.message}`);
                userAppetite = [];
            }
            break;
        case MODES.EDIT:
            logger.info('Setting appetite to ', { appetite: JSON.parse(body) })

            const updateParams = {
                TableName: tableName,
                Key: { "id": userSub },
                UpdateExpression: "set appetite = :a",
                ExpressionAttributeValues: {
                    ":a": JSON.parse(body) || [],
                },
                ReturnValues: "UPDATED_NEW"
            };

            try {
                const ddbResponse = await ddb
                    .update(updateParams)
                    .promise();
                logger.info(`Edited user appetite in the table`);

                userAppetite = ddbResponse.Attributes.appetite || [];
            } catch (err) {
                logger.error(`ERROR when retrieving from DynamoDB`, { err });
                userAppetite = [];
            }
            break;
        default:
            userAppetite = []
    }

    return {
        statusCode: 200,
        body: JSON.stringify(userAppetite)
    };
};
