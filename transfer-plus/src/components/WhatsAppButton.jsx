import React from 'react';
import { MessageCircle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';

export default function WhatsAppButton() {
  const { data: configs } = useQuery({
    queryKey: ['appConfigs'],
    queryFn: () => base44.entities.AppConfig.list(),
    initialData: []
  });

  const whatsappConfig = configs.find(c => c.config_key === 'whatsapp_number');
  const whatsappNumber = whatsappConfig?.config_value || '';
  
  // Mensagem padrão otimizada para SEO e conversão
  const defaultMessage = 'Olá! Gostaria de informações sobre transfer executivo e fazer uma reserva.';
  
  // Criar URL do WhatsApp
  const whatsappUrl = whatsappNumber 
    ? `https://wa.me/${whatsappNumber.replace(/[^0-9+]/g, '')}?text=${encodeURIComponent(defaultMessage)}`
    : '#';

  // Não mostrar o botão se não houver número configurado
  if (!whatsappNumber) {
    return null;
  }

  return (
    <AnimatePresence>
      <motion.a
        href={whatsappUrl}
        target="_blank"
        rel="noopener noreferrer"
        className="fixed bottom-6 right-6 z-50 flex items-center justify-center w-14 h-14 bg-[#25D366] hover:bg-[#20BD5A] text-white rounded-full shadow-2xl transition-all duration-300 hover:scale-110 group"
        initial={{ scale: 0, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ delay: 0.5, type: "spring", stiffness: 260, damping: 20 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.95 }}
        title="Atendimento via WhatsApp - Transfer Executivo"
        aria-label="Contato via WhatsApp para reserva de transfer"
      >
        <MessageCircle className="w-7 h-7" />
        
        {/* Animação de pulso */}
        <span className="absolute inline-flex h-full w-full rounded-full bg-[#25D366] opacity-75 animate-ping"></span>
        
        {/* Tooltip otimizado */}
        <span className="absolute right-16 bg-gray-900 text-white text-sm px-3 py-2 rounded-lg whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
          Precisa de ajuda? Fale conosco!
        </span>
      </motion.a>
    </AnimatePresence>
  );
}