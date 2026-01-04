import React, { useState, useEffect } from 'react';
import { useMutation } from '@apollo/client/react/hooks';
import { validateEmail, validatePhone } from '../../utils/validators';
import { useAuth } from '../../context/FirebaseAuthContext';
import { CREATE_CONTACT } from '../../graphql/mutations';

const ContactForm = ({ onSuccess }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phone: '',
    subject: '',
    message: ''
  });
  const [errors, setErrors] = useState({});
  const [submitSuccess, setSubmitSuccess] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [isFormValid, setIsFormValid] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { currentUser } = useAuth();
  
  // Initialize the mutation
  const [createContact, { loading, error }] = useMutation(CREATE_CONTACT, {
    onCompleted: (data) => {
      if (data?.createContact?.success) {
        setSubmitSuccess(true);
        
        // Reset form
        setFormData({
          name: '',
          email: '',
          phone: '',
          subject: '',
          message: ''
        });
        
        // Call onSuccess callback if provided
        if (onSuccess) {
          onSuccess();
        }
        
        // Hide success message after 5 seconds
        setTimeout(() => setSubmitSuccess(false), 5000);
      } else {
        setSubmitError(data?.createContact?.message || 'Failed to submit form');
      }
    },
    onError: (error) => {
      console.error('Error submitting contact form:', error);
      setSubmitError(error.message || 'An error occurred while submitting the form. Please try again.');
    }
  });
  
  // Handle form submission
  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    setIsSubmitting(true);
    setSubmitError('');
    
    try {
      // Get user agent and other metadata
      const userAgent = window.navigator.userAgent;
      const metadata = {
        userAgent,
        source: 'contact_form',
        userId: currentUser?.uid || 'anonymous',
        referrer: document.referrer || '',
        ipAddress: '' // Will be set on the server side
      };
      
      // Submit via GraphQL
      await createContact({
        variables: {
          input: {
            ...formData,
            metadata
          }
        }
      });
      
    } catch (error) {
      console.error('Error in form submission:', error);
      setSubmitError(error.message || 'An error occurred while submitting the form. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const validateForm = (data = formData) => {
    console.log('Validating form data:', data);
    const newErrors = {};
    let isValid = true;
    
    // Name validation
    if (!data.name || !data.name.trim()) {
      newErrors.name = 'Name is required';
      isValid = false;
    }
    
    // Email validation
    if (!data.email) {
      newErrors.email = 'Email is required';
      isValid = false;
    } else if (!validateEmail(data.email)) {
      newErrors.email = 'Please enter a valid email address';
      isValid = false;
    }
    
    if (data.phone && !validatePhone(data.phone)) {
      newErrors.phone = 'Please enter a valid phone number';
      isValid = false;
    }
    
    if (!data.subject || !data.subject.trim()) {
      newErrors.subject = 'Subject is required';
      isValid = false;
    }
    
    if (!data.message || !data.message.trim()) {
      newErrors.message = 'Message is required';
      isValid = false;
    }
    
    setErrors(newErrors);
    console.log('Form validation complete. Is valid?', isValid);
    console.log('Validation errors:', newErrors);
    return isValid;
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    const newFormData = {
      ...formData,
      [name]: value
    };
    
    setFormData(newFormData);
    
    // Clear error when user starts typing
    if (errors[name]) {
      const newErrors = { ...errors };
      delete newErrors[name];
      setErrors(newErrors);
    }
    
    // Check if form is valid
    const isValid = validateForm(newFormData);
    setIsFormValid(isValid);
  };

  return (
    <div className="max-w-2xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-gray-800">Contact Us</h2>
      
      {submitSuccess && (
        <div className="mb-6 p-4 bg-green-100 text-green-700 rounded">
          Thank you for contacting us! We'll get back to you soon.
        </div>
      )}
      
      {submitError && (
        <div className="mb-6 p-4 bg-red-100 text-red-700 rounded">
          {submitError}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="form-group">
          <label htmlFor="name">Name</label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={errors.name ? 'error' : ''}
            required
          />
          {errors.name && <span className="error-message">{errors.name}</span>}
        </div>
        
        <div className="form-group">
          <label htmlFor="email">Email</label>
          <input
            type="email"
            id="email"
            name="email"
            value={formData.email}
            onChange={handleChange}
            className={errors.email ? 'error' : ''}
            required
          />
          {errors.email && <span className="error-message">{errors.email}</span>}
        </div>
        
        <div className="form-group">
          <label htmlFor="phone">Phone (optional)</label>
          <input
            type="tel"
            id="phone"
            name="phone"
            value={formData.phone}
            onChange={handleChange}
            className={errors.phone ? 'error' : ''}
            pattern="[0-9]{10,15}"
            title="Please enter a valid phone number (10-15 digits)"
          />
          {errors.phone && <span className="error-message">{errors.phone}</span>}
        </div>
        
        <div className="form-group">
          <label htmlFor="subject">Subject (optional)</label>
          <input
            type="text"
            id="subject"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            placeholder="How can we help you?"
          />
        </div>
        
        <div className="form-group">
          <label htmlFor="message">Message</label>
          <textarea
            id="message"
            name="message"
            value={formData.message}
            onChange={handleChange}
            rows="5"
            className={errors.message ? 'error' : ''}
            required
            minLength="10"
            placeholder="Please provide details about your inquiry..."
          ></textarea>
          {errors.message && <span className="error-message">{errors.message}</span>}
        </div>
        
        <div className="form-actions">
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={!isFormValid || isSubmitting}
          >
            {isSubmitting ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                Sending...
              </>
            ) : (
              'Send Message'
            )}
            {isSubmitting ? 'Sending...' : 'Send Message'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ContactForm;
