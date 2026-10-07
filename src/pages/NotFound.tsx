import { useLocation } from 'react-router-dom';
import PublicNotFound from '@/components/PublicNotFound';
export default function NotFound() { const { pathname } = useLocation(); return <PublicNotFound path={pathname} title="404 – här växer det inget just nu" />; }
