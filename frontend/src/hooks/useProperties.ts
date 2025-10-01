import { useQuery, useQueryClient } from '@tanstack/react-query';
import { fetchProperties } from '../lib/supabase';
import type { Property } from '../types';

export const useProperties = () => {
  const queryClient = useQueryClient();
  const query = useQuery<Property[]>({
    queryKey: ['properties', { seed: 0 }],
    queryFn: fetchProperties,
    staleTime: 0,
    gcTime: 0,
  });

  const refreshRandomBatch = async () => {
    const seed = Math.random();
    await queryClient.invalidateQueries({ queryKey: ['properties'] });
    await queryClient.fetchQuery({ queryKey: ['properties', { seed }], queryFn: fetchProperties });
  };

  return { ...query, refreshRandomBatch } as typeof query & { refreshRandomBatch: () => Promise<void> };
};
