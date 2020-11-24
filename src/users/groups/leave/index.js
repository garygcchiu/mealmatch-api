const aws = require('aws-sdk');

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

    // update user with new groups [] and group_invites []
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

    // update group to remove user from members []
    // get group info
    let groupInfo;
    try {
        const ddbResponse = await ddb
            .get({
                TableName: groupsTable,
                Key: { id: group_id },
                AttributesToGet: ['members'],
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
    const memberIndex = groupInfo.members.findIndex((m) => m.id === userSub);
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

    logger.info('Lambda execution complete...');
    return {
        statusCode: 200,
        body: JSON.stringify({ success: true }),
    };
};
