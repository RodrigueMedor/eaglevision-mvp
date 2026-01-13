import { ApolloClient, InMemoryCache, createHttpLink, ApolloLink } from '@apollo/client';
import { setContext } from '@apollo/client/link/context';
import { onError } from '@apollo/client/link/error';
import { RetryLink } from '@apollo/client/link/retry';

// HTTP connection to the API - Use localhost during development; use relative path in production
const getGraphqlUri = () => {
  if (process.env.REACT_APP_API_URL) {
    return process.env.REACT_APP_API_URL;
  }
  if (process.env.NODE_ENV === 'development') {
    return 'http://localhost:4000/graphql';
  }
  // In production, use the Netlify function URL
  return 'https://eaglevisionedge.com/.netlify/functions/graphql';
};

// Create HTTP link
const httpLink = createHttpLink({
  uri: getGraphqlUri(),
  credentials: 'same-origin',
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
// Create a logging link to track GraphQL operations
const logLink = new ApolloLink((operation, forward) => {
  console.log('GraphQL Operation:', {
    operationName: operation.operationName,
    query: operation.query.loc?.source?.body,
    variables: operation.variables ? '*** variables present (hidden for security) ***' : 'none'
  });
  
  return forward(operation).map((result) => {
    console.log('GraphQL Result:', {
      operationName: operation.operationName,
      data: result.data ? '*** data received ***' : 'no data',
      errors: result.errors ? '*** errors present ***' : 'no errors'
    });
    if (result.errors) {
      console.error('GraphQL Errors:', result.errors);
    }
    return result;
  });
});

const client = new ApolloClient({
  link: ApolloLink.from([logLink, errorLink, authLink, retryLink, httpLink]),
  cache: new InMemoryCache({
    addTypename: false // This helps with debugging by not adding __typename to queries
  }),
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
