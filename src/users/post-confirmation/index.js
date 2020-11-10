const aws = require('aws-sdk');

const { getLoggerPath } = require('./utils');
const ddb = new aws.DynamoDB({ apiVersion: '2012-10-08' });

const logger = require(getLoggerPath()).child({
    service: 'users'
});

exports.handler = async (event, context) => {
    logger.info(`Received request at Users Cognito Post Confirmation endpoint!`);

    let date = new Date();
    const tableName = process.env.USERS_TABLE;
    const region = process.env.AWS_REGION;
    aws.config.update({ region: region });

    // if the required parameters are present, proceed
    if (event.request.userAttributes.sub) {
        // write data to DynamoDB
        let ddbParams = {
            Item: {
                'id': { S: event.request.userAttributes.sub },
                'username': { S: event.userName || event.request.userAttributes.email },
                'name': { S: event.request.userAttributes.name || '' },
                'given_name': { S: event.request.userAttributes.given_name || '' },
                'family_name': { S: event.request.userAttributes.family_name || '' },
                'email': { S: event.request.userAttributes.email },
                'created_at': { S: date.toISOString() },
            },
            TableName: tableName
        };

        // call DynamoDB
        try {
            await ddb.putItem(ddbParams).promise();
            logger.info(`Successfully transferred user ${ddbParams.Item.id.S} to User dynamodb table.`);
        } catch (err) {
            logger.error(`ERROR when inserting to DynamoDB: ${err.message}`);
            context.done(null, event);
        }
    } else {
        // Nothing to do, the user's email ID is unknown
        logger.error("Error: user's email ID is unknown, nothing was written to DynamoDB");
        context.done(null, event);
    }

    logger.info('Lambda execution complete...');
    context.done(null, event);
};

