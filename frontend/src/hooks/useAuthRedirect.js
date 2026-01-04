import { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/FirebaseAuthContext';

export const useAuthRedirect = (redirectPath = '/appointment') => {
  const { currentUser } = useAuth();
  const navigate = useNavigate();
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const isAuthenticated = !!currentUser;

  const handleAuthAction = useCallback((action) => {
    if (isAuthenticated && currentUser) {
      // If already authenticated and user data is loaded, execute the action
      action?.();
    } else {
      // Store the action to execute after successful authentication
      setPendingAction(() => action);
      setShowAuthModal(true);
    }
  }, [isAuthenticated, currentUser]);

  const handleAuthSuccess = useCallback((user) => {
    setShowAuthModal(false);
    if (pendingAction) {
      pendingAction(user);
      setPendingAction(null);
    } else if (redirectPath) {
      navigate(redirectPath);
    }
  }, [navigate, pendingAction, redirectPath]);

  const handleCloseAuthModal = useCallback(() => {
    setShowAuthModal(false);
    setPendingAction(null);
  }, []);

  return {
    isAuthenticated,
    showAuthModal,
    handleAuthAction,
    handleAuthSuccess,
    handleCloseAuthModal,
    currentUser
  };
};
