import { SESClient, SendEmailCommand } from "@aws-sdk/client-ses";

const ses = new SESClient({ region: "us-east-2" });

export const handler = async (event) => {
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Allow-Methods": "POST, OPTIONS"
  };

  const method = event.requestContext?.http?.method || event.httpMethod;

  if (method === "OPTIONS") {
    return { statusCode: 200, headers, body: "" };
  }

  try {
    const body = JSON.parse(event.body);
    const { name, email, company, message } = body;

    if (!name || !email) {
      return { statusCode: 400, headers, body: JSON.stringify({ error: "Name and email are required" }) };
    }

    const emailBody = `
New Contact Form Submission - Cognetic Machines

Contact Details:
- Name: ${name}
- Email: ${email}
- Company: ${company || "Not provided"}

Message:
${message || "No message provided"}
    `;

    await ses.send(new SendEmailCommand({
      Source: "founders@cogneticmachines.com",  // Must be verified in SES
      Destination: { ToAddresses: ["founders@cogneticmachines.com"] },
      ReplyToAddresses: [email],
      Message: {
        Subject: { Data: `New Lead: ${name}${company ? ` at ${company}` : ""}` },
        Body: { Text: { Data: emailBody } }
      }
    }));

    return { statusCode: 200, headers, body: JSON.stringify({ success: true }) };
  } catch (error) {
    console.error(error);
    return { statusCode: 500, headers, body: JSON.stringify({ success: false, error: error.message }) };
  }
};
