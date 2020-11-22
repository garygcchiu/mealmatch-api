const aws = require('aws-sdk');

const { getLoggerPath } = require('./utils');
const ddb = new aws.DynamoDB.DocumentClient({ apiVersion: '2012-10-08' });

const logger = require(getLoggerPath()).child({
    service: 'users-info',
});

exports.handler = async (event, context) => {
    logger.info(`Received request at Users Fetch endpoint!`);

    const usersTable = process.env.USERS_TABLE;
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

    // call DynamoDB
    let userInfo;
    try {
        const ddbResponse = await ddb
            .get({
                TableName: usersTable,
                Key: { id: userSub },
                AttributesToGet: [
                    'display_username',
                    'appetite',
                    'following',
                    'groups',
                ],
            })
            .promise();
        userInfo = ddbResponse.Item || {};
        logger.info(`Successfully received user info`, { userInfo });
    } catch (err) {
        logger.error(`ERROR reading from DynamoDB: ${err.message}`);
        return {
            statusCode: 500,
            body: err.message,
        };
    }

    logger.info('Lambda execution complete...');
    return {
        statusCode: 200,
        body: JSON.stringify(userInfo),
    };
};
