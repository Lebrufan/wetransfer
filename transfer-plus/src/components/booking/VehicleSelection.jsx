
import React, { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Users, Briefcase, Check, Loader2, Lock, LogIn, Globe, Sparkles, ArrowRight, Clock, AlertCircle, MessageSquare } from 'lucide-react';

export default function VehicleSelection({ 
  vehicles, 
  selectedVehicleId, 
  onSelectVehicle, 
  onDriverLanguageChange,
  isCalculating,
  isLoggedIn = false,
  selectedDriverLanguage = 'pt',
  bookingDateTime = null,
  onRequestQuote
}) {
  const [selectedLanguages, setSelectedLanguages] = useState({});

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  // Função para obter idiomas disponíveis para um veículo específico
  const getAvailableLanguages = (vehicle) => {
    const languages = [
      { code: 'pt', name: 'Português', flag: '🇧🇷', always_available: true }
    ];

    // Adicionar inglês se houver sobretaxa configurada (> 0)
    if (vehicle.language_surcharge_en !== undefined && 
        vehicle.language_surcharge_en !== null && 
        vehicle.language_surcharge_en > 0) {
      languages.push({ code: 'en', name: 'English', flag: '🇺🇸' });
    }

    // Adicionar espanhol se houver sobretaxa configurada (> 0)
    if (vehicle.language_surcharge_es !== undefined && 
        vehicle.language_surcharge_es !== null && 
        vehicle.language_surcharge_es > 0) {
      languages.push({ code: 'es', name: 'Español', flag: '🇪🇸' });
    }

    return languages;
  };

  const handleLanguageChange = (vehicleId, language) => {
    setSelectedLanguages(prev => ({
      ...prev,
      [vehicleId]: language
    }));
    
    // Notificar o componente pai sobre a mudança de idioma
    // para que ele possa recalcular os preços
    if (onDriverLanguageChange) {
      onDriverLanguageChange(language);
    }
  };

  const handleSelectVehicle = (vehicle) => {
    const language = selectedLanguages[vehicle?.id] || selectedDriverLanguage || 'pt';
    onSelectVehicle(vehicle, language);
  };

  const handleLoginClick = () => {
    onSelectVehicle(null, selectedDriverLanguage || 'pt');
  };

  if (isCalculating) {
    return (
      <div className="text-center py-16">
        <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-br from-blue-500 to-blue-600 rounded-full mb-4 animate-pulse">
          <Loader2 className="w-8 h-8 text-white animate-spin" />
        </div>
        <p className="text-gray-700 text-lg font-medium">Calculando as melhores opções para você...</p>
      </div>
    );
  }

  if (!vehicles || vehicles.length === 0) {
    return (
      <div className="text-center py-16 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-3xl border-2 border-yellow-200 shadow-lg">
        <p className="text-gray-700 text-xl font-semibold">
          Nenhum veículo disponível no momento. Entre em contato conosco.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="text-center mb-10">
        <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-semibold mb-4 shadow-lg">
          <Sparkles className="w-4 h-4" />
          Passo 2 de 3
        </div>
        <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-3 bg-clip-text text-transparent bg-gradient-to-r from-gray-900 to-gray-700">
          Escolha seu Veículo
        </h2>
        <p className="text-gray-600 text-lg">
          {isLoggedIn 
            ? 'Selecione o veículo ideal para sua viagem'
            : 'Veja as opções disponíveis e faça login para visualizar os preços'
          }
        </p>
      </div>

      {!isLoggedIn && (
        <div className="bg-gradient-to-br from-blue-600 via-blue-700 to-blue-800 text-white rounded-3xl p-8 mb-10 shadow-2xl transform transition-all duration-300 hover:scale-[1.02]">
          <div className="flex flex-col md:flex-row items-center justify-between gap-6">
            <div className="flex items-center gap-5">
              <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg">
                <Lock className="w-8 h-8" />
              </div>
              <div>
                <h3 className="font-bold text-2xl mb-2">Preços Exclusivos para Clientes</h3>
                <p className="text-blue-100 text-base">
                  Faça login ou crie sua conta para ver os preços e fazer sua reserva
                </p>
              </div>
            </div>
            <Button
              onClick={handleLoginClick}
              size="lg"
              className="bg-white text-blue-700 hover:bg-blue-50 font-bold text-lg px-8 py-6 rounded-2xl shadow-xl transform transition-all duration-300 hover:scale-105"
            >
              <LogIn className="w-5 h-5 mr-2" />
              Fazer Login / Criar Conta
            </Button>
          </div>
        </div>
      )}

      <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
        {vehicles.map((vehicle) => {
          const availableLanguages = getAvailableLanguages(vehicle);
          const currentLanguage = selectedLanguages[vehicle.id] || selectedDriverLanguage;
          
          // Se o idioma selecionado não está disponível para este veículo, resetar para 'pt'
          const isLanguageAvailable = availableLanguages.some(lang => lang.code === currentLanguage);
          const displayLanguage = isLanguageAvailable ? currentLanguage : 'pt';

          // Verificar se o veículo atende à antecedência mínima
          let meetsLeadTime = true;
          let leadTimeMessage = '';
          
          if (bookingDateTime && vehicle.min_booking_lead_time_hours) {
            const now = new Date();
            const diffMs = bookingDateTime.getTime() - now.getTime();
            const diffHours = diffMs / (1000 * 60 * 60);
            meetsLeadTime = diffHours >= vehicle.min_booking_lead_time_hours;
            
            if (!meetsLeadTime) {
              leadTimeMessage = `Requer ${vehicle.min_booking_lead_time_hours}h de antecedência`;
            } else {
              leadTimeMessage = `Antecedência: ${vehicle.min_booking_lead_time_hours}h`;
            }
          } else if (vehicle.min_booking_lead_time_hours) {
            leadTimeMessage = `Antecedência: ${vehicle.min_booking_lead_time_hours}h`;
          }

          // Verificar se está fora do raio de atuação
          const outsideRadius = vehicle.calculation_details?.outside_operational_radius || false;
          const operationalRadius = vehicle.calculation_details?.operational_radius_km || 0;


          return (
            <Card
              key={vehicle.id}
              className={`overflow-hidden transform transition-all duration-300 hover:shadow-2xl hover:-translate-y-2 rounded-3xl ${
                selectedVehicleId === vehicle.id
                  ? 'ring-4 ring-blue-500 shadow-2xl scale-105'
                  : 'hover:ring-2 hover:ring-blue-300'
              } ${!meetsLeadTime || outsideRadius ? 'opacity-60' : ''}`}
            >
              <CardContent className="p-0">
                <div className="relative bg-gradient-to-br from-gray-50 via-gray-100 to-gray-50 p-8 min-h-[200px] flex items-center justify-center">
                  {selectedVehicleId === vehicle.id && isLoggedIn && !outsideRadius && (
                    <div className="absolute top-4 right-4 w-10 h-10 bg-gradient-to-br from-green-500 to-green-600 rounded-full flex items-center justify-center z-10 shadow-lg animate-bounce">
                      <Check className="w-6 h-6 text-white" />
                    </div>
                  )}
                  
                  {vehicle.image_url ? (
                    <img
                      src={vehicle.image_url}
                      alt={vehicle.name}
                      className="w-full h-48 object-contain drop-shadow-2xl"
                      style={{ 
                        filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.15))',
                        maxHeight: '200px',
                        height: 'auto'
                      }}
                      onError={(e) => {
                        e.target.style.display = 'none'; // Hide the broken image icon
                        const fallback = document.createElement('div');
                        fallback.className = 'w-full h-48 flex items-center justify-center';
                        // Using a simple SVG for users icon as a fallback
                        fallback.innerHTML = '<svg class="w-24 h-24 text-gray-300" fill="currentColor" viewBox="0 0 20 20"><path d="M13 6a3 3 0 11-6 0 3 3 0 016 0zM18 8a2 2 0 11-4 0 2 2 0 014 0zM14 15a4 4 0 00-8 0v3h8v-3zM6 8a2 2 0 11-4 0 2 2 0 014 0zM16 18v-3a5.972 5.972 0 00-.75-2.906A3.005 3.005 0 0119 15v3h-3zM4.75 12.094A5.973 5.973 0 004 15v3H1v-3a3 3 0 013.75-2.906z"></path></svg>';
                        e.target.parentElement.appendChild(fallback);
                      }}
                    />
                  ) : (
                    <div className="w-full h-48 flex items-center justify-center">
                      <Users className="w-24 h-24 text-gray-300" />
                    </div>
                  )}

                  <div className="absolute bottom-4 right-4 flex items-center gap-3">
                    <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-full shadow-lg">
                      <Users className="w-4 h-4 text-blue-600" />
                      <span className="font-bold text-gray-900 text-sm">{vehicle.max_passengers}</span>
                    </div>
                    <div className="flex items-center gap-1.5 bg-white/90 backdrop-blur-sm px-3 py-2 rounded-full shadow-lg">
                      <Briefcase className="w-4 h-4 text-blue-600" />
                      <span className="font-bold text-gray-900 text-sm">{vehicle.max_luggage}</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 space-y-5 bg-white">
                  <h3 className="text-2xl font-bold text-gray-900 leading-tight">{vehicle.name}</h3>

                  {vehicle.description && (
                    <p className="text-sm text-gray-600 line-clamp-2">{vehicle.description}</p>
                  )}

                  {/* Antecedência Mínima */}
                  {bookingDateTime && vehicle.min_booking_lead_time_hours !== undefined && (
                    <div className={`flex items-center gap-2 p-2 rounded-lg ${
                      meetsLeadTime ? 'bg-green-50 border border-green-200' : 'bg-red-50 border border-red-200'
                    }`}>
                      <Clock className={`w-4 h-4 ${meetsLeadTime ? 'text-green-600' : 'text-red-600'}`} />
                      <span className={`text-xs font-medium ${meetsLeadTime ? 'text-green-800' : 'text-red-800'}`}>
                        {leadTimeMessage}
                      </span>
                    </div>
                  )}

                  {/* Raio de Atuação */}
                  {outsideRadius && operationalRadius > 0 && (
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                      <div className="flex items-start gap-2 mb-2">
                        <AlertCircle className="w-5 h-5 text-orange-600 flex-shrink-0 mt-0.5" />
                        <div>
                          <p className="text-sm font-semibold text-orange-900">
                            Fora do raio de atuação
                          </p>
                          <p className="text-xs text-orange-700 mt-1">
                            Este veículo atende trajetos de até {operationalRadius} km. Solicite uma cotação personalizada.
                          </p>
                        </div>
                      </div>
                    </div>
                  )}

                  {!meetsLeadTime && bookingDateTime && !outsideRadius && (
                    <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                      <p className="text-xs text-red-800">
                        ⚠️ Este veículo não está disponível para a data/hora selecionada. 
                        Volte e escolha uma data com pelo menos {vehicle.min_booking_lead_time_hours} horas de antecedência.
                      </p>
                    </div>
                  )}

                  {isLoggedIn && vehicle.calculated_price !== null && !outsideRadius ? (
                    <div className="text-center py-4 bg-gradient-to-br from-yellow-50 to-orange-50 rounded-2xl border-2 border-yellow-200">
                      <div className="text-3xl font-bold text-gray-900">
                        {formatPrice(vehicle.calculated_price)}
                      </div>
                      {vehicle.calculation_details?.min_price_applied && (
                        <p className="text-xs text-amber-600 mt-1 font-medium">* Preço mínimo aplicado</p>
                      )}
                      {vehicle.calculation_details?.package_type && (
                        <p className="text-xs text-blue-600 mt-1 font-medium">
                          {vehicle.calculation_details.package_type === 'fixed_5_hours' && '📦 Pacote de 5 horas'}
                          {vehicle.calculation_details.package_type === 'fixed_10_hours' && '📦 Pacote de 10 horas'}
                          {vehicle.calculation_details.km_allowance && ` - ${vehicle.calculation_details.km_allowance} km franquia`}
                        </p>
                      )}
                      {vehicle.calculation_details?.language_surcharge && vehicle.calculation_details.language_surcharge.amount > 0 && (
                        <p className="text-xs text-purple-600 mt-1 font-medium">
                          Inclui sobretaxa de idioma: {formatPrice(vehicle.calculation_details.language_surcharge.amount)}
                        </p>
                      )}
                    </div>
                  ) : outsideRadius ? (
                    <div className="text-center py-4 bg-gradient-to-br from-orange-50 to-amber-50 rounded-2xl border-2 border-orange-300">
                      <div className="flex flex-col items-center gap-2">
                        <MessageSquare className="w-8 h-8 text-orange-600" />
                        <span className="text-lg font-bold text-orange-900">Cotação Personalizada</span>
                        <span className="text-xs text-orange-700">Solicite um orçamento sob medida</span>
                      </div>
                    </div>
                  ) : (
                    <div className="relative text-center py-6 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl border-2 border-gray-300 overflow-hidden">
                      <div className="absolute inset-0 flex items-center justify-center">
                        <div className="text-4xl font-bold text-gray-400 blur-md select-none">
                          R$ •••,••
                        </div>
                      </div>
                      
                      <div className="relative z-10 flex flex-col items-center justify-center gap-2 backdrop-blur-[2px]">
                        <Lock className="w-6 h-6 text-gray-600" />
                        <span className="text-sm font-bold text-gray-700">Preço Exclusivo</span>
                        <span className="text-xs text-gray-600">Faça login para visualizar</span>
                      </div>
                    </div>
                  )}

                  <div className="space-y-2">
                    <label className="text-sm font-bold text-gray-700 flex items-center gap-2">
                      <Globe className="w-4 h-4 text-blue-600" />
                      Idioma do Motorista
                      {availableLanguages.length === 1 && (
                        <span className="text-xs text-gray-500 font-normal">(Apenas Português disponível)</span>
                      )}
                    </label>
                    <Select
                      value={displayLanguage}
                      onValueChange={(value) => handleLanguageChange(vehicle.id, value)}
                      disabled={availableLanguages.length === 1 || !meetsLeadTime || outsideRadius}
                    >
                      <SelectTrigger className={`w-full h-12 rounded-xl border-2 border-gray-200 hover:border-blue-400 transition-colors ${
                        availableLanguages.length === 1 || !meetsLeadTime || outsideRadius ? 'bg-gray-50 cursor-not-allowed' : ''
                      }`}>
                        <SelectValue placeholder="Selecione o idioma" />
                      </SelectTrigger>
                      <SelectContent className="rounded-xl">
                        {availableLanguages.map((lang) => (
                          <SelectItem key={lang.code} value={lang.code} className="text-base">
                            {lang.flag} {lang.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    {availableLanguages.length > 1 && (
                      <p className="text-xs text-gray-500">
                        Idiomas disponíveis para este veículo: {availableLanguages.map(l => l.name).join(', ')}
                      </p>
                    )}
                  </div>

                  {outsideRadius ? (
                    <Button
                      className="w-full h-14 text-base font-bold rounded-2xl shadow-lg transform transition-all duration-300 hover:scale-105 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-700 hover:to-amber-700 text-white"
                      onClick={() => onRequestQuote && onRequestQuote(vehicle, displayLanguage)}
                      disabled={!meetsLeadTime}
                    >
                      <MessageSquare className="w-5 h-5 mr-2" />
                      Solicitar Cotação
                    </Button>
                  ) : (
                    <Button
                      className={`w-full h-14 text-base font-bold rounded-2xl shadow-lg transform transition-all duration-300 hover:scale-105 ${
                        !meetsLeadTime 
                          ? 'bg-gray-400 cursor-not-allowed opacity-50'
                          : isLoggedIn
                            ? selectedVehicleId === vehicle.id
                              ? 'bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white'
                              : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'
                            : 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white'
                      }`}
                      onClick={() => handleSelectVehicle(vehicle)}
                      disabled={!meetsLeadTime}
                    >
                      {!meetsLeadTime ? (
                        <>
                          <AlertCircle className="w-5 h-5 mr-2" />
                          Não Disponível
                        </>
                      ) : isLoggedIn ? (
                        selectedVehicleId === vehicle.id ? (
                          <>
                            <Check className="w-5 h-5 mr-2" />
                            Veículo Selecionado
                          </>
                        ) : (
                          <>
                            <ArrowRight className="w-5 h-5 mr-2" />
                            Selecionar e Continuar
                          </>
                        )
                      ) : (
                        <>
                          <LogIn className="w-5 h-5 mr-2" />
                          Fazer Login para Continuar
                        </>
                      )}
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
