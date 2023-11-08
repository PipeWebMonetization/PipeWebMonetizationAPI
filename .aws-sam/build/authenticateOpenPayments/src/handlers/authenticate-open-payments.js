const dynamodb = require("aws-sdk/clients/dynamodb");
const docClient = new dynamodb.DocumentClient({ region: "sa-east-1" });

exports.authenticateOpenPayments = async (event) => {
  if (event.httpMethod !== "GET") {
    return {
      statusCode: 405,
      body: `${event.httpMethod} method Not Allowed`,
    };
  }
 
  res.body = JSON.stringify({"hello": "world"});
  return res;
};
