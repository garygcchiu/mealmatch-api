const AWSXRay = require('aws-xray');
const aws = AWSXRay.captureAWS(require('aws-sdk'));

const { getLoggerPath } = require('./utils');
const ddb = new aws.DynamoDB.DocumentClient({ apiVersion: '2012-10-08' });

const logger = require(getLoggerPath()).child({
    service: 'users-avatar-submit',
});

exports.handler = async (event, context) => {
    logger.info(`Received request at Users Avatar Submit endpoint!`);

    const { body } = event;
    const updateObj = JSON.parse(body);

    const usersTable = process.env.USERS_TABLE;
    const region = process.env.AWS_REGION;
    aws.config.update({ region: region });

    logger.info('body = ', { body });

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

    // call DynamoDB to add to user's avatar url
    const updateParams = {
        TableName: usersTable,
        Key: { id: userSub },
        UpdateExpression: 'set avatar = :a',
        ExpressionAttributeValues: {
            ':a': updateObj.avatarUrl,
        },
        ReturnValues: 'UPDATED_NEW',
    };

    let userInfo;
    try {
        const ddbResponse = await ddb.update(updateParams).promise();
        logger.info(`Successfully updated user avatar`, { ddbResponse });
        userInfo = ddbResponse.Attributes;
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
