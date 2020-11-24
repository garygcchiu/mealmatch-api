const aws = require('aws-sdk');
const { v4: uuidv4 } = require('uuid');

const { getLoggerPath } = require('./utils');
const ddb = new aws.DynamoDB.DocumentClient({ apiVersion: '2012-10-08' });

const logger = require(getLoggerPath()).child({
    service: 'groups-create',
});

// POST: body expects { group_name, user_display_username }
exports.handler = async (event, context) => {
    logger.info(`Received request at Groups Create endpoint!`);
    const { body } = event;
    const { group_name, user_display_username } = JSON.parse(body);

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

    // call DynamoDB
    const groupId = uuidv4();
    const params = {
        TableName: groupsTable,
        Item: {
            id: groupId,
            name: group_name,
            members: [
                {
                    display_username: user_display_username,
                    id: userSub,
                    is_admin: true,
                },
            ],
        },
        ReturnValues: 'ALL_OLD',
    };

    try {
        await ddb.put(params).promise();
        logger.info(`Successfully created group`);
    } catch (err) {
        logger.error(`ERROR inserting to DynamoDB: ${err.message}`);
        return {
            statusCode: 500,
            body: err.message,
        };
    }

    // add group to user
    let userInfo;
    const updateParams = {
        TableName: usersTable,
        Key: { id: userSub },
        UpdateExpression:
            'set groups = list_append(if_not_exists(groups, :empty_list), :g)',
        ExpressionAttributeValues: {
            ':g': [{ id: groupId, name: group_name }],
            ':empty_list': [],
        },
        ReturnValues: 'UPDATED_NEW',
    };

    try {
        const ddbResponse = await ddb.update(updateParams).promise();
        logger.info(`Successfully updated user groups`, { ddbResponse });
        userInfo = ddbResponse.Attributes;
    } catch (err) {
        logger.error(`ERROR updating to DynamoDB: ${err.message}`);
        return {
            statusCode: 500,
            body: err.message,
        };
    }

    logger.info('Lambda execution complete...');
    return {
        statusCode: 200,
        body: JSON.stringify(userInfo),
    };
};
