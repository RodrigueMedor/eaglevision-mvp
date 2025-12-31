// Email validation
export const validateEmail = (email) => {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return re.test(String(email).toLowerCase());
};

// Phone number validation (supports various formats like (123) 456-7890, 123-456-7890, 123.456.7890, etc.)
export const validatePhone = (phone) => {
  const re = /^[+]?[(]?[0-9]{3}[)]?[- .]?[0-9]{3}[- .]?[0-9]{4,6}$/;
  return re.test(phone);
};

// Password validation (at least 8 characters, 1 uppercase, 1 lowercase, 1 number)
export const validatePassword = (password) => {
  const re = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)[a-zA-Z\d]{8,}$/;
  return re.test(password);
};
