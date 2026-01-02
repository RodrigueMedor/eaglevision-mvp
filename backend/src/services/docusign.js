const docusign = require('docusign-esign');
const admin = require('firebase-admin');
const { v4: uuidv4 } = require('uuid');
const { logAudit } = require('../utils/audit');

/**
 * Generates a JWT token for DocuSign API authentication
 * @param {docusign.ApiClient} apiClient - DocuSign API client
 * @returns {Promise<Object>} Authentication response
 */
async function getDocusignJwtToken(apiClient) {
  try {
    const jwtLifeSec = 10 * 60; // 10 minutes
    
    const jwtResponse = await apiClient.requestJWTUserToken(
      process.env.DOCUSIGN_INTEGRATION_KEY,
      process.env.DOCUSIGN_USER_ID,
      ['signature', 'impersonation'],
      Buffer.from(process.env.DOCUSIGN_PRIVATE_KEY, 'utf8'),
      jwtLifeSec
    );
    
    return {
      accessToken: jwtResponse.body.access_token,
      expiresIn: jwtResponse.body.expires_in
    };
  } catch (error) {
    console.error('Error getting JWT token:', error);
    throw new Error('Failed to authenticate with DocuSign');
  }
}

/**
 * Creates an HTML document for the agreement
 * @param {Object} appointment - Appointment data
 * @returns {string} HTML content
 */
