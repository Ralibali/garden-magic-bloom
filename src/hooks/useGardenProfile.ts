import { useState, useEffect } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api } from '@/lib/api';
import { GardenCategory, isRouteVisible } from '@/lib/gardenModules';

export function useGardenProfile() {
  const { data: profile } = useQuery({ queryKey: ['profile'], queryFn: api.getProfile });
  
  const categories: GardenCategory[] = (profile?.preferences as any)?.garden_categories || [];

  const isVisible = (route: string) => isRouteVisible(route, categories);

  return { categories, isVisible, profile };
}
