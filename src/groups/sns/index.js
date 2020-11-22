const aws = require('aws-sdk');
const { getLoggerPath } = require('./utils');

const ddb = new aws.DynamoDB.DocumentClient({ apiVersion: '2012-10-08' });

const logger = require(getLoggerPath()).child({
    service: 'groups-sns',
});

exports.handler = async (event, context, callback) => {
    logger.info('Received Group Invite SNS message!!!');
    const sns = event.Records[0];

    logger.info('SNS = ', { sns: sns });

    callback(null, 'Success');
};
