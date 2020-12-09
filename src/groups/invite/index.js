const AWSXRay = require('aws-xray');
const aws = AWSXRay.captureAWS(require('aws-sdk'));
const sns = new aws.SNS({ apiVersion: '2010-03-31' });

const { getLoggerPath } = require('./utils');

const logger = require(getLoggerPath()).child({
    service: 'groups-invite',
});

// POST: body expects { group_id, user_id, invited_by }
exports.handler = async (event, context) => {
    logger.info(`Received request at Groups Invite endpoint!`);
    const { body } = event;
    const { group_id, user_id, group_name, invited_by } = JSON.parse(body);

    logger.info(
        `user ${user_id} to group_id ${group_id}, name ${group_name}, invited by ${invited_by} in SNS`
    );
    const region = process.env.AWS_REGION;
    aws.config.update({ region: region });

    const snsParams = {
        Message: body,
        TopicArn: process.env.GROUP_INVITES_SNS_TOPIC_ARN,
    };

    logger.info('sns params = ', { snsParams });

    // publish message to SNS
    let publishMessageId;
    try {
        const publishRes = await sns.publish(snsParams).promise();
        publishMessageId = publishRes.MessageId;
    } catch (err) {
        logger.error('Error publishing message to SNS: ', { err });
        return {
            statusCode: 500,
            body: 'ERROR_PUBLISHING',
        };
    }
    logger.info('Successfully published, message ID = ', {
        publishMessageId,
    });

    logger.info('Lambda execution complete...');
    return {
        statusCode: 200,
        body: publishMessageId,
    };
};
