import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { cropPricesFromPreferences } from '@/data/cropPrices';

export function useCropPrices() {
  const { data } = useQuery({ queryKey: ['profile'], queryFn: api.getProfile });
  return useMemo(() => cropPricesFromPreferences(data?.preferences), [data?.preferences]);
}