function createDocument(appointment) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>Appointment Agreement</title>
      <style>
        body { font-family: Arial, sans-serif; line-height: 1.6; max-width: 800px; margin: 0 auto; padding: 20px; }
        h1 { color: #2c3e50; border-bottom: 2px solid #3498db; padding-bottom: 10px; }
        .section { margin-bottom: 20px; }
        .signature-line { border-top: 1px solid #000; width: 300px; margin: 50px 0; }
      </style>
    </head>
    <body>
      <h1>Appointment Agreement</h1>
      
      <div class="section">
        <p>This agreement is made between <strong>${appointment.firstName} ${appointment.lastName}</strong> (Client) and <strong>Eagle Vision Edge</strong> (Service Provider).</p>
      </div>
      
      <div class="section">
        <h2>Appointment Details</h2>
        <p><strong>Service:</strong> ${appointment.service}</p>
        <p><strong>Date:</strong> ${new Date(appointment.appointmentDate).toLocaleDateString()}</p>
        <p><strong>Time:</strong> ${new Date(appointment.appointmentDate).toLocaleTimeString()}</p>
      </div>
      
      <div class="section">
        <h2>Terms and Conditions</h2>
        <p>By signing this agreement, you agree to the following terms and conditions:</p>
        <ol>
          <li>You will arrive on time for your appointment.</li>
          <li>You understand the cancellation policy requires 24 hours notice.</li>
          <li>You agree to provide accurate health information as required.</li>
          <li>You consent to the collection and use of your personal information as per our privacy policy.</li>
        </ol>
      </div>
      
      <div class="section">
        <p>By signing below, you acknowledge that you have read, understood, and agree to the terms of this agreement.</p>
        
        <div style="margin-top: 50px;">
          <p>Signed by:</p>
          <div class="signature-line"></div>
          <p>${appointment.firstName} ${appointment.lastName}</p>
          <p>Date: <span id="current-date">${new Date().toLocaleDateString()}</span></p>
        </div>
      </div>
    </body>
    </html>
  `;
}

/**
 * Creates a DocuSign envelope for signing
 * @param {Object} params - Parameters for envelope creation
 * @param {string} params.email - Recipient email
 * @param {string} params.name - Recipient name
 * @param {Object} params.appointment - Appointment data
 * @returns {Promise<Object>} Envelope creation result
 */
const createDocusignEnvelope = async ({ email, name, appointment }) => {
  const dsApiClient = new docusign.ApiClient();
  dsApiClient.setBasePath(process.env.DOCUSIGN_BASE_PATH || 'https://demo.docusign.net/restapi');
  
  // Get JWT token
  const token = await getDocusignJwtToken(dsApiClient);
  dsApiClient.addDefaultHeader('Authorization', 'Bearer ' + token.accessToken);
  
  const envelopesApi = new docusign.EnvelopesApi(dsApiClient);
  const accountId = process.env.DOCUSIGN_ACCOUNT_ID;
  
  // Create envelope definition
  const envelope = new docusign.EnvelopeDefinition();
  envelope.emailSubject = `Please sign your ${appointment.service} agreement`;
  envelope.status = 'sent'; // Send the envelope immediately
  
  // Add document
  const document = createDocument(appointment);
  envelope.documents = [{
    documentBase64: Buffer.from(document).toString('base64'),
    name: `${appointment.service}_Agreement.pdf`,
    fileExtension: 'pdf',
    documentId: '1'
  }];
  
  // Add recipient
  envelope.recipients = new docusign.Recipients();
  envelope.recipients.signers = [{
    email,
    name,
    recipientId: '1',
    routingOrder: '1',
    clientUserId: appointment.id, // Required for embedded signing
    tabs: {
      signHereTabs: [{
        anchorString: '/signature/',
        anchorUnits: 'pixels',
        anchorXOffset: '20',
        anchorYOffset: '10'
      }],
      dateSignedTabs: [{
        anchorString: 'current-date',
        anchorUnits: 'pixels',
        anchorXOffset: '0',
        anchorYOffset: '0',
        font: 'helvetica',
        fontSize: 'size12',
        name: 'Date Signed',
        required: 'true',
        tabLabel: 'date_signed',
        value: new Date().toLocaleDateString()
      }]
    }
  }];
  
  try {
    // Create envelope
    const result = await envelopesApi.createEnvelope(accountId, { envelopeDefinition: envelope });
    
    // Create recipient view for embedded signing
    const recipientView = await envelopesApi.createRecipientView(accountId, result.envelopeId, {
      recipientViewRequest: {
        returnUrl: `${process.env.FRONTEND_URL}/appointments/${appointment.id}/complete`,
        clientUserId: appointment.id, // Must match clientUserId set for the recipient
        authenticationMethod: 'none',
        userName: name,
        email: email,
        frameAncestors: [process.env.FRONTEND_URL],
        messageOrigins: [process.env.FRONTEND_URL]
      }
    });
    
    return {
      envelopeId: result.envelopeId,
      redirectUrl: recipientView.url
    };
  } catch (error) {
    console.error('Error creating DocuSign envelope:', error);
    throw new Error('Failed to create DocuSign envelope');
  }
};

/**
 * Handles DocuSign webhook events
 * @param {Object} event - Webhook event data
 * @returns {Promise<Object>} Processing result
 */
const handleDocusignWebhook = async (event) => {
  const { envelopeId, status, documents, timeGenerated } = event;
  const db = admin.firestore();
  
  try {
    // Find appointment by envelopeId
    const querySnapshot = await db.collection('appointments')
      .where('envelopeId', '==', envelopeId)
      .limit(1)
      .get();
    
    if (querySnapshot.empty) {
      console.error(`No appointment found for envelope ${envelopeId}`);
      return { success: false, message: 'Appointment not found' };
    }
    
    const doc = querySnapshot.docs[0];
    const appointmentRef = doc.ref;
    const appointment = doc.data();
    
    const updateData = {
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      auditLog: admin.firestore.FieldValue.arrayUnion({
        timestamp: admin.firestore.Timestamp.fromDate(new Date(timeGenerated || new Date())),
        action: 'DOCUSIGN_EVENT',
        status,
        message: `Document status changed to ${status}`,
        metadata: { event }
      })
    };
    
    switch (status.toLowerCase()) {
      case 'completed':
        updateData.status = 'SIGNED';
        updateData.documentSigned = true;
        updateData.signedAt = admin.firestore.FieldValue.serverTimestamp();
        if (documents?.[0]?.documentId) {
          updateData.signedDocumentUrl = `${process.env.DOCUSIGN_BASE_PATH}/envelopes/${envelopeId}/documents/${documents[0].documentId}`;
        }
        break;
        
      case 'declined':
        updateData.status = 'DECLINED';
        updateData.documentSigned = false;
        break;
        
      case 'voided':
        updateData.status = 'CANCELLED';
        updateData.documentSigned = false;
        break;
        
      case 'sent':
      case 'delivered':
        // No status change needed, just log the event
        break;
        
      default:
        console.log(`Unhandled DocuSign status: ${status}`);
    }
    
    await appointmentRef.update(updateData);
    
    // Log the status update
    await logAudit(db, doc.id, {
      action: `DOCUSIGN_${status.toUpperCase()}`,
      status: 'COMPLETED',
      message: `Document status updated to ${status}`,
      metadata: { envelopeId, status }
    });
    
    return { success: true, status };
  } catch (error) {
    console.error('Error processing DocuSign webhook:', error);
    
    // Log the error
    if (envelopeId) {
      await logAudit(db, envelopeId, {
        action: 'DOCUSIGN_WEBHOOK_ERROR',
        status: 'ERROR',
        message: 'Failed to process DocuSign webhook',
        error: error.message
      });
    }
    
    throw error;
  }
};

module.exports = {
  createDocusignEnvelope,
  handleDocusignWebhook,
  getDocusignJwtToken
};
