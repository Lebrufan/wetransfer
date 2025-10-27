import React from 'react';
import { useNavigate } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function Index() {
  const navigate = useNavigate();

  React.useEffect(() => {
    // Redirecionar imediatamente para NovaReserva
    navigate(createPageUrl('NovaReserva'), { replace: true });
  }, [navigate]);

  return null;
}