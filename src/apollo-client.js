import { ApolloClient, InMemoryCache, createHttpLink, ApolloLink, from } from '@apollo/client';
import { onError } from '@apollo/client/link/error';
import { setContext } from '@apollo/client/link/context';
import { RetryLink } from '@apollo/client/link/retry';
import { Observable } from '@apollo/client/utilities';
import { refreshToken } from './services/auth';

// HTTP connection to the API
const httpLink = createHttpLink({
  uri: 'http://localhost:8000/graphql',
  credentials: 'same-origin', // Changed from 'include' to 'same-origin' for better security
});

// Middleware to add auth token to headers
const authLink = setContext((_, { headers = {} }) => {
  // Get the authentication token from local storage
  const token = localStorage.getItem('access_token');
  
  if (!token) {
    console.warn('No access token found in localStorage');
    return { headers };
  }
  
  console.log('Adding authorization header to request');
  
  // Return the context with headers and credentials
  return {
    headers: {
      ...headers,
      authorization: `Bearer ${token}`,
    },
    credentials: 'same-origin',
  };
});

// Error handling link
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    for (let err of graphQLErrors) {
      console.error('GraphQL Error:', {
        message: err.message,
        code: err.extensions?.code,
        path: err.path,
        operation: operation.operationName
      });
      
      // Handle token expiration or invalid token
      const isAuthError = err.extensions?.code === 'UNAUTHENTICATED' || 
                         err.message.includes('Not authenticated') ||
                         err.message.includes('Invalid token') ||
                         err.message.includes('Token expired');
      
      if (isAuthError) {
        // Only attempt refresh if this isn't a refresh token request to avoid loops
        if (operation.operationName === 'RefreshToken') {
          console.log('Refresh token request failed, redirecting to login');
          clearAuthAndRedirect();
          return;
        }
        
        console.log('Authentication error detected, attempting token refresh...');
        
        // Try to refresh the token
        const refreshTokenValue = localStorage.getItem('refresh_token');
        
        if (!refreshTokenValue) {
          console.log('No refresh token available, redirecting to login');
          clearAuthAndRedirect();
          return;
        }
        if (refreshTokenValue) {
          console.log('Attempting to refresh access token...');
          return refreshToken()
            .then(({ access_token, refresh_token }) => {
              if (!access_token) {
                throw new Error('No access token in refresh response');
              }
              
              console.log('Token refreshed successfully');
              
              // Update tokens in storage
              localStorage.setItem('access_token', access_token);
              if (refresh_token) {
                localStorage.setItem('refresh_token', refresh_token);
              }
              
              // Create a new operation context with the new token
              const oldHeaders = operation.getContext ? operation.getContext().headers : {};
              const context = {
                ...operation.getContext ? operation.getContext() : {},
                headers: {
                  ...oldHeaders,
                  authorization: `Bearer ${access_token}`,
                },
              };
              
              // Create a new operation with the updated context
              const newOperation = {
                ...operation,
                setContext: (newContext) => {
                  Object.assign(context, newContext);
                },
                getContext: () => context,
              };
              
              // Retry the request with the new token
              return forward(newOperation);
            })
            .catch(error => {
              console.error('Failed to refresh token:', error);
              clearAuthAndRedirect();
              return;
            });
        } else {
          console.log('No refresh token available, redirecting to login');
          clearAuthAndRedirect();
          return;
        }
      }
    }
  }
  
  if (networkError) {
    console.error('[Network error]:', networkError);
    
    // Handle 401 Unauthorized
    if (networkError.statusCode === 401) {
      console.log('Received 401 Unauthorized, clearing auth and redirecting');
      clearAuthAndRedirect();
    }
  }
});

// Helper function to clear auth and redirect to login
function clearAuthAndRedirect() {
  localStorage.removeItem('access_token');
  localStorage.removeItem('refresh_token');
  // Clear all cookies by setting their expiration to the past
  document.cookie.split(';').forEach(c => {
    document.cookie = c.trim().split('=')[0] + '=;expires=Thu, 01 Jan 1970 00:00:00 UTC;path=/';
  });
  window.location.href = '/login';
}

// Rate limiting middleware
const rateLimitLink = new ApolloLink((operation, forward) => {
  // Skip rate limiting for certain operations
  if (operation.operationName === 'RefreshToken') {
    return forward(operation);
  }
  return new Observable(observer => {
    const subscription = forward(operation).subscribe({
      next: (result) => {
        // Handle rate limit headers
        const response = operation.getContext().response;
        if (response && response.headers) {
          const remaining = response.headers.get('x-ratelimit-remaining');
          const reset = response.headers.get('x-ratelimit-reset');
          
          if (remaining && reset) {
            console.log(`Rate limit: ${remaining} requests remaining`);
            
            // Store rate limit info in context
            operation.setContext({
              ...operation.getContext(),
              rateLimit: {
                remaining: parseInt(remaining, 10),
                reset: new Date(parseInt(reset, 10) * 1000)
              }
            });
          }
        }
        
        observer.next(result);
      },
      error: (error) => {
        if (error.statusCode === 429) {
          const retryAfter = error.response?.headers?.get('retry-after') || 5;
          console.warn(`Rate limited. Retrying after ${retryAfter} seconds...`);
          
          // Retry after delay
          setTimeout(() => {
            const retryOperation = {
              ...operation,
              setContext: (context) => {
                operation.setContext(context);
                return operation.getContext();
              }
            };
            
            forward(retryOperation).subscribe(observer);
          }, retryAfter * 1000);
          return;
        }
        
        observer.error(error);
      },
      complete: observer.complete.bind(observer),
    });

    return () => {
      if (subscription) subscription.unsubscribe();
    };
  });
});

// Error handling link (moved to the top and kept only one instance)

// Add retry link for failed requests
const retryLink = new RetryLink({
  delay: {
    initial: 300,
    max: 10000,
    jitter: true
  },
  attempts: (count, operation, error) => {
    if (count > 3) return false;
    
    // Don't retry mutations or subscriptions
    if (operation.query.definitions.some(
      def => def.operation && ['mutation', 'subscription'].includes(def.operation)
    )) {
      return false;
    }
    
    // Retry on network errors or server errors
    return !!(
      !error.statusCode || // Network error
      error.statusCode >= 500 || // Server error
      error.statusCode === 429 // Rate limit
    );
  }
});

// Create the Apollo Client instance with cache configuration
const client = new ApolloClient({
  link: from([
    errorLink,      // Handle errors first
    authLink,       // Add auth headers
    rateLimitLink,  // Then handle rate limiting
    retryLink,      // Then handle retries
    httpLink,       // Finally, send the request
  ]),
  cache: new InMemoryCache({
    typePolicies: {
      Query: {
        fields: {
          messages: {
            // Use field policy to handle pagination
            keyArgs: ['type'],
            merge(existing, incoming, { args: { offset = 0 } }) {
              const merged = existing ? existing.slice(0) : [];
              for (let i = 0; i < incoming.length; ++i) {
                merged[offset + i] = incoming[i];
              }
              return merged;
            },
          },
        },
      },
    },
  }),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-and-network',
      errorPolicy: 'all',
      notifyOnNetworkStatusChange: true,
    },
    query: {
      fetchPolicy: 'network-only',
      errorPolicy: 'all',
    },
    mutate: {
      errorPolicy: 'all',
    },
  },
});

// Export the client
export default client;
