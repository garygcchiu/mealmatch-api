const AWSXRay = require('aws-xray');
const aws = AWSXRay.captureAWS(require('aws-sdk'));
const { getLoggerPath } = require('./utils');

const ddb = new aws.DynamoDB.DocumentClient({ apiVersion: '2012-10-08' });

const logger = require(getLoggerPath()).child({
    service: 'search',
});

exports.handler = async (event, context) => {
    const { queryStringParameters } = event;

    const { query } = queryStringParameters;
    const userTable = process.env.USER_TABLE;
    const region = process.env.AWS_REGION;
    aws.config.update({ region: region });

    // retrieve user sub
    let userSub;
    try {
        userSub = event.requestContext.authorizer.claims.sub;
    } catch (err) {
        logger.error('Received error trying to get user sub:', { err });
        return {
            statusCode: 500,
            body: JSON.stringify('Error retrieving user sub'),
        };
    }

    let users = [];

    // call DynamoDB
    try {
        const ddbResponse = await ddb
            .scan({
                TableName: userTable,
                IndexName: 'gsiDisplayUsername',
                FilterExpression: `contains (#display_username, :query) and #id <> :userSub`,
                ExpressionAttributeNames: {
                    '#display_username': 'display_username',
                    '#id': 'id',
                },
                ExpressionAttributeValues: {
                    ':query': query,
                    ':userSub': userSub,
                },
            })
            .promise();
        users = ddbResponse.Items || [];
        logger.info(`Successfully received user info`, {
            ddbResponse: ddbResponse.Items,
        });
    } catch (err) {
        logger.error(`ERROR reading from DynamoDB: ${err.message}`);
        return {
            statusCode: 500,
            body: err.message,
        };
    }

    return {
        statusCode: 200,
        body: JSON.stringify({
            results: {
                users: users,
            },
        }),
    };
};
