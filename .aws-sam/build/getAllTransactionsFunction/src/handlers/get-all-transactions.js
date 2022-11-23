const dynamodb = require("aws-sdk/clients/dynamodb");
const docClient = new dynamodb.DocumentClient({ region: "sa-east-1" });

exports.getAllTransactionsHandler = async (event) => {
  const { pluginId, type } = event;
  let res = {
    statusCode: 200,
    body: { message: "OK" },
  };

  const weekParams = {
    TableName: process.env.TRANSACTIONS_PER_DAY_OF_WEEK_TABLE,
    KeyConditionExpression: "pluginId = :pluginId",
    ExpressionAttributeValues: {
      ":pluginId": pluginId,
    },
  };
  const dayParams = {
    TableName: process.env.TRANSACTIONS_PER_DAY_OF_YEAR_TABLE,
    KeyConditionExpression: "pluginId = :pluginId",
    ExpressionAttributeValues: {
      ":pluginId": pluginId,
    },
  };
  const monthParams = {
    TableName: process.env.TRANSACTIONS_PER_MONTH_TABLE,
    KeyConditionExpression: "pluginId = :pluginId",
    ExpressionAttributeValues: {
      ":pluginId": pluginId,
    },
  };

  switch (type) {
    case "all":
      try {
        weekRes = await docClient.query(weekParams).promise();
        monthRes = await docClient.query(monthParams).promise();
        yearRes = await docClient.query(dayParams).promise();
        res.body = {
          weekData: weekRes.Items,
          monthData: monthRes.Items,
          yearData: yearRes.Items,
        };
      } catch (error) {
        res.statusCode = 500;
        res.body = { message: JSON.stringify(error) };
      }
      break;

    case "perMonth":
      try {
        monthRes = await docClient.query(monthParams).promise();
        res.body = {
          items: monthRes.Items,
        };
      } catch (error) {
        res.statusCode = 500;
        res.body = { message: JSON.stringify(error) };
      }
      break;

    case "perDayOfYear":
      try {
        yearRes = await docClient.query(dayParams).promise();
        res.body = {
          items: yearRes.Items,
        };
      } catch (error) {
        res.statusCode = 500;
        res.body = { message: JSON.stringify(error) };
      }
      break;

    case "perDayOfWeek":
      try {
        weekRes = await docClient.query(weekParams).promise();
        res.body = {
          items: weekRes.Items,
        };
      } catch (error) {
        res.statusCode = 500;
        res.body = { message: JSON.stringify(error) };
      }
      break;
    default:
      res.statusCode = 500;
      res.body = { message: type + " is not a valid query type" };
      break;
  }

  return res;
};
