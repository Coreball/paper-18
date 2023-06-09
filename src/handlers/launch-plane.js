import { DynamoDBClient } from '@aws-sdk/client-dynamodb'
import {
  DynamoDBDocumentClient,
  GetCommand,
  PutCommand,
} from '@aws-sdk/lib-dynamodb'
import { v4 as uuidv4 } from 'uuid'
import { headers } from './constants.js'

// Create clients and set shared const values outside of the handler.

// Create a DocumentClient that represents the query to add an item
const client = new DynamoDBClient({})
const ddbDocClient = DynamoDBDocumentClient.from(client)

// Get the DynamoDB table name from environment variables
const tableName = process.env.PLANE_TABLE

export const launchPlaneHandler = async (event) => {
  if (event.httpMethod !== 'POST') {
    throw new Error(`Only accepts POST method, you tried: ${event.httpMethod}`)
  }
  // All log statements are written to CloudWatch
  console.info('Received:', event)
  console.info('tableName:', tableName)

  // Get data from the body of the request
  const { id, user, origin, heading, timestamp, stamp } = JSON.parse(event.body)
  // Explicitly enumerate all properties to add
  const launch = {
    user: user,
    origin: origin,
    heading: heading,
    timestamp: timestamp,
    stamp: {
      x: stamp.x,
      y: stamp.y,
      angle: stamp.angle,
      text: stamp.text,
      variant: stamp.variant,
    },
  }

  let response = {
    statusCode: 200,
    headers: headers,
  }

  // If ID supplied, update an existing plane
  if (id) {
    console.info('Updating plane id:', id)
    try {
      // This could probably be made more efficient
      const get = await ddbDocClient.send(
        new GetCommand({ TableName: tableName, Key: { id: id } })
      )
      console.info('Get response', get)
      const item = get.Item
      const put = await ddbDocClient.send(
        new PutCommand({
          TableName: tableName,
          Item: {
            id: id,
            owner: item.owner,
            launches: [...item.launches, launch],
          },
        })
      )
      console.info('Put response', put)
    } catch (err) {
      console.error('Error', err.stack)
    }
  }
  // If no ID, create a new plane
  else {
    try {
      const newId = uuidv4()
      console.info('Creating plane id:', newId)
      const put = await ddbDocClient.send(
        new PutCommand({
          TableName: tableName,
          Item: { id: newId, owner: user, launches: [launch] },
        })
      )
      console.info('Put response', put)
      response.body = JSON.stringify({ id: newId })
    } catch (err) {
      console.error('Error', err.stack)
    }
  }

  // All log statements are written to CloudWatch
  console.info(
    `Response from: ${event.path} statusCode: ${response.statusCode} body: ${response.body}`
  )
  return response
}
