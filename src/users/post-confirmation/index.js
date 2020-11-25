const aws = require('aws-sdk');

const { getLoggerPath } = require('./utils');
const ddb = new aws.DynamoDB.DocumentClient({ apiVersion: '2012-10-08' });

const logger = require(getLoggerPath()).child({
    service: 'users-post-confirmation',
});

exports.handler = async (event, context) => {
    logger.info(
        `Received request at Users Cognito Post Confirmation endpoint!`
    );

    let date = new Date();
    const tableName = process.env.USERS_TABLE;
    const region = process.env.AWS_REGION;
    aws.config.update({ region: region });

    // if the required parameters are present, proceed
    if (event.request.userAttributes.sub) {
        // write data to DynamoDB
        let ddbParams = {
            Item: {
                id: event.request.userAttributes.sub,
                username: event.userName || '',
                given_name: event.request.userAttributes.given_name || '',
                family_name: event.request.userAttributes.family_name || '',
                display_username:
                    (event.request.userAttributes.identities &&
                        event.request.userAttributes.identities.length > 0 &&
                        event.userName) ||
                    '', // Social Sign In -- temporarily use username, Basic Auth is fine
                email: event.request.userAttributes.email,
                created_at: date.toISOString(),
            },
            TableName: tableName,
        };

        // call DynamoDB
        try {
            await ddb.put(ddbParams).promise();
            logger.info(
                `Successfully transferred user ${ddbParams.Item.id} to User dynamodb table.`
            );
        } catch (err) {
            logger.error(`ERROR when inserting to DynamoDB: ${err.message}`);
            context.done(null, event);
        }
    } else {
        // Nothing to do, the user's email ID is unknown
        logger.error(
            "Error: user's email ID is unknown, nothing was written to DynamoDB"
        );
        context.done(null, event);
    }

    logger.info('Lambda execution complete...');
    context.done(null, event);
};
