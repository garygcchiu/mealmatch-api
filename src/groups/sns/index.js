const aws = require('aws-sdk');
const { getLoggerPath } = require('./utils');

const ddb = new aws.DynamoDB.DocumentClient({ apiVersion: '2012-10-08' });

const logger = require(getLoggerPath()).child({
    service: 'groups-sns',
});

// SNS Subscriber, expects { group_id, user_id } in SNS Message
exports.handler = async (event, context, callback) => {
    logger.info('Received Group Invite SNS message!!!');
    const { Sns } = event.Records[0];
    const { group_id, user_id, group_name } = JSON.parse(Sns.Message);

    logger.info(
        `Adding user ${user_id} to group_id ${group_id}, name = ${group_name}`
    );

    // configure AWS SDK
    const groupsTable = process.env.GROUPS_TABLE;
    const usersTable = process.env.USERS_TABLE;
    const region = process.env.AWS_REGION;
    aws.config.update({ region: region });

    // add group_id to user's group_invites []
    let ddbAddRes;
    const inviteParams = {
        TableName: usersTable,
        Key: { id: user_id },
        UpdateExpression:
            'set group_invites = list_append(if_not_exists(group_invites, :empty_list), :g)',
        ExpressionAttributeValues: {
            ':g': [{ group_id, group_name }],
            ':empty_list': [],
        },
        ReturnValues: 'UPDATED_NEW',
    };

    try {
        ddbAddRes = await ddb.update(inviteParams).promise();
    } catch (err) {
        logger.error('Append to user group_invites error: ', { err });
        callback(null, 'Error');
    }
    logger.info('ddb add res = ', ddbAddRes);

    // get display_username for user
    let displayUsername;
    try {
        const ddbResponse = await ddb
            .get({
                TableName: usersTable,
                Key: { id: user_id },
                AttributesToGet: ['display_username'],
            })
            .promise();
        displayUsername = ddbResponse.Item.display_username || {};
        logger.info(`Successfully received user id`, { displayUsername });
    } catch (err) {
        logger.error(`ERROR reading from DynamoDB: ${err.message}`);
        return {
            statusCode: 500,
            body: err.message,
        };
    }

    // add user to group's invited_members []
    // add group_id to user's group_invites []
    let ddbInvitedRes;
    const invitedParams = {
        TableName: groupsTable,
        Key: { group_id: group_id },
        UpdateExpression:
            'set invited_members = list_append(if_not_exists(invited_members, :empty_list), :im)',
        ExpressionAttributeValues: {
            ':im': [{ user_id: user_id, display_username: displayUsername }],
            ':empty_list': [],
        },
        ReturnValues: 'UPDATED_NEW',
    };

    try {
        ddbInvitedRes = await ddb.update(invitedParams).promise();
    } catch (err) {
        logger.error('Append to group invited_members error: ', { err });
        callback(null, 'Error');
    }
    logger.info('ddbInvitedRes = ', ddbInvitedRes);

    callback(null, 'Success');
};
