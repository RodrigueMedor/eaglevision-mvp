import React, { useState } from 'react';
import { useMutation } from '@apollo/client';
import { validateEmail, validatePhone } from '../../utils/validators';
import { CREATE_CONTACT } from '../../graphql/mutations';

const ContactForm = () => {
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
  
  // Initialize the mutation
  const [createContact, { loading: isSubmitting }] = useMutation(CREATE_CONTACT, {
    onCompleted: () => {
      // Reset form and show success message
      setSubmitSuccess(true);
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
      });
      
      // Hide success message after 5 seconds
      setTimeout(() => setSubmitSuccess(false), 5000);
    },
    onError: (error) => {
      console.error('Mutation error:', error);
      setSubmitError(error.message || 'An error occurred while submitting the form. Please try again.');
    }
  });

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

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('[ContactForm] Form submission started');
    console.log('[ContactForm] Form data:', formData);
    setSubmitError('');
    
    // Validate form
    console.log('[ContactForm] Validating form...');
    const isValid = validateForm();
    console.log('[ContactForm] Form validation result:', isValid);
    
    if (!isValid) {
      console.warn('[ContactForm] Form validation failed, not submitting');
      console.warn('[ContactForm] Current errors:', errors);
      return;
    }
    
    console.log('[ContactForm] Form is valid, preparing submission data...');
    
    const submissionData = {
      name: formData.name.trim(),
      email: formData.email.trim(),
      phone: formData.phone ? formData.phone.trim() : null,
      subject: formData.subject.trim(),
      message: formData.message.trim()
    };
    
    console.log('[ContactForm] Submitting form data:', submissionData);
    
    try {
      console.log('[ContactForm] Calling createContact mutation...');
      const result = await createContact({
        variables: {
          input: submissionData
        }
      });
      
      console.log('[ContactForm] Mutation successful, result:', result);
      
      // Show success message
      console.log('[ContactForm] Showing success message');
      setSubmitSuccess(true);
      
      // Reset form
      setFormData({
        name: '',
        email: '',
        phone: '',
        subject: '',
        message: ''
      });
      
      // Reset form validity
      setIsFormValid(false);
      
      // Hide success message after 5 seconds
      const timer = setTimeout(() => {
        console.log('[ContactForm] Hiding success message');
        setSubmitSuccess(false);
      }, 5000);
      
      // Cleanup timer on component unmount
      return () => clearTimeout(timer);
      
    } catch (error) {
      console.error('[ContactForm] Error in form submission:', {
        message: error.message,
        graphQLErrors: error.graphQLErrors || [],
        networkError: error.networkError ? {
          message: error.networkError.message,
          statusCode: error.networkError.statusCode,
          result: error.networkError.result
        } : null
      });
      
      // Extract a user-friendly error message
      let errorMessage = 'Failed to send message. Please try again.';
      
      if (error.graphQLErrors && error.graphQLErrors.length > 0) {
        errorMessage = error.graphQLErrors.map(e => e.message).join('\n');
      } else if (error.networkError) {
        errorMessage = 'Unable to connect to the server. Please check your internet connection.';
      }
      
      setSubmitError(errorMessage);
      
      // Auto-hide error after 10 seconds
      setTimeout(() => {
        setSubmitError('');
      }, 10000);
    }
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
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
            Full Name <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="name"
            name="name"
            value={formData.name}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md ${errors.name ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="Your name"
          />
          {errors.name && <p className="mt-1 text-sm text-red-600">{errors.name}</p>}
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              id="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md ${errors.email ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="your.email@example.com"
            />
            {errors.email && <p className="mt-1 text-sm text-red-600">{errors.email}</p>}
          </div>
          
          <div>
            <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
              Phone Number
            </label>
            <input
              type="tel"
              id="phone"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              className={`w-full px-3 py-2 border rounded-md ${errors.phone ? 'border-red-500' : 'border-gray-300'}`}
              placeholder="(123) 456-7890"
            />
            {errors.phone && <p className="mt-1 text-sm text-red-600">{errors.phone}</p>}
          </div>
        </div>
        
        <div>
          <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">
            Subject <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="subject"
            name="subject"
            value={formData.subject}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md ${errors.subject ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="How can we help you?"
          />
          {errors.subject && <p className="mt-1 text-sm text-red-600">{errors.subject}</p>}
        </div>
        
        <div>
          <label htmlFor="message" className="block text-sm font-medium text-gray-700 mb-1">
            Message <span className="text-red-500">*</span>
          </label>
          <textarea
            id="message"
            name="message"
            rows="5"
            value={formData.message}
            onChange={handleChange}
            className={`w-full px-3 py-2 border rounded-md ${errors.message ? 'border-red-500' : 'border-gray-300'}`}
            placeholder="Tell us more about your inquiry..."
          ></textarea>
          {errors.message && <p className="mt-1 text-sm text-red-600">{errors.message}</p>}
        </div>
        
        <div className="pt-2">
          <button
            type="submit"
            disabled={!isFormValid || isSubmitting}
            className={`w-full bg-blue-600 text-white font-medium py-2 px-4 rounded-md focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
              !isFormValid || isSubmitting 
                ? 'opacity-50 cursor-not-allowed' 
                : 'hover:bg-blue-700'
            }`}
          >
            {isSubmitting ? 'Sending...' : 'Send Message'}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ContactForm;
