'use strict';

var AWS = require('aws-sdk');
var docClient = new AWS.DynamoDB.DocumentClient();

var elasticTranscoder = new AWS.ElasticTranscoder({
    region: process.env.ELASTIC_TRANSCODER_REGION
});

// 教科書ではpusVideoEntryToFirebase. DynamoDBに変更
function pushVideoEntryToDynamo(key, callback) {
    console.log('Adding video entry to DynamoDB at key:', key);

    var params = {
      TableName: '24-hour-video',
      Item:{
        id: key,
        key: {
          key: key,
          transcoding: true
        }
      }
    }

    docClient.put(params, function (err, data) {
      if (err) {
        console.log(err);
      } else {
        console.log(data);
      }
    });

    console.log('successfully added a record to DynamoDB')

}


exports.handler = function (event, context, callback) {
//    context.callbackWaitsForEmptyEventLoop = false;

    var key = event.Records[0].s3.object.key;

    var sourceKey = decodeURIComponent(key.replace(/\+/g, ' '));

    var outputKey = sourceKey.split('.')[0];

    var uniqueVideoKey = outputKey.split('/')[0];

    var params = {
        PipelineId: process.env.ELASTIC_TRANSCODER_PIPELINE_ID,
        Input: {
            Key: sourceKey
        },
        Outputs: [
            {
              Key: outputKey + '-720p' + '.mp4',
              PresetId: '1351620000001-000010' //Generic 720p
            }
        ]
    };

    elasticTranscoder.createJob(params, function (error, data) {
        if (error) {
            console.log('Error creating elastic transcoder job.');
            callback(error);
            return;
        }

        // the transcoding job started, so let's make a record in firebase
        // that the UI can show right away
        console.log('Elastic transcoder job created successfully');
        pushVideoEntryToDynamo(uniqueVideoKey, callback);
    });
};
