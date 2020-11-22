const aws = require('aws-sdk');

const { getLoggerPath } = require('./utils');
const ddb = new aws.DynamoDB.DocumentClient({ apiVersion: '2012-10-08' });

const logger = require(getLoggerPath()).child({
    service: 'users-edit',
});

exports.handler = async (event, context) => {
    logger.info(`Received request at Users Edit Info endpoint!`);

    const { body } = event;
    const updateObj = JSON.parse(body);

    // TODO: validate input

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

    // call DynamoDB to add to user's following or display_username
    let userInfo;
    const updateParams = {
        TableName: usersTable,
        Key: { id: userSub },
        UpdateExpression: updateObj.set_following
            ? 'set following = :sf'
            : updateObj.add_following
            ? 'set following = list_append(if_not_exists(following, :empty_list), :af)'
            : 'set display_username = if_not_exists(display_username, :a),',
        ExpressionAttributeValues: updateObj.set_following
            ? { ':sf': updateObj.set_following }
            : updateObj.add_following
            ? {
                  ':af': updateObj.add_following,
                  ':empty_list': [],
              }
            : { ':a': updateObj.display_username },
        ReturnValues: 'UPDATED_NEW',
    };

    try {
        const ddbResponse = await ddb.update(updateParams).promise();
        logger.info(`Successfully updated user info`, { ddbResponse });
        userInfo = ddbResponse.Attributes;
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
        body: JSON.stringify(userInfo),
    };
};
