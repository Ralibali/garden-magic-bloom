import { createContext } from 'react';
import type { SeoProps } from './useSeo';

export const SeoPrerenderContext = createContext<Partial<SeoProps> | null>(null);
