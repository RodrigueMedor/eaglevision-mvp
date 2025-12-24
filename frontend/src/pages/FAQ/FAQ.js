import React, { useState } from 'react';
import { Box, Container, Typography, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

const FAQ = () => {
  const [expanded, setExpanded] = useState(false);

  const handleChange = (panel) => (event, isExpanded) => {
    setExpanded(isExpanded ? panel : false);
  };

  const faqs = [
    {
      question: 'What services do you offer?',
      answer: 'We offer tax filing, business registration, immigration form assistance, and document support services.'
    },
    {
      question: 'How much do your services cost?',
      answer: 'Our fees vary depending on the complexity of your case. Contact us for a free consultation and quote.'
    },
    {
      question: 'What documents do I need for tax preparation?',
      answer: 'You\'ll need W-2s, 1099s, receipts for deductions, previous year\'s tax return, and any other relevant financial documents.'
    },
    {
      question: 'How long does the immigration process take?',
      answer: 'Processing times vary depending on the type of application and USCIS processing times. We can provide current estimates during your consultation.'
    },
    {
      question: 'Do you offer virtual consultations?',
      answer: 'Yes, we offer both in-person and virtual consultations for your convenience.'
    },
    {
      question: 'What are your business hours?',
      answer: 'Our office is open Monday through Friday from 9:00 AM to 5:00 PM. Evening and weekend appointments are available by request.'
    },
    {
      question: 'Do you offer payment plans?',
      answer: 'Yes, we offer flexible payment plans for our services. Please contact us to discuss your options.'
    },
    {
      question: 'How can I check the status of my application?',
      answer: 'We provide regular updates on your application status and are available to answer any questions you may have throughout the process.'
    }
  ];

  return (
    <Box sx={{ py: 8, backgroundColor: 'background.paper' }}>
      <Container maxWidth="md">
        <Typography variant="h2" component="h1" gutterBottom align="center">
          Frequently Asked Questions
        </Typography>
        <Typography variant="h6" color="textSecondary" align="center" paragraph sx={{ mb: 6 }}>
          Find answers to common questions about our services and processes
        </Typography>

        <Box sx={{ maxWidth: 800, mx: 'auto' }}>
          {faqs.map((faq, index) => (
            <Accordion 
              key={index} 
              expanded={expanded === `panel${index}`} 
              onChange={handleChange(`panel${index}`)}
              elevation={2}
              sx={{ 
                mb: 2,
                '&:before': {
                  display: 'none',
                },
                borderRadius: '8px !important',
                overflow: 'hidden',
              }}
            >
              <AccordionSummary
                expandIcon={<ExpandMoreIcon />}
                aria-controls={`panel${index}bh-content`}
                id={`panel${index}bh-header`}
                sx={{
                  backgroundColor: expanded === `panel${index}` ? 'action.hover' : 'background.paper',
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <Typography sx={{ fontWeight: 600 }}>{faq.question}</Typography>
              </AccordionSummary>
              <AccordionDetails>
                <Typography color="text.secondary">
                  {faq.answer}
                </Typography>
              </AccordionDetails>
            </Accordion>
          ))}
        </Box>

        <Box sx={{ mt: 6, textAlign: 'center' }}>
          <Typography variant="h6" gutterBottom>
            Still have questions?
          </Typography>
          <Typography color="textSecondary" paragraph>
            Contact us for more information or to schedule a consultation.
          </Typography>
        </Box>
      </Container>
    </Box>
  );
};

export default FAQ;
