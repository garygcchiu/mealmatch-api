const AWSXRay = require('aws-xray');
const aws = AWSXRay.captureAWS(require('aws-sdk'));
const { getLoggerPath } = require('./utils');

const ddb = new aws.DynamoDB.DocumentClient({ apiVersion: '2012-10-08' });

const logger = require(getLoggerPath()).child({
    service: 'user-appetite',
});

const MODES = {
    GET_MUTUAL: 0,
    EDIT: 1,
};

exports.handler = async (event, context) => {
    const {
        path = '',
        queryStringParameters: queryStringParams,
        httpMethod,
        body,
    } = event;
    const MODE = httpMethod === 'GET' ? MODES.GET_MUTUAL : MODES.EDIT;

    const usersTable = process.env.USER_TABLE;
    const region = process.env.AWS_REGION;
    aws.config.update({ region: region });

    logger.info(`Processing ${httpMethod} request at ${path}...`, {
        queryStringParams,
    });

    // call DynamoDB
    switch (MODE) {
        case MODES.GET_MUTUAL:
            const { user1, user2 } = queryStringParams;
            let mutualAppetite = [];

            try {
                const user1ddbResponse = await ddb
                    .query({
                        TableName: usersTable,
                        IndexName: 'gsiUserAppetite',
                        KeyConditionExpression: 'display_username = :user1',
                        ExpressionAttributeValues: { ':user1': user1 },
                    })
                    .promise();
                logger.info(
                    `Successfully retrieved user1 appetite from the table.`,
                    { user1ddbResponse }
                );

                const user2ddbResponse = await ddb
                    .query({
                        TableName: usersTable,
                        IndexName: 'gsiUserAppetite',
                        KeyConditionExpression: 'display_username = :user2',
                        ExpressionAttributeValues: { ':user2': user2 },
                    })
                    .promise();
                logger.info(
                    `Successfully retrieved user2 appetite from the table.`,
                    { user2ddbResponse }
                );

                mutualAppetite = (
                    user1ddbResponse.Items[0].appetite || []
                ).filter((i) =>
                    (user2ddbResponse.Items[0].appetite || []).includes(i)
                );
            } catch (err) {
                logger.error(
                    `ERROR when retrieving from DynamoDB: ${err.message}`
                );
                mutualAppetite = [];
            }

            return {
                statusCode: 200,
                body: JSON.stringify(mutualAppetite),
            };
        case MODES.EDIT:
            let userAppetite;
            logger.info('Setting appetite to ', { appetite: JSON.parse(body) });

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

            const updateParams = {
                TableName: usersTable,
                Key: { id: userSub },
                UpdateExpression: 'set appetite = :a',
                ExpressionAttributeValues: {
                    ':a': JSON.parse(body) || [],
                },
                ReturnValues: 'UPDATED_NEW',
            };

            try {
                const ddbResponse = await ddb.update(updateParams).promise();
                logger.info(`Edited user appetite in the table`);

                userAppetite = ddbResponse.Attributes.appetite || [];
            } catch (err) {
                logger.error(`ERROR when retrieving from DynamoDB`, { err });
                userAppetite = [];
            }

            return {
                statusCode: 200,
                body: JSON.stringify(userAppetite),
            };
    }

    return {
        statusCode: 200,
        body: JSON.stringify([]),
    };
};
