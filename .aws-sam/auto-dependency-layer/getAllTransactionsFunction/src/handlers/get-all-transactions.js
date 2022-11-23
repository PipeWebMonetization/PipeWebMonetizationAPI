const dynamodb = require("aws-sdk/clients/dynamodb");
const docClient = new dynamodb.DocumentClient({ region: "sa-east-1" });

exports.getAllTransactionsHandler = (event, context, callback) => {
  const pluginId = event.pluginId;
  const type = event.type;
  const weekParams = {
    TableName: "transactionsPerDayOfWeek",
    KeyConditionExpression: "pluginId = :pluginId",
    ExpressionAttributeValues: {
      ":pluginId": pluginId,
    },
  };

  const dayParams = {
    TableName: "transactionsPerDayOfYear",
    KeyConditionExpression: "pluginId = :pluginId",
    ExpressionAttributeValues: {
      ":pluginId": pluginId,
    },
  };
  const monthParams = {
    TableName: "transactionsPerMonth",
    KeyConditionExpression: "pluginId = :pluginId",
    ExpressionAttributeValues: {
      ":pluginId": pluginId,
    },
  };
  if (type == "perDayOfWeek") {
    docClient.query(weekParams, function (err, data) {
      if (err) {
        callback(err);
      } else {
        callback(null, {
          statusCode: 201,
          items: data.Items,
        });
      }
    });
  } else if (type == "perDayOfYear") {
    docClient.query(dayParams, function (err, data) {
      if (err) {
        callback(err);
      } else {
        callback(null, {
          statusCode: 201,
          items: data.Items,
        });
      }
    });
  } else if (type == "perMonth") {
    docClient.query(monthParams, function (err, data) {
      if (err) {
        callback(err);
      } else {
        callback(null, {
          statusCode: 201,
          items: data.Items,
        });
      }
    });
  } else if (type == "all") {
    let weekData;
    let yearData;
    let monthData;
    docClient.query(weekParams, function (err, data) {
      if (err) {
        callback(err);
      } else {
        weekData = data.Items;
        docClient.query(dayParams, function (err, data) {
          if (err) {
            callback(err);
          } else {
            yearData = data.Items;
            docClient.query(monthParams, function (err, data) {
              if (err) {
                callback(err);
              } else {
                monthData = data.Items;
                callback(null, {
                  statusCode: 201,
                  items: {
                    weekData: weekData,
                    yearData: yearData,
                    monthData: monthData,
                  },
                });
              }
            });
          }
        });
      }
    });
  } else {
    callback(new Error(type + " is not a valid query type"));
  }
};
