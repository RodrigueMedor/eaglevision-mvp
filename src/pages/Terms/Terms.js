import React from 'react';
import { Container, Typography, Box, Paper, Link } from '@mui/material';

const Terms = () => {
  return (
    <Container maxWidth="md" sx={{ py: 6 }}>
      <Paper elevation={0} sx={{ p: { xs: 3, md: 6 }, borderRadius: 2 }}>
        <Typography variant="h4" component="h1" gutterBottom fontWeight="bold" color="primary">
          Terms of Service
        </Typography>
        
        <Typography variant="body1" paragraph>
          Last Updated: November 9, 2024
        </Typography>
        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" component="h2" gutterBottom sx={{ mt: 4, color: 'primary.main' }}>
            1. Introduction
          </Typography>
          <Typography variant="body1" paragraph>
            Welcome to Eagle Vision Edge Tax & Immigration Services ("we," "our," or "us"). These Terms of Service ("Terms") govern your access to and use of our services, including our website, applications, and any other services we provide (collectively, the "Services").
          </Typography>
          
          <Box sx={{ p: 2, backgroundColor: 'background.paper', borderRadius: 1, mb: 3, borderLeft: '4px solid', borderColor: 'primary.main' }}>
            <Typography variant="body2" color="text.secondary" fontStyle="italic">
              <strong>Important Legal Disclaimer:</strong> Eagle Vision Edge is not a law firm and does not provide legal advice. 
              Our services are not a substitute for the advice of an attorney. We provide tax preparation and immigration 
              form preparation services, but we do not provide legal advice, legal opinions, or recommendations about 
              legal rights, remedies, defenses, options, or strategies. If you need legal advice for your specific matter, 
              you should consult with a licensed attorney.
            </Typography>
          </Box>
          
          <Typography variant="body1" paragraph>
            By accessing or using our Services, you acknowledge and agree that you understand the above disclaimer and that you are not relying on Eagle Vision Edge for legal advice. If you do not agree to these Terms, please do not use our Services.
          </Typography>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" component="h2" gutterBottom sx={{ mt: 4, color: 'primary.main' }}>
            2. Services Description
          </Typography>
          <Typography variant="body1" paragraph>
            We provide tax preparation, tax planning, and immigration consulting services. Our services include but are not limited to:
          </Typography>
          <ul>
            <li>Individual and business tax preparation</li>
            <li>Tax planning and consulting</li>
            <li>Immigration form preparation and filing</li>
            <li>Document review and consultation</li>
            <li>Other related professional services</li>
          </ul>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" component="h2" gutterBottom sx={{ mt: 4, color: 'primary.main' }}>
            3. Client Responsibilities
          </Typography>
          <Typography variant="body1" paragraph>
            As a client, you agree to:
          </Typography>
          <ul>
            <li>Provide accurate and complete information necessary for us to perform our services</li>
            <li>Review all documents prepared by us for accuracy before signing or filing</li>
            <li>Meet all filing deadlines and requirements</li>
            <li>Make timely payments for services rendered</li>
          </ul>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" component="h2" gutterBottom sx={{ mt: 4, color: 'primary.main' }}>
            4. Fees and Payments
          </Typography>
          <Typography variant="body1" paragraph>
            Our fees are based on the complexity of the services provided. We will provide you with a fee estimate before beginning work. Payment is due upon receipt of our invoice unless otherwise agreed in writing.
          </Typography>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" component="h2" gutterBottom sx={{ mt: 4, color: 'primary.main' }}>
            5. Confidentiality
          </Typography>
          <Typography variant="body1" paragraph>
            We maintain the confidentiality of all client information in accordance with applicable laws and professional standards. We do not disclose client information to third parties except as required by law or with your express consent.
          </Typography>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" component="h2" gutterBottom sx={{ mt: 4, color: 'primary.main' }}>
            6. Limitation of Liability
          </Typography>
          <Typography variant="body1" paragraph>
            To the fullest extent permitted by law, Eagle Vision Edge shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses resulting from:
          </Typography>
          <ul>
            <li>Your use or inability to use our Services</li>
            <li>Any unauthorized access to or use of our servers and/or any personal information stored therein</li>
            <li>Any errors or omissions in any content or for any loss or damage incurred as a result of the use of any content posted, emailed, transmitted, or otherwise made available through the Services</li>
          </ul>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" component="h2" gutterBottom sx={{ mt: 4, color: 'primary.main' }}>
            7. Changes to Terms
          </Typography>
          <Typography variant="body1" paragraph>
            We reserve the right to modify these Terms at any time. We will provide notice of any material changes through our website or by other means. Your continued use of our Services after such notice constitutes your acceptance of the modified Terms.
          </Typography>
        </Box>

        <Box sx={{ mb: 4 }}>
          <Typography variant="h6" component="h2" gutterBottom sx={{ mt: 4, color: 'primary.main' }}>
            8. Governing Law
          </Typography>
          <Typography variant="body1" paragraph>
            These Terms shall be governed by and construed in accordance with the laws of the State of [Your State], without regard to its conflict of law provisions.
          </Typography>
        </Box>

        <Box sx={{ mt: 6, pt: 3, borderTop: '1px solid #eee' }}>
          <Typography variant="body2" color="text.secondary">
            If you have any questions about these Terms, please contact us at:
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Eagle Vision Edge<br />
            123 Business Street<br />
            City, State ZIP<br />
            Phone: (641) 451-4536<br />
            Email: info@eaglevisionedge.com
          </Typography>
        </Box>
      </Paper>
    </Container>
  );
};

export default Terms;
