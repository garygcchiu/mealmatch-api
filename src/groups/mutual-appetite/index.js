const aws = require('aws-sdk');

const { getLoggerPath } = require('./utils');
const ddb = new aws.DynamoDB.DocumentClient({ apiVersion: '2012-10-08' });

const logger = require(getLoggerPath()).child({
    service: 'groups-appetite',
});

// GET: urlParams expects { groupId }
exports.handler = async (event, context) => {
    logger.info(`Received request at groups-appetite endpoint!`);
    const { queryStringParameters } = event;
    const { groupId } = queryStringParameters;

    logger.info('Getting members for Group ID ', { groupId });

    const groupsTable = process.env.GROUPS_TABLE;
    const usersTable = process.env.USERS_TABLE;
    const region = process.env.AWS_REGION;
    aws.config.update({ region: region });

    // call dynamodb to query groupId partition key for members attribute
    let members;
    try {
        const ddbResponse = await ddb
            .get({
                TableName: groupsTable,
                Key: { id: groupId },
                AttributesToGet: ['members'],
            })
            .promise();
        members = ddbResponse.Item.members || [];
        logger.info(`Successfully received group members `, { members });
    } catch (err) {
        logger.error(`ERROR reading from DynamoDB: ${err.message}`);
        return {
            statusCode: 500,
            body: err.message,
        };
    }

    // for each member, get their appetite
    const appetites = [];
    for (const member of members) {
        // call dynamodb
        try {
            const memberAppetite = await ddb
                .query({
                    TableName: usersTable,
                    IndexName: 'gsiUserAppetite',
                    KeyConditionExpression: 'display_username = :user1',
                    ExpressionAttributeValues: {
                        ':user1': member.display_username,
                    },
                })
                .promise();
            logger.info(
                `Successfully retrieved user ${member.display_username}'s appetite from the table.`,
                { memberAppetite }
            );
            appetites.push(memberAppetite.Items[0].appetite);
        } catch (err) {
            logger.error(`ERROR reading from DynamoDB: ${err.message}`);
            return {
                statusCode: 500,
                body: err.message,
            };
        }
    }

    logger.info(`member appetites = `, { appetites });

    // calculate common appetites
    let flattened = appetites.reduce((a, b) => a.concat(b), []);

    logger.info('flattened = ', { flattened });

    let counts = flattened.reduce(
        (map, appetite) => map.set(appetite, (map.get(appetite) || 0) + 1),
        new Map()
    );

    logger.info('counts = ', { counts });

    const res = getByValue(counts, appetites.length);

    logger.info('res = ', { res });

    return {
        statusCode: 200,
        body: JSON.stringify(res),
    };
};

function getByValue(map, searchValue) {
    const res = [];
    for (let [key, value] of map.entries()) {
        if (value === searchValue) {
            res.push(key);
        }
    }
    return res;
}
