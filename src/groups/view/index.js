const aws = require('aws-sdk');

const { getLoggerPath } = require('./utils');
const ddb = new aws.DynamoDB.DocumentClient({ apiVersion: '2012-10-08' });

const logger = require(getLoggerPath()).child({
    service: 'groups-view',
});

// GET: urlParams expects { groupId }
exports.handler = async (event, context) => {
    logger.info(`Received request at Groups View endpoint!`);
    const { queryStringParameters } = event;
    const { groupId } = queryStringParameters;

    logger.info('Getting members for Group ID ', { groupId });

    const groupsTable = process.env.GROUPS_TABLE;
    const region = process.env.AWS_REGION;
    aws.config.update({ region: region });

    // call dynamodb to query groupId partition key for members attribute
    let groupInfo;
    try {
        const ddbResponse = await ddb
            .get({
                TableName: groupsTable,
                Key: { group_id: groupId },
                AttributesToGet: ['members', 'name', 'invited_members'],
            })
            .promise();
        groupInfo = ddbResponse.Item || {};
        logger.info(`Successfully received group members `, { groupInfo });
    } catch (err) {
        logger.error(`ERROR reading from DynamoDB: ${err.message}`);
        return {
            statusCode: 500,
            body: err.message,
        };
    }

    return {
        statusCode: 200,
        body: JSON.stringify(groupInfo),
    };
};
