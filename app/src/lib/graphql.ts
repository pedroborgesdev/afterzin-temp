import { GraphQLClient } from 'graphql-request';

const endpoint = import.meta.env.VITE_GRAPHQL_URL || 'http://localhost:8080/graphql';

export const graphqlClient = new GraphQLClient(endpoint, {
  headers: () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  },
});

export const getToken = () => localStorage.getItem('token');
export const setToken = (token: string | null) => {
  if (token) localStorage.setItem('token', token);
  else localStorage.removeItem('token');
};
