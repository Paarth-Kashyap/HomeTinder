import { useQuery } from '@tanstack/react-query';
import { fetchProperties } from '../lib/supabase';
import type { Property } from '../types';

export const useProperties = () => {
  return useQuery<Property[]>({
    queryKey: ['properties'],
    queryFn: fetchProperties,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
