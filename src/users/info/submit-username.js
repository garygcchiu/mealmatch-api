const aws = require('aws-sdk');

const { getLoggerPath } = require('./utils');
const ddb = new aws.DynamoDB.DocumentClient({ apiVersion: '2012-10-08' });

const logger = require(getLoggerPath()).child({
    service: 'users-submit-username',
});

exports.handler = async (event, context) => {
    logger.info(`Received request at Users Username Info endpoint!`);

    const { body } = event;
    const { display_username } = JSON.parse(body);

    // TODO: validate input

    const usersTable = process.env.USERS_TABLE;
    const usernamesTable = process.env.USERNAMES_TABLE;
    const region = process.env.AWS_REGION;
    aws.config.update({ region: region });

    logger.info('attempting to use username ', { display_username });

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

    // call dynamodb to insert to usernames table
    try {
        await ddb
            .put({
                TableName: usernamesTable,
                Item: {
                    display_username: display_username,
                },
                ConditionExpression: 'attribute_not_exists(display_username)',
            })
            .promise();
        logger.info(`Successfully inserted display_username`);
    } catch (err) {
        if (err.code === 'ConditionalCheckFailedException') {
            // username already exists
            logger.info('Username already exists!');
            return {
                statusCode: 400,
                body: JSON.stringify({ error: 'USERNAME_EXISTS' }),
            };
        } else {
            logger.error(`Unexpected error on put to DynamoDB`, { err });
            return {
                statusCode: 500,
                body: err.message,
            };
        }
    }

    // username does not exist: call DynamoDB to update display_username for user
    const updateParams = {
        TableName: usersTable,
        Key: { id: userSub },
        UpdateExpression: 'set display_username = :a',
        ExpressionAttributeValues: { ':a': display_username },
        ReturnValues: 'UPDATED_NEW',
    };

    try {
        await ddb.update(updateParams).promise();
        logger.info(`Successfully updated user display_username`);
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
        body: JSON.stringify({
            success: true,
        }),
    };
};
