const AWSXRay = require('aws-xray');
const aws = AWSXRay.captureAWS(require('aws-sdk'));

const { getLoggerPath } = require('./utils');
const logger = require(getLoggerPath()).child({
    service: 'user-groups-leave',
});

const ddb = new aws.DynamoDB.DocumentClient({ apiVersion: '2012-10-08' });

// POST: body expects { group_id }
exports.handler = async (event, context) => {
    logger.info(`Received request at User Groups Leave endpoint!`);
    const { body } = event;
    const { group_id } = JSON.parse(body);

    logger.info(`Leaving ${group_id}`);

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
                AttributesToGet: ['groups', 'display_username'],
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
    const groupIndex = userInfo.groups.findIndex((g) => g.id === group_id);

    logger.info('users remove groupIndex = ', { groupIndex });

    let ddbUserGroupsUpdateRes;
    const respondParams = {
        TableName: usersTable,
        Key: { id: userSub },
        UpdateExpression: `
           remove groups[${groupIndex}]
        `,
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

    // if user is admin: remove group from all of the members' groups [] and group_invites []
    const isAdminLeaving =
        groupInfo.members.filter((m) => m.is_admin)[0].id === userSub;

    if (isAdminLeaving) {
        logger.info(
            'Admin left group, need to remove group, group_invites from all users, delete group'
        );

        for (const member of [
            ...groupInfo.members.filter((m) => !m.is_admin),
            ...(groupInfo.invited_members || []),
        ]) {
            // get user info
            let memberInfo;
            try {
                const ddbResponse = await ddb
                    .get({
                        TableName: usersTable,
                        Key: { id: member.id },
                        AttributesToGet: [
                            'groups',
                            'group_invites',
                            'display_username',
                        ],
                    })
                    .promise();
                memberInfo = ddbResponse.Item || {};
                logger.info(`Successfully received member info`, {
                    memberInfo,
                });
            } catch (err) {
                logger.error(`ERROR reading from DynamoDB: ${err.message}`);
                return {
                    statusCode: 500,
                    body: err.message,
                };
            }

            // update user with new groups []
            const groupIndex = (memberInfo.groups || []).findIndex(
                (g) => g.id === group_id
            );
            const groupInviteIndex = (memberInfo.group_invites || []).findIndex(
                (gi) => gi.id === group_id
            );

            logger.info('member remove groupIndex = ', { groupIndex });
            logger.info('member remove groupInviteIndex = ', {
                groupInviteIndex,
            });

            let ddbMemberUpdateRes;
            const removeParams = {
                TableName: usersTable,
                Key: { id: member.id },
                UpdateExpression: `
                    remove ${groupIndex >= 0 ? `groups[${groupIndex}]` : ''}  
                    ${
                        groupInviteIndex >= 0
                            ? `group_invites[${groupInviteIndex}]`
                            : ''
                    }`,
                ReturnValues: 'ALL_NEW',
            };

            try {
                const ddbResponse = await ddb.update(removeParams).promise();
                logger.info('member update ddbResponse = ', {
                    ddbResponse,
                });
                ddbMemberUpdateRes = ddbResponse.Item || {};
                logger.info(`Successfully updated members' groups `, {
                    ddbUserGroupsUpdateRes,
                });
            } catch (err) {
                logger.error(`ERROR reading from DynamoDB: ${err.message}`);
                return {
                    statusCode: 500,
                    body: err.message,
                };
            }
        }

        // delete group
        logger.info('Deleting group...');

        const deleteParams = {
            TableName: groupsTable,
            Key: { id: group_id },
            ConditionalExpression: 'size (members) = 1',
        };

        let ddbDeleteRes;
        try {
            const ddbResponse = await ddb.delete(deleteParams).promise();
            ddbDeleteRes = ddbResponse.Item || {};
            logger.info(`Successfully deleted group`, {
                ddbResponse,
            });
        } catch (err) {
            logger.error(`ERROR deleting from DynamoDB: ${err.message}`);
            return {
                statusCode: 500,
                body: err.message,
            };
        }
    } else {
        logger.info('Leaving user is not admin, removing user from group');

        // remove user from group
        const memberIndex = groupInfo.members.findIndex(
            (m) => m.id === userSub
        );
        logger.info('invitedMemberIndex = ', { memberIndex });

        let ddbGroupMembersUpdateRes;
        const groupParams = {
            TableName: groupsTable,
            Key: { id: group_id },
            UpdateExpression: `
                remove members[${memberIndex}]
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
    }

    logger.info('Lambda execution complete...');
    return {
        statusCode: 200,
        body: JSON.stringify({ success: true }),
    };
};
