

import React from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Calendar, LayoutDashboard, MapPin, LogOut, Settings, Car, Lock, Package, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarHeader,
  SidebarFooter,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar';
import { base44 } from '@/api/base44Client';
import { LanguageProvider, useLanguage } from '@/components/LanguageContext';
import LanguageSelector from '@/components/LanguageSelector';
import WhatsAppButton from '@/components/WhatsAppButton';

function LayoutContent() {
  const location = useLocation();
  const [user, setUser] = React.useState(null);
  const [isLoading, setIsLoading] = React.useState(true);
  const { t } = useLanguage();

  const currentPageName = location.pathname.split('/')[1] || 'NovaReserva';

  React.useEffect(() => {
    const initializeApp = async () => {
      try {
        try {
          const currentUser = await base44.auth.me();
          setUser(currentUser);
        } catch (authError) {
          setUser(null);
        }
      } catch (error) {
        console.error('[Layout] Erro ao inicializar:', error);
        setUser(null);
      } finally {
        setIsLoading(false);
      }
    };

    initializeApp();
  }, []);

  const requiresAuth = ['AdminDashboard', 'GestaoRotas', 'GerenciarVeiculos', 'Configuracoes', 'AlterarSenha', 'MinhasViagens', 'GerenciarCotacoes'];
  const isProtectedPage = requiresAuth.includes(currentPageName);

  React.useEffect(() => {
    if (!isLoading && !user && isProtectedPage) {
      base44.auth.redirectToLogin(createPageUrl(currentPageName));
    }
  }, [isLoading, user, isProtectedPage, currentPageName]);

  React.useEffect(() => {
    let title = "TransferOnline - Sistema de Reservas de Transfer";
    
    if (currentPageName === 'Reservas') {
      title = "Reserve Transfer Aeroporto | TransferOnline - Conforto e Segurança";
    } else if (currentPageName === 'AdminDashboard') {
      title = "Painel Administrativo | Gestão de Reservas - TransferOnline";
    } else if (currentPageName === 'GestaoRotas') {
      title = "Gestão de Rotas e Tarifas | Admin - TransferOnline";
    } else if (currentPageName === 'GerenciarVeiculos') {
      title = "Gestão de Tipos de Veículos | Admin - TransferOnline";
    } else if (currentPageName === 'Configuracoes') {
      title = "Configurações do Sistema | Admin - TransferOnline";
    } else if (currentPageName === 'NovaReserva') {
      title = "Nova Reserva de Transfer | TransferOnline - Rápido e Fácil";
    } else if (currentPageName === 'AlterarSenha') {
      title = "Alterar Senha | Minha Conta - TransferOnline";
    } else if (currentPageName === 'MinhasViagens') {
      title = "Minhas Viagens | Histórico de Reservas - TransferOnline";
    } else if (currentPageName === 'GerenciarCotacoes') {
      title = "Gerenciar Cotações | Admin - TransferOnline";
    }
    
    document.title = title;
  }, [currentPageName, t]);

  const isAdmin = user?.role === 'admin';

  const publicPages = [
    {
      title: t('common.makeBooking'),
      url: createPageUrl('NovaReserva'), 
      icon: Calendar,
    }
  ];

  const userPages = user ? [
    {
      title: 'Minhas Viagens',
      url: createPageUrl('MinhasViagens'),
      icon: Package,
    },
    {
      title: 'Alterar Senha',
      url: createPageUrl('AlterarSenha'),
      icon: Lock,
    }
  ] : [];

  const adminPages = [
    {
      title: t('common.dashboard'),
      url: createPageUrl('AdminDashboard'),
      icon: LayoutDashboard,
    },
    {
      title: 'Gerenciar Cotações',
      url: createPageUrl('GerenciarCotacoes'),
      icon: MessageSquare,
    },
    {
      title: t('common.routeManagement'),
      url: createPageUrl('GestaoRotas'),
      icon: MapPin,
    },
    {
      title: 'Tipos de Veículos',
      url: createPageUrl('GerenciarVeiculos'),
      icon: Car,
    },
    {
      title: t('common.settings'),
      url: createPageUrl('Configuracoes'),
      icon: Settings,
    }
  ];

  const navigationItems = isAdmin 
    ? [...publicPages, ...userPages, ...adminPages] 
    : [...publicPages, ...userPages];

  if (isLoading && isProtectedPage) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Carregando...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex w-full bg-gradient-to-br from-blue-50 via-white to-blue-50 relative overflow-hidden">
      <div className="hidden lg:block absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-20 -left-20 w-96 h-96 bg-gradient-to-br from-blue-200/30 to-blue-300/20 rounded-full blur-3xl animate-blob"></div>
        <div className="absolute top-40 right-20 w-80 h-80 bg-gradient-to-br from-green-200/25 to-blue-200/20 rounded-full blur-3xl animate-blob animation-delay-2000"></div>
        <div className="absolute -bottom-20 left-1/3 w-96 h-96 bg-gradient-to-br from-purple-200/20 to-blue-300/25 rounded-full blur-3xl animate-blob animation-delay-4000"></div>
        <div className="absolute bottom-40 -right-20 w-80 h-80 bg-gradient-to-br from-blue-300/25 to-cyan-200/20 rounded-full blur-3xl animate-blob animation-delay-6000"></div>
      </div>

      <Sidebar className="border-r border-gray-200 bg-white relative z-10">
        <SidebarHeader className="border-b border-gray-200 p-6">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-gradient-to-br from-blue-600 to-blue-700 rounded-xl flex items-center justify-center shadow-lg">
              <Calendar className="w-6 h-6 text-white" />
            </div>
            <div>
              <h2 className="font-bold text-xl text-gray-900">TransferOnline</h2>
              <p className="text-xs text-gray-500">Sistema de Reservas</p>
            </div>
          </div>
        </SidebarHeader>
        
        <SidebarContent className="p-3">
          <SidebarGroup>
            <SidebarGroupLabel className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-3 py-2">
              Menu
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                {navigationItems.map((item) => (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton 
                      asChild 
                      className={`hover:bg-blue-50 hover:text-blue-700 transition-colors duration-200 rounded-lg mb-1 ${
                        location.pathname === item.url ? 'bg-blue-50 text-blue-700 font-semibold' : ''
                      }`}
                    >
                      <Link to={item.url} className="flex items-center gap-3 px-3 py-3">
                        <item.icon className="w-5 h-5" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        </SidebarContent>

        <SidebarFooter className="border-t border-gray-200 p-4 space-y-3">
          <LanguageSelector />
          
          {user ? (
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center">
                  <span className="text-blue-700 font-semibold text-sm">
                    {user.full_name?.[0]?.toUpperCase() || 'U'}
                  </span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-gray-900 text-sm truncate">{user.full_name}</p>
                  <p className="text-xs text-gray-500 truncate">{user.email}</p>
                  {isAdmin && (
                    <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                      Administrador
                    </span>
                  )}
                </div>
              </div>
              <button
                onClick={() => base44.auth.logout()}
                className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
              >
                <LogOut className="w-4 h-4" />
                {t('common.logout')}
              </button>
            </div>
          ) : (
            <Button
              onClick={() => base44.auth.redirectToLogin()}
              variant="outline"
              className="w-full"
            >
              Login / Criar Conta
            </Button>
          )}
        </SidebarFooter>
      </Sidebar>

      <main className="flex-1 flex flex-col overflow-hidden relative z-10">
        <header className="bg-white border-b border-gray-200 px-6 py-4 md:hidden shadow-sm">
          <div className="flex items-center gap-4">
            <SidebarTrigger className="hover:bg-gray-100 p-2 rounded-lg transition-colors duration-200" />
            <h1 className="text-xl font-bold text-gray-900">TransferOnline</h1>
          </div>
        </header>

        <div className="flex-1 overflow-auto">
          <Outlet />
        </div>
      </main>

      {/* Botão Flutuante do WhatsApp */}
      <WhatsAppButton />

      <style jsx>{`
        @keyframes blob {
          0%, 100% {
            transform: translate(0px, 0px) scale(1);
          }
          33% {
            transform: translate(30px, -50px) scale(1.1);
          }
          66% {
            transform: translate(-20px, 20px) scale(0.9);
          }
        }

        .animate-blob {
          animation: blob 20s infinite ease-in-out;
        }

        .animation-delay-2000 {
          animation-delay: 2s;
        }

        .animation-delay-4000 {
          animation-delay: 4s;
        }

        .animation-delay-6000 {
          animation-delay: 6s;
        }
      `}</style>
    </div>
  );
}

export default function Layout() {
  return (
    <SidebarProvider>
      <LanguageProvider>
        <LayoutContent />
      </LanguageProvider>
    </SidebarProvider>
  );
}

