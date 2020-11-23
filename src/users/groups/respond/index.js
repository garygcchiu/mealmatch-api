const aws = require('aws-sdk');

const { getLoggerPath } = require('./utils');
const logger = require(getLoggerPath()).child({
    service: 'user-groups-respond',
});

const ddb = new aws.DynamoDB.DocumentClient({ apiVersion: '2012-10-08' });

// POST: body expects { group_id, group_name, accept }
exports.handler = async (event, context) => {
    logger.info(`Received request at User Groups Respond endpoint!`);
    const { body } = event;
    const { group_id, group_name, accept } = JSON.parse(body);

    logger.info(
        `${
            accept ? 'Accepting' : 'Declining'
        } group invitation to ${group_id} aka ${group_name}`
    );

    // configure aws-sdk
    const groupsTable = process.env.GROUPS_TABLE;
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

    // get user info
    let userInfo;
    try {
        const ddbResponse = await ddb
            .get({
                TableName: usersTable,
                Key: { id: userSub },
                AttributesToGet: [
                    'groups',
                    'group_invites',
                    'display_username',
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

    // update user with new groups [] and group_invites []
    const groupInviteIndex = userInfo.group_invites.findIndex(
        (gi) => gi.group_id === group_id
    );

    logger.info('users remove groupInviteIndex = ', { groupInviteIndex });

    let ddbUserGroupsUpdateRes;
    const respondParams = {
        TableName: usersTable,
        Key: { id: userSub },
        UpdateExpression: `
           ${
               accept
                   ? 'set groups = list_append(if_not_exists(groups, :empty_list), :g)'
                   : ''
           }
           remove group_invites[${groupInviteIndex}]
        `,
        ...(accept && {
            ExpressionAttributeValues: {
                ':g': [{ id: group_id, name: group_name }],
                ':empty_list': [],
            },
        }),
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

    // update group to remove user from invited_members [], add to members []
    // get group info
    let groupInfo;
    try {
        const ddbResponse = await ddb
            .get({
                TableName: groupsTable,
                Key: { group_id: group_id },
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

    // update user with new groups [] and group_invites []
    const invitedMemberIndex = groupInfo.invited_members.findIndex(
        (im) => im.user_id === userSub
    );
    logger.info('invitedMemberIndex = ', { invitedMemberIndex });

    let ddbGroupMembersUpdateRes;
    const groupParams = {
        TableName: groupsTable,
        Key: { group_id: group_id },
        UpdateExpression: `
            ${
                accept
                    ? 'set members = list_append(if_not_exists(members, :empty_list), :m)'
                    : ''
            }
            remove invited_members[${invitedMemberIndex}]
        `,
        ...(accept && {
            ExpressionAttributeValues: {
                ':empty_list': [],
                ':m': [
                    {
                        user_id: userSub,
                        display_username: userInfo.display_username,
                    },
                ],
            },
        }),
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
