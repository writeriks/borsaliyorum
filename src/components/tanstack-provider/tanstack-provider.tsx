'use client';

import React from 'react';

import { ReactQueryDevtools } from '@tanstack/react-query-devtools';

import { QueryClient } from '@tanstack/react-query';

import { QueryClientProvider } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      /* refetchOnWindowFocus: false, TODO: Test this */
    },
  },
});

const ClientQueryProvider = ({ children }: { children: React.ReactNode }): React.ReactNode => (
  <QueryClientProvider client={queryClient}>
    {children}
    {/* <ReactQueryDevtools initialIsOpen={false} /> */}
  </QueryClientProvider>
);

export default ClientQueryProvider;
