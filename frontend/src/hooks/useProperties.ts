import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchUserFeed } from '../lib/supabase';
import type { Listing } from '../types';

export const useProperties = () => {
  const queryClient = useQueryClient();
  const query = useQuery<Listing[]>({
    queryKey: ['properties', { seed: 0 }],
    queryFn: fetchUserFeed,
    staleTime: 0,
    gcTime: 0,
  });

  const refreshRandomBatch = async () => {
    const seed = Math.random();
    await queryClient.invalidateQueries({ queryKey: ['properties'] });
    await queryClient.fetchQuery({ queryKey: ['properties', { seed }], queryFn: fetchUserFeed });
  };

  return { ...query, refreshRandomBatch } as typeof query & { refreshRandomBatch: () => Promise<void> };
};
