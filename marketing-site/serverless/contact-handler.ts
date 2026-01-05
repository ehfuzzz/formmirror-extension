import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses'
import type { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda'

const ses = new SESClient({ region: process.env.AWS_REGION || 'us-east-1' })
const allowedOrigin = process.env.ALLOWED_ORIGIN || 'https://formmirror.dev'
const destinationEmail = process.env.DESTINATION_EMAIL || ''

interface ContactPayload {
  name?: string
  email?: string
  company?: string
  usage?: string
  consent?: boolean
}

function parsePayload(event: APIGatewayProxyEventV2): ContactPayload | null {
  try {
    if (!event.body) return null
    const data = JSON.parse(event.body)
    if (typeof data.name !== 'string' || data.name.trim().length === 0) return null
    if (typeof data.email !== 'string' || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(data.email)) return null
    if (typeof data.usage !== 'string' || data.usage.trim().length === 0) return null
    return {
      name: data.name.trim(),
      email: data.email.trim(),
      company: typeof data.company === 'string' ? data.company.trim() : undefined,
      usage: data.usage.trim(),
      consent: Boolean(data.consent),
    }
  } catch (error) {
    console.error('Invalid payload', error)
    return null
  }
}

export const handler = async (
  event: APIGatewayProxyEventV2,
): Promise<APIGatewayProxyResultV2> => {
  if (event.requestContext.http.method !== 'POST') {
    return {
      statusCode: 405,
      headers: buildHeaders(),
      body: JSON.stringify({ message: 'Method Not Allowed' }),
    }
  }

  if (!destinationEmail) {
    return {
      statusCode: 500,
      headers: buildHeaders(),
      body: JSON.stringify({ message: 'Destination email is not configured.' }),
    }
  }

  const payload = parsePayload(event)
  if (!payload) {
    return {
      statusCode: 422,
      headers: buildHeaders(),
      body: JSON.stringify({ message: 'Invalid payload' }),
    }
  }

  try {
    await ses.send(
      new SendEmailCommand({
        Destination: { ToAddresses: [destinationEmail] },
        Source: destinationEmail,
        Message: {
          Subject: { Data: `FormMirror contact from ${payload.name}` },
          Body: {
            Text: {
              Data: `Name: ${payload.name}\nEmail: ${payload.email}\nCompany: ${payload.company ?? 'N/A'}\nConsent: ${payload.consent}\n\nUsage:\n${payload.usage}`,
            },
          },
        },
        ReplyToAddresses: [payload.email],
      }),
    )

    return {
      statusCode: 200,
      headers: buildHeaders(),
      body: JSON.stringify({ message: 'Sent' }),
    }
  } catch (error) {
    console.error('Failed to send email', error)
    return {
      statusCode: 500,
      headers: buildHeaders(),
      body: JSON.stringify({ message: 'Internal Server Error' }),
    }
  }
}

function buildHeaders() {
  return {
    'Access-Control-Allow-Origin': allowedOrigin,
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Content-Type': 'application/json',
  }
}
