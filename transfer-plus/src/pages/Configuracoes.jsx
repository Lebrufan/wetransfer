
import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Settings, MessageCircle, Save, AlertCircle, CheckCircle, ArrowLeftRight, Percent, Image as ImageIcon, Upload, X, Mail, MapPin } from 'lucide-react';
import { useLanguage } from '../components/LanguageContext';

export default function Configuracoes() {
  const { t } = useLanguage();
  const queryClient = useQueryClient();
  const [isCheckingAuth, setIsCheckingAuth] = React.useState(true);
  const [whatsappNumber, setWhatsappNumber] = useState('');
  const [roundTripDiscount, setRoundTripDiscount] = useState('10');
  const [splashScreenUrl, setSplashScreenUrl] = useState('');
  const [defaultLogoUrl, setDefaultLogoUrl] = useState('');
  const [adminEmail, setAdminEmail] = useState(''); // New state for admin email
  const [supplierBaseAddress, setSupplierBaseAddress] = useState(''); // New state for supplier base address
  const [uploadingImage, setUploadingImage] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  // Verificar se é admin
  React.useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (currentUser.role !== 'admin') {
          window.location.href = '/'; // Redirect to home if not admin
          return;
        }
        setIsCheckingAuth(false);
      } catch (error) {
        console.error("Authentication check failed:", error);
        base44.auth.redirectToLogin(); // Redirect to login if not authenticated or error
      }
    };

    checkAuth();
  }, []);

  const { data: configs, isLoading } = useQuery({
    queryKey: ['appConfigs'],
    queryFn: () => base44.entities.AppConfig.list(),
    initialData: [],
    enabled: !isCheckingAuth // Only fetch configs if auth check is complete
  });

  React.useEffect(() => {
    if (!isCheckingAuth) { // Only process configs once authentication is verified
      const whatsappConfig = configs.find(c => c.config_key === 'whatsapp_number');
      if (whatsappConfig) {
        setWhatsappNumber(whatsappConfig.config_value || '');
      }
      
      const discountConfig = configs.find(c => c.config_key === 'round_trip_discount_percentage');
      if (discountConfig) {
        setRoundTripDiscount(discountConfig.config_value || '10');
      }

      const splashConfig = configs.find(c => c.config_key === 'splash_screen_url');
      if (splashConfig) {
        setSplashScreenUrl(splashConfig.config_value || '');
      }

      const logoConfig = configs.find(c => c.config_key === 'default_splash_logo_url');
      if (logoConfig) {
        setDefaultLogoUrl(logoConfig.config_value || '');
      }

      const emailConfig = configs.find(c => c.config_key === 'admin_notification_email');
      if (emailConfig) {
        setAdminEmail(emailConfig.config_value || '');
      }

      const supplierAddressConfig = configs.find(c => c.config_key === 'supplier_base_address');
      if (supplierAddressConfig) {
        setSupplierBaseAddress(supplierAddressConfig.config_value || '');
      }
    }
  }, [configs, isCheckingAuth]);

  const updateConfigMutation = useMutation({
    mutationFn: async (dataArray) => {
      const results = [];
      for (const config of dataArray) {
        const existing = configs.find(c => c.config_key === config.config_key);
        if (existing) {
          results.push(await base44.entities.AppConfig.update(existing.id, config));
        } else {
          results.push(await base44.entities.AppConfig.create(config));
        }
      }
      return results;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['appConfigs'] });
      setSuccess(true);
      setError('');
      setTimeout(() => setSuccess(false), 3000);
    },
    onError: (err) => {
      console.error("Failed to save configurations:", err);
      setError('Erro ao salvar configurações. Tente novamente.');
      setSuccess(false);
    }
  });

  const handleImageUpload = async (e, type = 'splash') => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      setError('Por favor, selecione apenas arquivos de imagem.');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      setError('A imagem deve ter no máximo 5MB.');
      return;
    }

    if (type === 'splash') {
      setUploadingImage(true);
    } else {
      setUploadingLogo(true);
    }
    setError('');

    try {
      const response = await base44.integrations.Core.UploadFile({ file });
      if (type === 'splash') {
        setSplashScreenUrl(response.file_url);
        setUploadingImage(false);
      } else {
        setDefaultLogoUrl(response.file_url);
        setUploadingLogo(false);
      }
    } catch (err) {
      console.error('Erro ao fazer upload:', err);
      setError('Erro ao fazer upload da imagem. Tente novamente.');
      if (type === 'splash') {
        setUploadingImage(false);
      } else {
        setUploadingLogo(false);
      }
    }
  };

  const handleRemoveSplash = () => {
    setSplashScreenUrl('');
  };

  const handleRemoveLogo = () => {
    setDefaultLogoUrl('');
  };

  const handleSave = (e) => {
    e.preventDefault();
    setError('');

    if (!whatsappNumber) {
      setError('Por favor, informe o número do WhatsApp.');
      return;
    }
    if (!whatsappNumber.startsWith('+')) {
      setError('O número do WhatsApp deve começar com + seguido do código do país (ex: +5511999998888)');
      return;
    }

    const discount = parseFloat(roundTripDiscount);
    if (isNaN(discount) || discount < 0 || discount > 100) {
      setError('O percentual de desconto deve ser um número entre 0 e 100.');
      return;
    }

    // New validation for admin email
    if (adminEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(adminEmail)) {
      setError('Por favor, informe um e-mail válido para notificações administrativas.');
      return;
    }

    // Validation for supplier base address
    if (!supplierBaseAddress) {
      setError('Por favor, informe o endereço base do fornecedor.');
      return;
    }

    updateConfigMutation.mutate([
      {
        config_key: 'whatsapp_number',
        config_value: whatsappNumber,
        description: 'Número do WhatsApp para contato e suporte'
      },
      {
        config_key: 'round_trip_discount_percentage',
        config_value: roundTripDiscount,
        description: 'Percentual de desconto para reservas de ida e volta'
      },
      {
        config_key: 'splash_screen_url',
        config_value: splashScreenUrl,
        description: 'URL da imagem do splash screen'
      },
      {
        config_key: 'default_splash_logo_url',
        config_value: defaultLogoUrl,
        description: 'URL do logo padrão exibido no splash screen quando não há imagem personalizada'
      },
      // New config for admin email
      {
        config_key: 'admin_notification_email',
        config_value: adminEmail,
        description: 'E-mail do administrador para receber notificações de novas reservas'
      },
      // New config for supplier base address
      {
        config_key: 'supplier_base_address',
        config_value: supplierBaseAddress,
        description: 'Endereço base do fornecedor para cálculo de distâncias'
      }
    ]);
  };

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 p-6 relative overflow-hidden">
      {/* Formas Abstratas Animadas - Apenas Desktop */}
      <div className="hidden lg:block absolute inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-10 right-1/4 w-80 h-80 bg-gradient-to-br from-indigo-300/15 to-purple-200/10 rounded-full blur-3xl animate-blob-config"></div>
        <div className="absolute bottom-10 left-1/4 w-96 h-96 bg-gradient-to-br from-blue-300/15 to-cyan-200/10 rounded-full blur-3xl animate-blob-config animation-delay-6000"></div>
        <div className="absolute top-1/3 left-10 w-72 h-72 bg-gradient-to-br from-green-200/10 to-blue-200/15 rounded-full blur-3xl animate-blob-config animation-delay-9000"></div>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        <div className="mb-8">
          <div className="flex items-center gap-3 mb-2">
            <Settings className="w-8 h-8 text-blue-600" />
            <h1 className="text-4xl font-bold text-gray-900">
              {t('settings.title')}
            </h1>
          </div>
          <p className="text-gray-600">{t('settings.subtitle')}</p>
        </div>

        {isLoading && !isCheckingAuth ? ( // Only show loading for configs if auth is done
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto" />
          </div>
        ) : (
          <form onSubmit={handleSave} className="space-y-6">
            {success && (
              <Alert className="bg-green-50 border-green-200">
                <CheckCircle className="h-4 w-4 text-green-600" />
                <AlertDescription className="text-green-800">
                  {t('settings.savedSuccessfully')}
                </AlertDescription>
              </Alert>
            )}

            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* Splash Screen Config Card */}
            <Card className="shadow-xl">
              <CardHeader className="bg-gradient-to-r from-indigo-600 to-indigo-700 text-white">
                <div className="flex items-center gap-3">
                  <ImageIcon className="w-6 h-6" />
                  <div>
                    <CardTitle className="text-2xl">Splash Screen</CardTitle>
                    <CardDescription className="text-indigo-100">
                      Configure a imagem de carregamento inicial do aplicativo
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-semibold mb-3 block">
                      Imagem do Splash Screen (Opcional)
                    </Label>
                    
                    {splashScreenUrl ? (
                      <div className="space-y-3">
                        <div className="relative inline-block">
                          <img
                            src={splashScreenUrl}
                            alt="Splash Screen Preview"
                            className="max-w-xs w-full h-auto rounded-lg border-2 border-gray-200 shadow-md"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 rounded-full"
                            onClick={handleRemoveSplash}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-sm text-gray-500">
                          Clique no X para remover a imagem atual
                        </p>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors">
                        <input
                          type="file"
                          id="splash-upload"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, 'splash')}
                          className="hidden"
                          disabled={uploadingImage}
                        />
                        <label
                          htmlFor="splash-upload"
                          className="cursor-pointer flex flex-col items-center"
                        >
                          <Upload className="w-12 h-12 text-gray-400 mb-3" />
                          <span className="text-sm font-medium text-gray-700 mb-1">
                            {uploadingImage ? 'Fazendo upload...' : 'Clique para fazer upload'}
                          </span>
                          <span className="text-xs text-gray-500">
                            PNG, JPG, GIF até 5MB
                          </span>
                        </label>
                      </div>
                    )}
                  </div>

                  <div className="bg-indigo-50 border border-indigo-200 rounded-lg p-4">
                    <h4 className="font-semibold text-indigo-900 mb-2">Dicas para o Splash Screen:</h4>
                    <ul className="text-sm text-indigo-800 space-y-1">
                      <li>• Use uma imagem com fundo transparente (PNG) ou com cor de fundo</li>
                      <li>• Dimensões recomendadas: 500x500 pixels ou proporção 1:1</li>
                      <li>• A imagem será centralizada na tela com fundo azul gradiente</li>
                      <li>• Se não configurada, o sistema usará o "Logo Padrão" abaixo</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Default Logo Config Card */}
            <Card className="shadow-xl">
              <CardHeader className="bg-gradient-to-r from-purple-600 to-purple-700 text-white">
                <div className="flex items-center gap-3">
                  <ImageIcon className="w-6 h-6" />
                  <div>
                    <CardTitle className="text-2xl">Logo Padrão do Carregamento</CardTitle>
                    <CardDescription className="text-purple-100">
                      Logo que aparece quando o Splash Screen não está configurado
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-semibold mb-3 block">
                      Imagem do Logo Padrão (Opcional)
                    </Label>
                    
                    {defaultLogoUrl ? (
                      <div className="space-y-3">
                        <div className="relative inline-block">
                          <img
                            src={defaultLogoUrl}
                            alt="Logo Padrão Preview"
                            className="max-w-xs w-full h-auto rounded-lg border-2 border-gray-200 shadow-md"
                          />
                          <Button
                            type="button"
                            variant="destructive"
                            size="icon"
                            className="absolute -top-2 -right-2 rounded-full"
                            onClick={handleRemoveLogo}
                          >
                            <X className="w-4 h-4" />
                          </Button>
                        </div>
                        <p className="text-sm text-gray-500">
                          Clique no X para remover a imagem atual
                        </p>
                      </div>
                    ) : (
                      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-purple-400 transition-colors">
                        <input
                          type="file"
                          id="logo-upload"
                          accept="image/*"
                          onChange={(e) => handleImageUpload(e, 'logo')}
                          className="hidden"
                          disabled={uploadingLogo}
                        />
                        <label
                          htmlFor="logo-upload"
                          className="cursor-pointer flex flex-col items-center"
                        >
                          <Upload className="w-12 h-12 text-gray-400 mb-3" />
                          <span className="text-sm font-medium text-gray-700 mb-1">
                            {uploadingLogo ? 'Fazendo upload...' : 'Clique para fazer upload'}
                          </span>
                          <span className="text-xs text-gray-500">
                            PNG, JPG, GIF até 5MB
                          </span>
                        </label>
                      </div>
                    )}
                  </div>

                  <div className="bg-purple-50 border border-purple-200 rounded-lg p-4">
                    <h4 className="font-semibold text-purple-900 mb-2">Sobre o Logo Padrão:</h4>
                    <ul className="text-sm text-purple-800 space-y-1">
                      <li>• Este logo só aparece se o "Splash Screen" acima não estiver configurado</li>
                      <li>• Ideal para um logo mais simples ou marca d'água da empresa</li>
                      <li>• Recomendado: imagem com fundo transparente (PNG)</li>
                      <li>• Se também não configurado, aparecerá o ícone de calendário padrão do sistema</li>
                    </ul>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Endereço Base do Fornecedor */}
            <Card className="shadow-xl">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <div className="flex items-center gap-3">
                  <MapPin className="w-6 h-6" />
                  <div>
                    <CardTitle className="text-2xl">Endereço Base do Fornecedor</CardTitle>
                    <CardDescription className="text-blue-100">
                      Ponto de partida e retorno dos veículos para cálculo de distâncias
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-2">
                  <Label htmlFor="supplierBaseAddress" className="text-base font-semibold">
                    Endereço Completo do Fornecedor *
                  </Label>
                  <Input
                    id="supplierBaseAddress"
                    type="text"
                    value={supplierBaseAddress}
                    onChange={(e) => setSupplierBaseAddress(e.target.value)}
                    placeholder="Ex: Rua Exemplo, 123 - Bairro - Cidade/Estado"
                    className="text-lg h-12"
                  />
                  <p className="text-sm text-gray-500">
                    Este endereço será usado como ponto de partida e retorno para cálculo da distância total percorrida pelos veículos.
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <h4 className="font-semibold text-blue-900 mb-2">
                    📍 Como funciona o cálculo:
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• O sistema calcula: <strong>Base → Origem do Cliente → Destino do Cliente → Base</strong></li>
                    <li>• Essa distância total é usada para calcular o preço da corrida</li>
                    <li>• Garante que o custo operacional real do veículo seja considerado</li>
                    <li>• O cliente vê apenas o preço final, sem os detalhes do cálculo</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* WhatsApp Config Card */}
            <Card className="shadow-xl">
              <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white">
                <div className="flex items-center gap-3">
                  <MessageCircle className="w-6 h-6" />
                  <div>
                    <CardTitle className="text-2xl">{t('settings.whatsappConfig')}</CardTitle>
                    <CardDescription className="text-green-100">
                      {t('settings.whatsappDescription')}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-2">
                  <Label htmlFor="whatsapp" className="text-base font-semibold">
                    {t('settings.whatsappNumber')}
                  </Label>
                  <Input
                    id="whatsapp"
                    type="text"
                    value={whatsappNumber}
                    onChange={(e) => setWhatsappNumber(e.target.value)}
                    placeholder="+5511999998888"
                    className="text-lg h-12"
                  />
                  <p className="text-sm text-gray-500">
                    {t('settings.whatsappHelper')}
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <h4 className="font-semibold text-blue-900 mb-2">
                    {t('settings.formatExample')}
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Brasil (São Paulo): <code className="bg-white px-2 py-1 rounded">+5511999998888</code></li>
                    <li>• Brasil (Rio de Janeiro): <code className="bg-white px-2 py-1 rounded">+5521999998888</code></li>
                    <li>• Estados Unidos: <code className="bg-white px-2 py-1 rounded">+14155552671</code></li>
                    <li>• Espanha: <code className="bg-white px-2 py-1 rounded">+34612345678</code></li>
                  </ul>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mt-4">
                  <div className="flex gap-2">
                    <AlertCircle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                    <div className="text-sm text-yellow-800">
                      <p className="font-semibold mb-1">{t('settings.importantNote')}</p>
                      <p>{t('settings.whatsappWarning')}</p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* E-mail de Notificações Administrativas Card */}
            <Card className="shadow-xl">
              <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white">
                <div className="flex items-center gap-3">
                  <Mail className="w-6 h-6" />
                  <div>
                    <CardTitle className="text-2xl">Notificações por E-mail</CardTitle>
                    <CardDescription className="text-blue-100">
                      Configure o e-mail para receber notificações de novas reservas
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-2">
                  <Label htmlFor="adminEmail" className="text-base font-semibold">
                    E-mail do Administrador (opcional)
                  </Label>
                  <Input
                    id="adminEmail"
                    type="email"
                    value={adminEmail}
                    onChange={(e) => setAdminEmail(e.target.value)}
                    placeholder="admin@seudominio.com"
                    className="text-lg h-12"
                  />
                  <p className="text-sm text-gray-500">
                    Este e-mail receberá notificações sempre que uma nova reserva for confirmada e paga.
                  </p>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                  <h4 className="font-semibold text-blue-900 mb-2">
                    📧 Como funciona:
                  </h4>
                  <ul className="text-sm text-blue-800 space-y-1">
                    <li>• Você receberá um e-mail sempre que houver uma nova reserva confirmada</li>
                    <li>• O e-mail incluirá todos os detalhes da reserva e do cliente</li>
                    <li>• O cliente também receberá um e-mail de confirmação automaticamente</li>
                    <li>• Deixe em branco se não desejar receber notificações por e-mail</li>
                  </ul>
                </div>
              </CardContent>
            </Card>

            {/* Round Trip Discount Config Card */}
            <Card className="shadow-xl">
              <CardHeader className="bg-gradient-to-r from-orange-600 to-orange-700 text-white">
                <div className="flex items-center gap-3">
                  <ArrowLeftRight className="w-6 h-6" />
                  <div>
                    <CardTitle className="text-2xl">Desconto Ida e Volta</CardTitle>
                    <CardDescription className="text-orange-100">
                      Configure o percentual de desconto para reservas de ida e volta
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="discount" className="text-base font-semibold flex items-center gap-2">
                      <Percent className="w-5 h-5 text-orange-600" />
                      Percentual de Desconto (%)
                    </Label>
                    <Input
                      id="discount"
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      value={roundTripDiscount}
                      onChange={(e) => setRoundTripDiscount(e.target.value)}
                      className="text-lg h-12"
                    />
                    <p className="text-sm text-gray-500">
                      Este desconto será aplicado automaticamente quando o cliente agendar ida e volta na mesma reserva.
                    </p>
                  </div>

                  <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                    <h4 className="font-semibold text-orange-900 mb-2">Como funciona:</h4>
                    <p className="text-sm text-orange-800">
                      Exemplo: Se uma viagem de ida custa R$ 100,00 e o retorno também custa R$ 100,00, 
                      com {parseFloat(roundTripDiscount || '0')}% de desconto, o cliente pagará R$ {(200 * (1 - parseFloat(roundTripDiscount || '0') / 100)).toFixed(2)} 
                      ao invés de R$ 200,00.
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Button
              type="submit"
              disabled={updateConfigMutation.isPending || uploadingImage || uploadingLogo}
              className="w-full bg-green-600 hover:bg-green-700 h-12 text-lg"
            >
              {updateConfigMutation.isPending ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2" />
                  {t('common.processing')}
                </>
              ) : (
                <>
                  <Save className="w-5 h-5 mr-2" />
                  {t('common.save')}
                </>
              )}
            </Button>
          </form>
        )}
      </div>

      <style jsx>{`
        @keyframes blob-config {
          0%, 100% {
            transform: translate(0px, 0px) scale(1);
          }
          50% {
            transform: translate(30px, -30px) scale(1.15);
          }
        }

        .animate-blob-config {
          animation: blob-config 32s infinite ease-in-out;
        }

        .animation-delay-6000 {
          animation-delay: 6s;
        }

        .animation-delay-9000 {
          animation-delay: 9s;
        }
      `}</style>
    </div>
  );
}
