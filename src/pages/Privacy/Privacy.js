import React from 'react';
import { Box, Container, Typography } from '@mui/material';

const Privacy = () => {
  return (
    <Box sx={{ py: 8, backgroundColor: 'background.default' }}>
      <Container maxWidth="md">
        <Typography variant="h2" component="h1" gutterBottom align="center">
          Privacy Policy
        </Typography>
        <Typography variant="subtitle1" color="textSecondary" align="center" paragraph>
          Last updated: November 8, 2023
        </Typography>

        <Box sx={{ mt: 6 }}>
          <Typography variant="h5" gutterBottom>1. Introduction</Typography>
          <Typography paragraph>
            Eagle Vision Edge LLC ("us", "we", or "our") operates the eaglevisionedge.com website (the "Service").
            This page informs you of our policies regarding the collection, use, and disclosure of personal data when you use our Service.
          </Typography>
          
          <Box sx={{ p: 2, backgroundColor: 'background.paper', borderRadius: 1, mb: 3, borderLeft: '4px solid', borderColor: 'primary.main' }}>
            <Typography variant="body2" color="text.secondary" fontStyle="italic">
              <strong>Important Notice:</strong> Eagle Vision Edge is not a law firm and does not provide legal advice. 
              Our services are not a substitute for the advice of an attorney. We provide tax preparation and immigration 
              form preparation services, but we do not provide legal advice, legal opinions, or recommendations about 
              legal rights, remedies, defenses, options, or strategies.
            </Typography>
          </Box>

          <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>2. Information Collection and Use</Typography>
          <Typography paragraph>
            We collect several different types of information for various purposes to provide and improve our Service to you.
          </Typography>
          <Typography component="div" sx={{ pl: 2 }}>
            <ul>
              <li>
                <Typography><strong>Personal Data:</strong> While using our Service, we may ask you to provide us with certain personally identifiable information that can be used to contact or identify you ("Personal Data").</Typography>
              </li>
              <li>
                <Typography><strong>Usage Data:</strong> We may also collect information on how the Service is accessed and used ("Usage Data").</Typography>
              </li>
            </ul>
          </Typography>

          <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>3. Use of Data</Typography>
          <Typography paragraph>
            Eagle Vision Edge LLC uses the collected data for various purposes:
          </Typography>
          <Typography component="div" sx={{ pl: 2 }}>
            <ul>
              <li>To provide and maintain our Service</li>
              <li>To notify you about changes to our Service</li>
              <li>To allow you to participate in interactive features of our Service</li>
              <li>To provide customer support</li>
              <li>To gather analysis or valuable information so that we can improve our Service</li>
              <li>To monitor the usage of our Service</li>
              <li>To detect, prevent and address technical issues</li>
            </ul>
          </Typography>

          <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>4. Data Security</Typography>
          <Typography paragraph>
            The security of your data is important to us, but remember that no method of transmission over the Internet or method of electronic storage is 100% secure.
          </Typography>

          <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>5. Service Providers</Typography>
          <Typography paragraph>
            We may employ third-party companies and individuals to facilitate our Service ("Service Providers"), to provide the Service on our behalf, to perform Service-related services, or to assist us in analyzing how our Service is used.
          </Typography>

          <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>6. Links to Other Sites</Typography>
          <Typography paragraph>
            Our Service may contain links to other sites that are not operated by us. If you click on a third-party link, you will be directed to that third party's site.
          </Typography>

          <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>7. Changes to This Privacy Policy</Typography>
          <Typography paragraph>
            We may update our Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page.
          </Typography>

          <Typography variant="h5" gutterBottom sx={{ mt: 4 }}>8. Contact Us</Typography>
          <Typography paragraph>
            If you have any questions about this Privacy Policy, please contact us:
          </Typography>
          <Typography component="div" sx={{ pl: 2 }}>
            <ul>
              <li>By email: privacy@eaglevisionedge.com</li>
              <li>By phone: (641) 451-4536</li>
              <li>By mail: 123 Business Ave, Suite 100, Anytown, IA 50001</li>
            </ul>
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default Privacy;
