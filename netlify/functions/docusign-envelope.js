const { docusign } = require('docusign-esign');
const admin = require('firebase-admin');

// Initialize Firebase Admin if not already initialized
if (!admin.apps.length) {
  // Use environment variables for Firebase config
  const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
  });
}

const db = admin.firestore();

exports.handler = async (event, context) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method Not Allowed' })
    };
  }

  try {
    const { signer, return_url, appointment } = JSON.parse(event.body);
    
    // Initialize DocuSign client
    const dsApiClient = new docusign.ApiClient();
    dsApiClient.setBasePath(process.env.DOCUSIGN_API_BASE_URL || 'https://demo.docusign.net/restapi');
    
    // Get JWT token
    const token = await getDocusignJwtToken(dsApiClient);
    dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + token.accessToken);
    
    // Create envelope
    const envelope = await createEnvelope(dsApiClient, signer, return_url, appointment);
    
    // Save to Firestore
    await saveAppointment(appointment, envelope);
    
    return {
      statusCode: 200,
      body: JSON.stringify({
        envelopeId: envelope.envelopeId,
        redirectUrl: envelope.redirectUrl
      })
    };
    
  } catch (error) {
    console.error('Error creating DocuSign envelope:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ 
        error: 'Failed to create DocuSign envelope',
        details: error.message 
      })
    };
  }
};

async function getDocusignJwtToken(apiClient) {
  const jwtLifeSec = 10 * 60; // 10 minutes
  const privateKey = process.env.DOCUSIGN_PRIVATE_KEY.replace(/\\n/g, '\n');
  
  return apiClient.requestJWTUserToken(
    process.env.DOCUSIGN_INTEGRATION_KEY,
    process.env.DOCUSIGN_USER_ID,
    ['signature', 'impersonation'],
    privateKey,
    jwtLifeSec
  );
}

async function createEnvelope(apiClient, signer, returnUrl, appointment) {
  const envelopesApi = new docusign.EnvelopesApi(apiClient);
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
  
  // Create envelope definition
  const envelope = new docusign.EnvelopeDefinition();
  envelope.emailSubject = 'Please sign your document';
  envelope.documents = [
    {
      documentBase64: Buffer.from(createDocument(appointment)).toString('base64'),
      name: 'Appointment_Agreement.pdf',
      fileExtension: 'pdf',
      documentId: '1'
    }
  ];
  
  // Add recipient
  envelope.recipients = new docusign.Recipients();
  envelope.recipients.signers = [
    {
      email: signer.email,
      name: signer.name,
      recipientId: '1',
      routingOrder: '1',
      clientUserId: signer.client_user_id,
      tabs: {
        signHereTabs: [
          {
            anchorString: '/signature1/',
            anchorUnits: 'pixels',
            anchorXOffset: '20',
            anchorYOffset: '10'
          }
        ]
      }
    }
  ];
  
  // Set up return URL
  const viewRequest = new docusign.ReturnUrlRequest();
  viewRequest.returnUrl = returnUrl;
  
  // Create and send envelope
  const result = await envelopesApi.createEnvelope(accountId, { envelopeDefinition: envelope });
  const recipientView = await envelopesApi.createRecipientView(accountId, result.envelopeId, {
    recipientViewRequest: {
      returnUrl: returnUrl,
      clientUserId: signer.client_user_id,
      authenticationMethod: 'none',
      userName: signer.name,
      email: signer.email
    }
  });
  
  return {
    envelopeId: result.envelopeId,
    redirectUrl: recipientView.url
  };
}

function createDocument(appointment) {
  // This is a simplified example - you'd typically use a PDF generation library
  // or a template in your DocuSign account
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Appointment Agreement</title>
      <style>
        body { font-family: Arial, sans-serif; margin: 40px; }
        h1 { color: #2c3e50; }
        .field { margin: 10px 0; }
        .label { font-weight: bold; }
      </style>
    </head>
    <body>
      <h1>Appointment Agreement</h1>
      <div class="field">
        <span class="label">Name:</span>
        <span>${appointment.firstName} ${appointment.lastName}</span>
      </div>
      <div class="field">
        <span class="label">Email:</span>
        <span>${appointment.email}</span>
      </div>
      <div class="field">
        <span class="label">Phone:</span>
        <span>${appointment.phone}</span>
      </div>
      <div class="field">
        <span class="label">Service:</span>
        <span>${appointment.service}</span>
      </div>
      <div class="field">
        <span class="label">Date:</span>
        <span>${new Date(appointment.date).toLocaleDateString()}</span>
      </div>
      <div class="field">
        <span class="label">Time:</span>
        <span>${appointment.time}</span>
      </div>
      ${appointment.notes ? `
        <div class="field">
          <span class="label">Notes:</span>
          <p>${appointment.notes}</p>
        </div>
      ` : ''}
      
      <div style="margin-top: 50px;">
        <p>Signature: ___________________________ <span style="color: #999;">/signature1/</span></p>
      </div>
    </body>
    </html>
  `;
}

async function saveAppointment(appointmentData, envelope) {
  const appointmentRef = db.collection('appointments').doc();
  
  await appointmentRef.set({
    ...appointmentData,
    envelopeId: envelope.envelopeId,
    status: 'pending_signature',
    createdAt: admin.firestore.FieldValue.serverTimestamp(),
    updatedAt: admin.firestore.FieldValue.serverTimestamp()
  });
  
  return appointmentRef.id;
}
