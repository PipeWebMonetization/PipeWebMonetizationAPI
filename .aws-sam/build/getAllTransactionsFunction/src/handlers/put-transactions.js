const dynamodb = require("aws-sdk/clients/dynamodb");
const docClient = new dynamodb.DocumentClient({ region: "sa-east-1" });

exports.putTransactionsHandler = async (event) => {
  let res = {
    statusCode: 200,
    headers: {
      "Content-Type": "application/json",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Headers": "Authorization,Content-Type",
      "Access-Control-Allow-Method": "GET,POST,OPTIONS",
    },
    body: { message: "OK", errors: [] },
  };
  let transactionsBatches = [];
  const batchSize = 25;
  const { transactions, pluginId, paymentPointer, date, totalValue } =
    JSON.parse(event.body);

  try {
    /* Split transactions into batches of batchSize */
    for (let i = 0; i < transactions.length; i += batchSize) {
      const batch = transactions.slice(i, i + batchSize);
      transactionsBatches.push(batch);
    }
    await Promise.all(
      transactionsBatches.map(async (batch) => {
        await writeTransactions(pluginId, paymentPointer, batch);
      })
    );
  } catch (error) {
    res.statusCode = 500;
    res.body.errors.push("Error writing transactions to DynamoDB");
    res.body.errors.push(JSON.stringify(error));
  }

  try {
    await updateTransactionsPerMonth(
      pluginId,
      paymentPointer,
      date,
      totalValue
    );
  } catch (error) {
    res.statusCode = 500;
    res.body.errors.push("Error updating transactions per month");
    res.body.errors.push(JSON.stringify(error));
  }

  try {
    await updateTransactionsPerDayOfWeek(
      pluginId,
      paymentPointer,
      date,
      totalValue
    );
  } catch (error) {
    res.statusCode = 500;
    res.body.errors.push("Error updating transactions per day of week");
    res.body.errors.push(JSON.stringify(error));
  }

  try {
    await updateTransactionsPerDayOfYear(
      pluginId,
      paymentPointer,
      date,
      totalValue
    );
  } catch (error) {
    res.statusCode = 500;
    res.body.errors.push("Error updating transactions per day of year");
    res.body.errors.push(JSON.stringify(error));
  }

  res.body = JSON.stringify(res.body);
  return res;
};

/**
 * It takes a list of transactions and writes them to DynamoDB
 * @param pluginId - The plugin ID of the plugin that is being used to process the payment.
 * @param paymentPointer - The payment pointer of the user who is paying the plugin
 * @param transactions - An array of objects with the following properties:
 * @returns A promise.
 */
const writeTransactions = (pluginId, paymentPointer, transactions) => {
  const transactionsTable = process.env.TRANSACTIONS_TABLE;
  const transactionsRequest = transactions.map((transaction) => {
    return {
      PutRequest: {
        Item: {
          pluginId: pluginId,
          date: transaction.date,
          paymentPointer: paymentPointer,
          value: transaction.value,
        },
      },
    };
  });
  var params = {
    RequestItems: {
      [transactionsTable]: transactionsRequest,
    },
  };
  return docClient.batchWrite(params).promise();
};

/**
 * If the item doesn't exist, create it with a default value of 0, otherwise add the value to the
 * existing value.
 * @param pluginIdValue - The pluginId of the plugin that is being updated
 * @param paymentPointer - "https://example.com/pay/1"
 * @param date - "2020-01-01T00:00:00.000Z"
 * @param totalValue - 0.01
 * @returns A promise.
 */
const updateTransactionsPerMonth = (
  pluginIdValue,
  paymentPointer,
  date,
  totalValue
) => {
  const eventDate = new Date(date);
  const year = eventDate.getFullYear();
  const month = eventDate.getMonth();

  var params = {
    TableName: process.env.TRANSACTIONS_PER_MONTH_TABLE,
    Key: {
      pluginId: pluginIdValue,
      paymentPointer: paymentPointer + "-" + year.toString(),
    },
    UpdateExpression: "set #month = if_not_exists(#month, :default) + :value",
    ExpressionAttributeNames: {
      "#month": month.toString(),
    },
    ExpressionAttributeValues: {
      ":value": totalValue,
      ":default": 0,
    },
  };

  return docClient.update(params).promise();
};

/**
 * If the item doesn't exist, create it with a default value of 0, otherwise add the value to the
 * existing value.
 * @param pluginId - The pluginId of the plugin that is being used.
 * @param paymentPointer - The payment pointer of the user who received the payment
 * @param date - "2020-01-01T00:00:00.000Z"
 * @param totalValue - The total value of the transaction
 * @returns A promise.
 */
const updateTransactionsPerDayOfYear = (
  pluginId,
  paymentPointer,
  date,
  totalValue
) => {
  const eventDate = new Date(date);
  const year = String(eventDate.getFullYear());
  const dayOfYear = Math.floor(
    (eventDate - new Date(year, 0, 0)) / 1000 / 60 / 60 / 24
  );
  var params = {
    TableName: process.env.TRANSACTIONS_PER_DAY_OF_YEAR_TABLE,
    Key: { pluginId: pluginId, paymentPointer: paymentPointer + "-" + year },
    UpdateExpression: "set #day = if_not_exists(#day, :default) + :value",
    ExpressionAttributeNames: {
      "#day": dayOfYear.toString(),
    },
    ExpressionAttributeValues: {
      ":value": totalValue,
      ":default": 0,
    },
  };

  return docClient.update(params).promise();
};

/**
 * If the item doesn't exist, create it with a default value of 0, otherwise add the value to the
 * existing value.
 * @param pluginIdValue - The pluginId of the plugin that the payment was made to
 * @param paymentPointer - "https://example.com/pay/1"
 * @param date - "2020-01-01T00:00:00.000Z"
 * @param totalValue - The total value of the transaction
 * @returns A promise.
 */
const updateTransactionsPerDayOfWeek = (
  pluginIdValue,
  paymentPointer,
  date,
  totalValue
) => {
  const eventDate = new Date(date);
  const year = String(eventDate.getFullYear());
  const day = eventDate.getDay();

  var params = {
    TableName: process.env.TRANSACTIONS_PER_DAY_OF_WEEK_TABLE,
    Key: {
      pluginId: pluginIdValue,
      paymentPointer: paymentPointer + "-" + year,
    },
    UpdateExpression: "set #day = if_not_exists(#day, :default) + :value",
    ExpressionAttributeNames: {
      "#day": day.toString(),
    },
    ExpressionAttributeValues: {
      ":value": totalValue,
      ":default": 0,
    },
  };

  return docClient.update(params).promise();
};
