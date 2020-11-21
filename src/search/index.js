const aws = require('aws-sdk');
const { getLoggerPath } = require('./utils');

const ddb = new aws.DynamoDB.DocumentClient({ apiVersion: '2012-10-08' });

const logger = require(getLoggerPath()).child({
    service: 'search',
});

exports.handler = async (event, context) => {
    const { path = '', queryStringParameters: queryStringParams } = event;

    const userTable = process.env.USER_TABLE;
    const region = process.env.AWS_REGION;
    aws.config.update({ region: region });

    // retrieve user sub
    let userSub;
    try {
        userSub = event.requestContext.authorizer.claims.sub;
    } catch (err) {
        logger.error('Received error trying to get user sub:', { err });
        userSub = 'a1357cbb-1c1f-47c9-8862-9b909ff04cfd';
        // return {
        //     statusCode: 500,
        //     body: JSON.stringify('Error retrieving user sub'),
        // };
    }

    // call DynamoDB to retrieve user's friendslist
    let userFollowing;
    try {
        const ddbResponse = await ddb
            .get({
                TableName: userTable,
                Key: { id: userSub },
                AttributesToGet: ['following'],
            })
            .promise();
        logger.info(`Successfully retrieved following from the table.`);

        userFollowing = ddbResponse.Item.following || [];
    } catch (err) {
        logger.error(`ERROR when retrieving from DynamoDB: ${err.message}`);
        userFollowing = [];
    }

    console.log(`user ${userSub}'s following `, userFollowing);

    const users = [];

    return {
        statusCode: 200,
        body: JSON.stringify({
            results: {
                users: users,
            },
        }),
    };
};
