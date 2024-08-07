'use client';

import React, { useState } from 'react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { trpc } from '@/server/client';
import { httpBatchLink } from '@trpc/client';

interface TrpcProviderProps {
  children: React.ReactNode;
}

const publicApiURL = process.env.NEXT_PUBLIC_API_URL_LOCAL;

const TrpcProvider: React.FC<TrpcProviderProps> = ({ children }) => {
  const [queryClient] = useState(() => new QueryClient({}));
  const [trpcClient] = useState(
    trpc.createClient({ links: [httpBatchLink({ url: publicApiURL! })] })
  );
  return (
    <trpc.Provider client={trpcClient} queryClient={queryClient}>
      <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
    </trpc.Provider>
  );
};

export default TrpcProvider;
