const aws = require('aws-sdk');

const { getLoggerPath } = require('./utils');
const logger = require(getLoggerPath()).child({
    service: 'groups-kick',
});

const ddb = new aws.DynamoDB.DocumentClient({ apiVersion: '2012-10-08' });

// POST: body expects { group_id }
exports.handler = async (event, context) => {
    logger.info(`Received request at Groups Kick endpoint!`);
    const { body } = event;
    const { group_id, user_id } = JSON.parse(body);

    logger.info(`Kicking user ${user_id} from ${group_id}`);

    // configure aws-sdk
    const groupsTable = process.env.GROUPS_TABLE;
    const usersTable = process.env.USERS_TABLE;
    const region = process.env.AWS_REGION;
    aws.config.update({ region: region });

    // get user info of kicked member
    let userInfo;
    try {
        const ddbResponse = await ddb
            .get({
                TableName: usersTable,
                Key: { id: user_id },
                AttributesToGet: [
                    'groups',
                    'display_username',
                    'group_invites',
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

    // update user with new groups []
    const groupIndex = (userInfo.groups || []).findIndex(
        (g) => g.id === group_id
    );
    const groupInvitesIndex = (userInfo.group_invites || []).findIndex(
        (g) => g.id === group_id
    );

    logger.info('users remove groupIndex = ', { groupIndex });
    logger.info('users remove groupInvitesIndex = ', { groupInvitesIndex });

    let ddbUserGroupsUpdateRes;
    const respondParams = {
        TableName: usersTable,
        Key: { id: user_id },
        UpdateExpression: `
            remove ${groupIndex >= 0 ? `groups[${groupIndex}]` : ''}  
            ${
                groupInvitesIndex >= 0
                    ? `group_invites[${groupInvitesIndex}]`
                    : ''
            }`,
        ReturnValues: 'ALL_NEW',
    };

    try {
        const ddbResponse = await ddb.update(respondParams).promise();
        logger.info('user update ddbResponse = ', { ddbResponse });
        ddbUserGroupsUpdateRes = ddbResponse.Item || {};
        logger.info(`Successfully updated user's groups `, {
            ddbUserGroupsUpdateRes,
        });
    } catch (err) {
        logger.error(`ERROR reading from DynamoDB: ${err.message}`);
        return {
            statusCode: 500,
            body: err.message,
        };
    }

    // get group info
    let groupInfo;
    try {
        const ddbResponse = await ddb
            .get({
                TableName: groupsTable,
                Key: { id: group_id },
                AttributesToGet: ['members', 'invited_members'],
            })
            .promise();
        groupInfo = ddbResponse.Item || {};
        logger.info(`Successfully received group info`, { groupInfo });
    } catch (err) {
        logger.error(`ERROR reading from DynamoDB: ${err.message}`);
        return {
            statusCode: 500,
            body: err.message,
        };
    }

    logger.info('Removing user from group');

    // remove user from group
    const memberIndex = (groupInfo.members || []).findIndex(
        (m) => m.id === user_id
    );
    const invitedMemberIndex = (groupInfo.invited_members || []).findIndex(
        (m) => m.id === user_id
    );
    logger.info('memberIndex = ', { memberIndex });
    logger.info('invitedMemberIndex = ', { invitedMemberIndex });

    let ddbGroupMembersUpdateRes;
    const groupParams = {
        TableName: groupsTable,
        Key: { id: group_id },
        UpdateExpression: `
            remove ${memberIndex >= 0 ? `members[${memberIndex}]` : ''}
            ${
                invitedMemberIndex >= 0
                    ? `invited_members[${invitedMemberIndex}]`
                    : ''
            }
        `,
        ReturnValues: 'ALL_NEW',
    };

    try {
        const ddbResponse = await ddb.update(groupParams).promise();
        ddbGroupMembersUpdateRes = ddbResponse.Item || {};
        logger.info(`Successfully updated groups members`, {
            ddbGroupMembersUpdateRes,
        });
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
        body: JSON.stringify({ success: true }),
    };
};
