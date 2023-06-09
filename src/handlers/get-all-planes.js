import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import { DynamoDBDocumentClient, ScanCommand } from '@aws-sdk/lib-dynamodb'
import { headers } from './constants.js'

// Create clients and set shared const values outside of the handler.

// Create a DocumentClient that represents the query to add an item
const client = new DynamoDBClient({})
const ddbDocClient = DynamoDBDocumentClient.from(client)

// Get the DynamoDB table name from environment variables
const tableName = process.env.PLANE_TABLE

export const getAllPlanesHandler = async (event) => {
  if (event.httpMethod !== 'GET') {
    throw new Error(`Only accepts GET method, you tried: ${event.httpMethod}`)
  }
  // All log statements are written to CloudWatch
  console.info('received:', event)
  console.info('tableName:', tableName)

  // get all items from the table (only first 1MB data, you can use `LastEvaluatedKey` to get the rest of data)
  // https://docs.aws.amazon.com/AWSJavaScriptSDK/latest/AWS/DynamoDB/DocumentClient.html#scan-property
  // https://docs.aws.amazon.com/amazondynamodb/latest/APIReference/API_Scan.html
  let items = []
  try {
    const data = await ddbDocClient.send(
      new ScanCommand({ TableName: tableName })
    )
    items = data.Items
  } catch (err) {
    console.log('Error', err)
  }

  const response = {
    statusCode: 200,
    headers: headers,
    body: JSON.stringify(items),
  }

  // All log statements are written to CloudWatch
  console.info(
    `response from: ${event.path} statusCode: ${response.statusCode} body: ${response.body}`
  )
  return response
}
