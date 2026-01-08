import { ApolloClient, InMemoryCache, createHttpLink, ApolloLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';

// HTTP connection to the API - Use localhost during development; use relative path in production
const graphqlUri =
  process.env.REACT_APP_API_URL ||
  (process.env.NODE_ENV === 'development'
    ? 'http://localhost:4000/graphql'
    : '/graphql');

// Create HTTP link
const httpLink = createHttpLink({
  uri: graphqlUri,
  credentials: 'include',
  fetchOptions: {
    mode: 'cors',
  },
  headers: {
    'Content-Type': 'application/json',
  },
});

// Retry logic for failed requests
const retryLink = new RetryLink({
  delay: {
    initial: 300,
    max: Infinity,
    jitter: true,
  },
  attempts: {
    max: 5,
    retryIf: (error) => {
      // Only retry on network errors or 5xx responses
      return !error || !error.statusCode || error.statusCode >= 500;
    },
  },
});

// Error handling
const errorLink = onError(({ graphQLErrors, networkError, operation, forward }) => {
  if (graphQLErrors) {
    graphQLErrors.forEach(({ message, locations, path }) => {
      console.error(
        `[GraphQL error]: Message: ${message}, Location: ${locations}, Path: ${path}`
      );
    });
  }
  
  if (networkError) {
    console.error(`[Network error]: ${networkError}`);
    
    // If we get a 401, the user might need to re-authenticate
    if (networkError.statusCode === 401) {
      // Handle unauthorized error (e.g., redirect to login)
      console.log('Unauthorized - redirecting to login');
    }
  }
});

// Authentication middleware
const authLink = setContext((_, { headers }) => {
  const token = localStorage.getItem('token');
  return {
    headers: {
      ...headers,
      authorization: token ? `Bearer ${token}` : "",
    }
  };
});

// Create the Apollo Client instance
const client = new ApolloClient({
  link: ApolloLink.from([errorLink, authLink, retryLink, httpLink]),
  cache: new InMemoryCache(),
  defaultOptions: {
    watchQuery: {
      fetchPolicy: 'cache-first',
      errorPolicy: 'all',
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

export default client;
