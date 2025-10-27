import React, { useState, useCallback, useMemo, useEffect, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Calendar, Clock, ArrowRight, CheckCircle, AlertCircle, Loader2, Sparkles } from 'lucide-react';
import { format } from 'date-fns';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

import VehicleSelection from '../components/booking/VehicleSelection';
import BookingForm from '../components/booking/BookingForm';
import LocationAutocomplete from '../components/booking/LocationAutocomplete';

const BOOKING_STATE_KEY = 'transferonline_booking_state';

export default function NovaReserva() {
  const [step, setStep] = useState(1);
  const [serviceType, setServiceType] = useState('one_way');
  const [paymentCompleted, setPaymentCompleted] = useState(false);
  const [bookingNumber, setBookingNumber] = useState(null);
  const [user, setUser] = useState(null);
  const [driverLanguage, setDriverLanguage] = useState('pt');
  const [isInitializing, setIsInitializing] = useState(true);
  const hasRestoredStateRef = useRef(false);

  const [formData, setFormData] = useState({
    origin: '',
    destination: '',
    date: '',
    time: '',
    return_date: '',
    return_time: '',
    hours: 5
  });

  const [isCustomHours, setIsCustomHours] = useState(false);

  const [distanceData, setDistanceData] = useState(null);
  const [distanceError, setDistanceError] = useState('');
  const [leadTimeError, setLeadTimeError] = useState('');
  const [isCalculatingDistance, setIsCalculatingDistance] = useState(false);

  const [vehiclesWithPrices, setVehiclesWithPrices] = useState([]);
  const [selectedVehicle, setSelectedVehicle] = useState(null);
  const [isCalculatingPrices, setIsCalculatingPrices] = useState(false);

  const { data: vehicleTypes = [], isLoading: isLoadingVehicleTypes } = useQuery({
    queryKey: ['vehicleTypes'],
    queryFn: () => base44.entities.VehicleType.filter({ active: true }),
    staleTime: 60000,
  });

  const minDate = useMemo(() => format(new Date(), 'yyyy-MM-dd'), []);

  const minDateBasedOnLeadTime = useMemo(() => {
    if (vehicleTypes.length === 0) return minDate;

    const minLeadTimeHours = Math.min(
      ...vehicleTypes.map(v => v.min_booking_lead_time_hours || 24)
    );

    const minDateTime = new Date();
    minDateTime.setHours(minDateTime.getHours() + minLeadTimeHours);

    return format(minDateTime, 'yyyy-MM-dd');
  }, [vehicleTypes, minDate]);

  const clearBookingState = useCallback(() => {
    localStorage.removeItem(BOOKING_STATE_KEY);
    console.log('[NovaReserva] Estado da reserva limpo do localStorage');
  }, []);

  const saveBookingState = useCallback((requestingQuote) => {
    const state = {
      step,
      serviceType,
      formData,
      distanceData,
      selectedVehicleId: selectedVehicle?.id,
      driverLanguage,
      isCustomHours,
      timestamp: Date.now(),
      requestingQuote: requestingQuote || false
    };
    localStorage.setItem(BOOKING_STATE_KEY, JSON.stringify(state));
    console.log('[NovaReserva] Estado salvo:', state);
  }, [step, serviceType, formData, distanceData, selectedVehicle, driverLanguage, isCustomHours]);

  useEffect(() => {
    if (isInitializing || step === 0 || paymentCompleted) {
      return;
    }

    const debounceTimer = setTimeout(() => {
      saveBookingState(false);
    }, 1000);

    return () => clearTimeout(debounceTimer);
  }, [step, serviceType, formData, distanceData, selectedVehicle, driverLanguage, isInitializing, saveBookingState, isCustomHours, paymentCompleted]);

  const calculatePricesForAllVehicles = useCallback(async (authenticatedUser, customFormData, customDistanceData, customServiceType, customDriverLanguage) => {
    if (!authenticatedUser) {
      console.log('[NovaReserva] Usuário não autenticado, pulando cálculo de preços');
      return null;
    }

    setIsCalculatingPrices(true);

    const dataToUse = customFormData || formData;
    const distanceToUse = customDistanceData || distanceData;
    const serviceToUse = customServiceType || serviceType;
    const languageToUse = customDriverLanguage || driverLanguage;

    console.log('[NovaReserva] Calculando preços para todos os veículos...', {
      serviceType: serviceToUse,
      origin: dataToUse.origin,
      destination: dataToUse.destination,
      hours: serviceToUse === 'hourly' ? dataToUse.hours : null,
      language: languageToUse,
      user: authenticatedUser.email
    });

    const priceCalculationPromises = vehicleTypes.map(async (vehicle) => {
      try {
        const priceResponse = await base44.functions.invoke('calculateTransferPrice', {
          service_type: serviceToUse,
          vehicle_type_id: vehicle.id,
          origin: dataToUse.origin,
          destination: dataToUse.destination,
          date: dataToUse.date,
          time: dataToUse.time,
          return_date: serviceToUse === 'round_trip' ? dataToUse.return_date : null,
          return_time: serviceToUse === 'round_trip' ? dataToUse.return_time : null,
          hours: serviceToUse === 'hourly' ? dataToUse.hours : null,
          driver_language: languageToUse
        });

        if (priceResponse.data && priceResponse.data.pricing) {
          return {
            ...vehicle,
            calculated_price: priceResponse.data.pricing.total_price,
            calculation_details: priceResponse.data.pricing.calculation_details
          };
        }
      } catch (error) {
        console.error(`Erro ao calcular preço para ${vehicle.name}:`, error);
      }
      
      return {
        ...vehicle,
        calculated_price: null
      };
    });

    const vehiclePrices = await Promise.all(priceCalculationPromises);

    vehiclePrices.sort((a, b) => {
      if (a.display_order !== b.display_order) {
        return a.display_order - b.display_order;
      }
      return (a.calculated_price || 0) - (b.calculated_price || 0);
    });

    console.log('[NovaReserva] Preços calculados:', vehiclePrices.length, 'veículos');
    setVehiclesWithPrices(vehiclePrices);
    setIsCalculatingPrices(false);
    return vehiclePrices;
  }, [vehicleTypes, formData, distanceData, serviceType, driverLanguage]);

  const handleNewBooking = useCallback(() => {
    setStep(1);
    setServiceType('one_way');
    setFormData({
      origin: '',
      destination: '',
      date: '',
      time: '',
      return_date: '',
      return_time: '',
      hours: 5
    });
    setIsCustomHours(false);
    setDistanceData(null);
    setVehiclesWithPrices([]);
    setSelectedVehicle(null);
    setPaymentCompleted(false);
    setBookingNumber(null);
    setDriverLanguage('pt');
    clearBookingState();
  }, [clearBookingState]);

  const handleRequestQuote = useCallback(async (vehicle, language) => {
    console.log('[NovaReserva] Solicitando cotação para veículo:', vehicle.name);

    try {
      const currentUser = await base44.auth.me();
      if (!currentUser) {
        throw new Error('Usuário não autenticado.');
      }

      const customerPhone = currentUser.phone_number || '';
      const notes = 'Cotação solicitada devido a viagem fora do raio de atuação.';

      const quotePayload = {
        service_type: serviceType,
        vehicle_type_id: vehicle.id,
        vehicle_type_name: vehicle.name,
        driver_language: language,
        origin: formData.origin,
        destination: formData.destination || formData.origin,
        date: formData.date,
        time: formData.time,
        return_date: serviceType === 'round_trip' ? formData.return_date : null,
        return_time: serviceType === 'round_trip' ? formData.return_time : null,
        hours: serviceType === 'hourly' ? formData.hours : null,
        distance_km: vehicle.calculation_details?.supplier_total_distance_km || distanceData?.distance_km || 0,
        duration_minutes: distanceData?.duration_minutes || 0,
        passengers: 1,
        customer_name: currentUser.full_name,
        customer_email: currentUser.email,
        customer_phone: customerPhone,
        notes: notes,
        reason: 'Fora do raio de atuação'
      };
      
      console.log('[NovaReserva] Payload para solicitação de cotação:', quotePayload);

      const response = await base44.functions.invoke('submitQuoteRequest', quotePayload);

      if (response.data.success) {
        alert(`Cotação #${response.data.quote_request.quote_number} solicitada com sucesso!\n\nVocê receberá um e-mail com a resposta em breve.`);
        handleNewBooking();
      } else {
        throw new Error(response.data.message || 'Erro desconhecido ao solicitar cotação.');
      }
    } catch (error) {
      console.error('[NovaReserva] Erro ao solicitar cotação:', error);
      
      if (error.response?.status === 401) {
        console.log('[NovaReserva] Usuário não autenticado para solicitar cotação, redirecionando para login...');
        const stateToSave = {
          step: 2,
          serviceType,
          formData,
          distanceData,
          selectedVehicleId: vehicle.id,
          driverLanguage: language,
          isCustomHours,
          timestamp: Date.now(),
          requestingQuote: true
        };
        localStorage.setItem(BOOKING_STATE_KEY, JSON.stringify(stateToSave));
        
        const currentUrl = window.location.pathname + '?from_booking=true';
        base44.auth.redirectToLogin(currentUrl);
      } else {
        alert('Erro ao solicitar cotação. Verifique o console para mais detalhes ou tente novamente.');
      }
    }
  }, [serviceType, formData, distanceData, isCustomHours, handleNewBooking]);

  const handleDriverLanguageChange = useCallback(async (newLanguage) => {
    console.log('[NovaReserva] Idioma do motorista alterado para:', newLanguage);
    
    setDriverLanguage(newLanguage);
    
    if (user && (distanceData || serviceType === 'hourly')) {
      console.log('[NovaReserva] Recalculando preços com novo idioma...');
      await calculatePricesForAllVehicles(user, formData, distanceData, serviceType, newLanguage);
    }
  }, [user, distanceData, formData, serviceType, calculatePricesForAllVehicles]);

  const loadBookingState = useCallback(async (currentUser) => {
    try {
      const savedState = localStorage.getItem(BOOKING_STATE_KEY);
      if (!savedState) {
        console.log('[NovaReserva] Nenhum estado salvo encontrado.');
        return false;
      }

      const state = JSON.parse(savedState);
      console.log('[NovaReserva] Estado recuperado do localStorage:', {
        step: state.step,
        serviceType: state.serviceType,
        hasDistanceData: !!state.distanceData,
        selectedVehicleId: state.selectedVehicleId,
        driverLanguage: state.driverLanguage,
        requestingQuote: state.requestingQuote
      });
      
      const oneHour = 60 * 60 * 1000;
      if (Date.now() - state.timestamp > oneHour) {
        console.log('[NovaReserva] Estado expirado (mais de 1 hora), limpando...');
        clearBookingState();
        return false;
      }

      setServiceType(state.serviceType);
      setFormData(state.formData);
      setDistanceData(state.distanceData);
      setDriverLanguage(state.driverLanguage);
      
      if (state.serviceType === 'hourly') {
        if (typeof state.isCustomHours !== 'undefined') {
          setIsCustomHours(state.isCustomHours);
        } else {
          setIsCustomHours(![5, 10].includes(state.formData.hours));
        }
      } else {
        setIsCustomHours(false);
      }

      console.log('[NovaReserva] Dados básicos restaurados');

      const hasStep1Data = (state.distanceData || state.serviceType === 'hourly');
      
      if (!hasStep1Data) {
        console.log('[NovaReserva] Dados insuficientes, voltando para passo 1');
        setStep(1);
        return true;
      }

      console.log('[NovaReserva] Dados do passo 1 presentes, processando veículos...');

      let calculatedVehicles = [];
      
      if (currentUser) {
        console.log('[NovaReserva] Usuário logado, calculando preços...');
        calculatedVehicles = await calculatePricesForAllVehicles(
          currentUser,
          state.formData,
          state.distanceData,
          state.serviceType,
          state.driverLanguage
        );
      } else {
        console.log('[NovaReserva] Usuário não logado, preparando lista sem preços...');
        calculatedVehicles = vehicleTypes.map(v => ({
          ...v,
          calculated_price: null,
          calculation_details: null
        }));
        calculatedVehicles.sort((a, b) => a.display_order - b.display_order);
        setVehiclesWithPrices(calculatedVehicles);
      }

      if (state.requestingQuote && currentUser && calculatedVehicles && calculatedVehicles.length > 0) {
        const vehicleForQuote = calculatedVehicles.find(v => v.id === state.selectedVehicleId);
        if (vehicleForQuote) {
          console.log('[NovaReserva] Retomando solicitação de cotação para veículo:', vehicleForQuote.name);
          clearBookingState();
          await handleRequestQuote(vehicleForQuote, state.driverLanguage);
          return true;
        }
      }

      if (state.selectedVehicleId && calculatedVehicles && calculatedVehicles.length > 0) {
        const vehicle = calculatedVehicles.find(v => v.id === state.selectedVehicleId);
        if (vehicle) {
          console.log('[NovaReserva] Veículo selecionado encontrado:', vehicle.name);
          setSelectedVehicle(vehicle);
          
          if (currentUser) {
            console.log('[NovaReserva] ✅ Cenário 1: Usuário logado + veículo selecionado = Passo 3');
            setStep(3);
            return true;
          }
        }
      }

      console.log('[NovaReserva] Indo para passo 2 (seleção de veículo)');
      setStep(2);
      return true;

    } catch (error) {
      console.error('[NovaReserva] Erro ao carregar estado:', error);
      clearBookingState();
      return false;
    }
  }, [clearBookingState, calculatePricesForAllVehicles, vehicleTypes, handleRequestQuote]);

  useEffect(() => {
    if (hasRestoredStateRef.current) {
      console.log('[NovaReserva] Estado já foi restaurado, pulando inicialização');
      return;
    }

    if (isLoadingVehicleTypes || vehicleTypes.length === 0) {
      console.log('[NovaReserva] Aguardando vehicleTypes carregar...');
      return;
    }

    const initializeApp = async () => {
      console.log('[NovaReserva] ========== INICIANDO APLICAÇÃO ==========');
      setIsInitializing(true);

      try {
        let currentUser = null;
        try {
          currentUser = await base44.auth.me();
          setUser(currentUser);
          console.log('[NovaReserva] ✅ Usuário autenticado:', currentUser.full_name);
        } catch (authError) {
          console.log('[NovaReserva] ℹ️  Usuário não autenticado');
          setUser(null);
        }

        const urlParams = new URLSearchParams(window.location.search);
        const fromBooking = urlParams.get('from_booking');
        
        if (fromBooking === 'true') {
          console.log('[NovaReserva] 🔄 Retorno do fluxo de login detectado');
          window.history.replaceState({}, '', window.location.pathname);
          
          await loadBookingState(currentUser);
        } else {
          console.log('[NovaReserva] 🆕 Carregamento inicial normal');
          
          if (serviceType === 'hourly' && !localStorage.getItem(BOOKING_STATE_KEY)) {
            setFormData(prev => ({ ...prev, hours: 5 }));
            setIsCustomHours(false);
          }
        }

        hasRestoredStateRef.current = true;

      } catch (error) {
        console.error('[NovaReserva] ❌ Erro durante inicialização:', error);
      } finally {
        setIsInitializing(false);
        console.log('[NovaReserva] ========== INICIALIZAÇÃO CONCLUÍDA ==========');
      }
    };

    initializeApp();
  }, [isLoadingVehicleTypes, vehicleTypes, loadBookingState, serviceType]);

  useEffect(() => {
    if (serviceType === 'hourly') {
      setFormData(prev => ({ ...prev, hours: 5 }));
      setIsCustomHours(false);
    } else {
      setIsCustomHours(false);
    }
  }, [serviceType]);

  const validateStep1 = useCallback(() => {
    setDistanceError('');
    setLeadTimeError('');

    if (serviceType !== 'hourly' && (!formData.origin || !formData.destination)) {
      setDistanceError('Por favor, preencha origem e destino');
      return false;
    }
    
    if (serviceType === 'hourly' && !formData.origin) {
      setDistanceError('Por favor, preencha o ponto de partida');
      return false;
    }

    if (!formData.date || !formData.time) {
      setDistanceError('Por favor, preencha data e horário');
      return false;
    }

    if (serviceType === 'round_trip') {
      if (!formData.return_date || !formData.return_time) {
        setDistanceError('Por favor, preencha data e horário do retorno');
        return false;
      }
    }

    if (serviceType === 'hourly') {
      const hours = formData.hours;
      if (hours === '' || hours === null || hours === undefined || parseFloat(hours) < 5) {
        setDistanceError('Por favor, informe a quantidade de horas (mínimo 5 horas)');
        return false;
      }
    }

    const now = new Date();
    const bookingDateTime = new Date(`${formData.date}T${formData.time}`);
    
    if (isNaN(bookingDateTime.getTime())) {
      setDistanceError('Data ou hora inválida.');
      return false;
    }

    if (bookingDateTime.getTime() < now.getTime()) {
      setDistanceError('A data e hora da reserva não podem ser no passado.');
      return false;
    }

    return true;
  }, [formData, serviceType]);

  const handleCalculateAndContinue = async () => {
    if (!validateStep1()) {
      return;
    }

    setDistanceError('');
    setIsCalculatingDistance(true);

    let calculatedDistance = null;

    if (serviceType !== 'hourly') {
      try {
        console.log('[NovaReserva] Calculando distância via Google Maps API...', {
          origin: formData.origin,
          destination: formData.destination
        });
        
        if (!formData.origin || !formData.destination) {
          throw new Error('Origem e destino são obrigatórios');
        }

        const distanceResponse = await base44.functions.invoke('calculateDistance', {
          origin: formData.origin,
          destination: formData.destination
        });

        console.log('[NovaReserva] Resposta da API de distância:', distanceResponse.data);

        if (distanceResponse.data && distanceResponse.data.distance_km) {
          calculatedDistance = distanceResponse.data;
          console.log('[NovaReserva] Distância calculada:', calculatedDistance);
        } else {
          throw new Error('Resposta inválida da API de cálculo de distância');
        }
      } catch (error) {
        console.error('[NovaReserva] Erro ao calcular distância:', error);
        
        let errorMessage = 'Não foi possível calcular a rota entre origem e destino.';
        
        if (error.response?.status === 404) {
          errorMessage = 'Rota não encontrada. Verifique se os endereços estão corretos e tente novamente.';
        } else if (error.response?.data?.error) {
          errorMessage = error.response.data.error;
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        setDistanceError(errorMessage);
        setIsCalculatingDistance(false);
        return;
      }
    } else {
      console.log('[NovaReserva] Serviço por hora - sem cálculo de distância via Google Maps');
      calculatedDistance = null;
    }

    setDistanceData(calculatedDistance);
    setIsCalculatingDistance(false);

    const vehiclesWithoutPrices = vehicleTypes.map(v => ({
      ...v,
      calculated_price: null,
      calculation_details: null
    }));
    
    vehiclesWithoutPrices.sort((a, b) => a.display_order - b.display_order);
    setVehiclesWithPrices(vehiclesWithoutPrices);

    setStep(2);
    
    if (user) {
      await calculatePricesForAllVehicles(user, formData, calculatedDistance, serviceType, driverLanguage);
    }
  };

  const handleVehicleSelect = async (vehicle, language) => {
    setLeadTimeError('');

    if (vehicle === null) {
      console.log('[NovaReserva] Redirecionando para login via banner...');
      
      const stateToSave = {
        step: 2,
        serviceType,
        formData,
        distanceData,
        selectedVehicleId: null,
        driverLanguage: language || driverLanguage,
        isCustomHours,
        timestamp: Date.now()
      };
      localStorage.setItem(BOOKING_STATE_KEY, JSON.stringify(stateToSave));
      console.log('[NovaReserva] Estado salvo antes do login (via banner)');
      
      const currentUrl = window.location.pathname + '?from_booking=true';
      base44.auth.redirectToLogin(currentUrl);
      return;
    }

    const now = new Date();
    const bookingDateTime = new Date(`${formData.date}T${formData.time}`);
    
    if (isNaN(bookingDateTime.getTime())) {
      setLeadTimeError('Data ou hora da reserva inválida. Por favor, revise.');
      return;
    }

    const diffMs = bookingDateTime.getTime() - now.getTime();
    const diffHours = diffMs / (1000 * 60 * 60);
    
    const vehicleLeadTime = vehicle.min_booking_lead_time_hours || 0;
    
    if (diffHours < vehicleLeadTime) {
      setLeadTimeError(`Este veículo requer um mínimo de ${vehicleLeadTime} horas de antecedência. Por favor, volte e selecione uma data/hora posterior ou escolha outro veículo.`);
      return;
    }

    try {
      const currentUser = await base44.auth.me();
      setUser(currentUser);
      console.log('[NovaReserva] Usuário autenticado na seleção de veículo');
      
      setDriverLanguage(language);
      
      let currentVehiclesWithPrices = vehiclesWithPrices;
      if (!currentVehiclesWithPrices[0]?.calculated_price || driverLanguage !== language) {
        console.log('[NovaReserva] Recalculando preços...');
        currentVehiclesWithPrices = await calculatePricesForAllVehicles(currentUser, null, null, null, language);
      }
      
      const selectedVehicleWithPrice = currentVehiclesWithPrices.find(v => v.id === vehicle.id);
      setSelectedVehicle(selectedVehicleWithPrice || vehicle);
      console.log('[NovaReserva] Veículo selecionado:', selectedVehicleWithPrice?.name);
      
      if (currentUser) {
        setStep(3);
        saveBookingState(false);
      }
    } catch (error) {
      console.log('[NovaReserva] Usuário não autenticado, redirecionando para login...');
      setDriverLanguage(language);

      const stateToSave = {
        step: 2,
        serviceType,
        formData,
        distanceData,
        selectedVehicleId: vehicle?.id,
        driverLanguage: language,
        isCustomHours,
        timestamp: Date.now() 
      };
      localStorage.setItem(BOOKING_STATE_KEY, JSON.stringify(stateToSave));
      console.log('[NovaReserva] Estado salvo antes do login (veículo selecionado):', {
        vehicleId: vehicle?.id,
        vehicleName: vehicle?.name
      });
      
      const currentUrl = window.location.pathname + '?from_booking=true';
      base44.auth.redirectToLogin(currentUrl);
    }
  };

  const handlePaymentCompleted = useCallback((bookingId) => {
    setBookingNumber(bookingId);
    setPaymentCompleted(true);
    clearBookingState();
  }, [clearBookingState]);

  useEffect(() => {
    if (paymentCompleted) {
      const timer = setTimeout(handleNewBooking, 5000);
      return () => clearTimeout(timer);
    }
  }, [paymentCompleted, handleNewBooking]);

  const getSelectedHoursOption = useMemo(() => {
    if (isCustomHours) {
      return 'custom';
    }
    if (formData.hours === 5 || formData.hours === 10) {
      return String(formData.hours);
    }
    return 'custom';
  }, [formData.hours, isCustomHours]);

  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600 text-lg">Carregando reserva...</p>
        </div>
      </div>
    );
  }

  if (paymentCompleted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-emerald-50 to-green-100 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-10 text-center transform animate-scale-in">
          <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-xl">
            <CheckCircle className="w-14 h-14 text-white animate-bounce" />
          </div>
          <h2 className="text-4xl font-bold text-gray-900 mb-4">
            Pagamento Confirmado!
          </h2>
          <p className="text-gray-600 text-lg mb-8 leading-relaxed">
            Sua reserva foi confirmada e o pagamento processado com sucesso.
            {bookingNumber && (
              <>
                <br />
                <span className="font-bold text-2xl text-green-600 block mt-3">
                  #{bookingNumber}
                </span>
              </>
            )}
            <br />
            <span className="text-sm">Você receberá um e-mail com todos os detalhes.</span>
          </p>
          <p className="text-sm text-gray-500 mb-6">
            Redirecionando em alguns segundos...
          </p>
          <Button
            onClick={handleNewBooking}
            className="bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white w-full py-7 text-lg font-bold rounded-2xl shadow-xl transform transition-all duration-300 hover:scale-105"
          >
            Fazer Nova Reserva
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-blue-50 p-4 md:p-6">
      <div className="max-w-6xl mx-auto">
        {step !== 3 && (
          <div className="text-center mb-10 md:mb-14">
            <div className="inline-flex items-center gap-2 bg-gradient-to-r from-blue-600 to-purple-600 text-white px-4 py-2 rounded-full text-sm font-semibold mb-4 shadow-lg">
              <Sparkles className="w-4 h-4" />
              Reserve seu Transfer
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-4 leading-tight">
              <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
                {user ? `Bem-vindo(a), ${user.full_name}` : 'Bem-vindo(a), Convidado'}
              </span>
            </h1>
            <p className="text-xl md:text-2xl text-gray-600 font-medium">
              Rápido, seguro e confortável
            </p>
          </div>
        )}

        {step !== 3 && (
          <div className="max-w-3xl mx-auto mb-10 md:mb-14">
            <div className="flex items-center justify-center gap-3 md:gap-6">
              <div className="flex items-center gap-2 md:gap-3">
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-bold text-base md:text-lg transition-all duration-300 ${
                  step >= 1 ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg scale-110' : 'bg-gray-200 text-gray-500'
                }`}>
                  {step > 1 ? <CheckCircle className="w-6 h-6" /> : '1'}
                </div>
                <span className="font-semibold text-sm md:text-base hidden sm:inline">Detalhes</span>
              </div>
              <div className={`h-1.5 w-16 md:w-24 rounded-full transition-all duration-500 ${step >= 2 ? 'bg-gradient-to-r from-blue-600 to-purple-600' : 'bg-gray-200'}`} />
              <div className="flex items-center gap-2 md:gap-3">
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-bold text-base md:text-lg transition-all duration-300 ${
                  step >= 2 ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg scale-110' : 'bg-gray-200 text-gray-500'
                }`}>
                  {step > 2 ? <CheckCircle className="w-6 h-6" /> : '2'}
                </div>
                <span className="font-semibold text-sm md:text-base hidden sm:inline">Veículo</span>
              </div>
              <div className={`h-1.5 w-16 md:w-24 rounded-full transition-all duration-500 ${step >= 3 ? 'bg-gradient-to-r from-blue-600 to-purple-600' : 'bg-gray-200'}`} />
              <div className="flex items-center gap-2 md:gap-3">
                <div className={`w-10 h-10 md:w-12 md:h-12 rounded-full flex items-center justify-center font-bold text-base md:text-lg transition-all duration-300 ${
                  step >= 3 ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white shadow-lg scale-110' : 'bg-gray-200 text-gray-500'
                }`}>
                  3
                </div>
                <span className="font-semibold text-sm md:text-base hidden sm:inline">Pagamento</span>
              </div>
            </div>
          </div>
        )}

        {step === 1 && (
          <div className="max-w-4xl mx-auto">
            <div className="bg-white rounded-3xl shadow-2xl p-6 md:p-10">
              <Tabs value={serviceType} onValueChange={setServiceType} className="w-full">
                <TabsList className="grid w-full grid-cols-3 mb-8 md:mb-10 bg-gray-100 p-1.5 rounded-2xl">
                  <TabsTrigger value="one_way" className="text-sm md:text-base font-semibold rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md transition-all duration-300">
                    Só Ida
                  </TabsTrigger>
                  <TabsTrigger value="round_trip" className="text-sm md:text-base font-semibold rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md transition-all duration-300">
                    Ida e Volta
                  </TabsTrigger>
                  <TabsTrigger value="hourly" className="text-sm md:text-base font-semibold rounded-xl data-[state=active]:bg-white data-[state=active]:shadow-md transition-all duration-300">
                    Por Hora
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="one_way" className="space-y-6 md:space-y-8">
                  <div className="space-y-3">
                    <Label htmlFor="origin" className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      De onde você sai? <span className="text-red-500">*</span>
                    </Label>
                    <LocationAutocomplete
                      id="origin"
                      required
                      value={formData.origin}
                      onChange={(value) => setFormData({...formData, origin: value})}
                      placeholder="Digite o endereço de origem ou escolha um local"
                      className="text-lg h-14 rounded-2xl border-2 border-gray-200 focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="destination" className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      Para onde você vai? <span className="text-red-500">*</span>
                    </Label>
                    <LocationAutocomplete
                      id="destination"
                      required
                      value={formData.destination}
                      onChange={(value) => setFormData({...formData, destination: value})}
                      placeholder="Digite o endereço de destino ou escolha um local"
                      className="text-lg h-14 rounded-2xl border-2 border-gray-200 focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    <div className="space-y-3">
                      <Label htmlFor="date" className="flex items-center gap-2 text-lg font-bold text-gray-900">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        Data do Transfer <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="date"
                        type="date"
                        required
                        min={minDateBasedOnLeadTime}
                        value={formData.date}
                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                        className="w-full text-lg h-14 rounded-2xl border-2 border-gray-200 focus:border-blue-500 transition-colors"
                      />
                      <p className="text-xs text-gray-500">
                        Alguns veículos exigem mais antecedência. Verifique no próximo passo.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="time" className="flex items-center gap-2 text-lg font-bold text-gray-900">
                        <Clock className="w-5 h-5 text-blue-600" />
                        Horário <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="time"
                        type="time"
                        required
                        value={formData.time}
                        onChange={(e) => setFormData({...formData, time: e.target.value})}
                        className="w-full text-lg h-14 rounded-2xl border-2 border-gray-200 focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="round_trip" className="space-y-6 md:space-y-8">
                  <div className="space-y-3">
                    <Label htmlFor="origin-rt" className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      De onde você sai? <span className="text-red-500">*</span>
                    </Label>
                    <LocationAutocomplete
                      id="origin-rt"
                      required
                      value={formData.origin}
                      onChange={(value) => setFormData({...formData, origin: value})}
                      placeholder="Digite o endereço de origem ou escolha um local"
                      className="text-lg h-14 rounded-2xl border-2 border-gray-200 focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="destination-rt" className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      Para onde você vai? <span className="text-red-500">*</span>
                    </Label>
                    <LocationAutocomplete
                      id="destination-rt"
                      required
                      value={formData.destination}
                      onChange={(value) => setFormData({...formData, destination: value})}
                      placeholder="Digite o endereço de destino ou escolha um local"
                      className="text-lg h-14 rounded-2xl border-2 border-gray-200 focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div className="bg-blue-50 p-6 md:p-8 rounded-2xl border-2 border-blue-200/50">
                    <h3 className="font-bold text-xl mb-4 text-blue-900">Ida</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label htmlFor="date-rt" className="flex items-center gap-2 text-lg font-bold text-gray-900">
                          <Calendar className="w-5 h-5 text-blue-600" />
                          Data da Ida <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="date-rt"
                          type="date"
                          required
                          min={minDateBasedOnLeadTime}
                          value={formData.date}
                          onChange={(e) => setFormData({...formData, date: e.target.value})}
                          className="w-full text-lg h-14 rounded-2xl border-2 border-gray-200 focus:border-blue-500 transition-colors"
                        />
                        <p className="text-xs text-gray-500">
                          Alguns veículos exigem mais antecedência. Verifique no próximo passo.
                        </p>
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="time-rt" className="flex items-center gap-2 text-lg font-bold text-gray-900">
                          <Clock className="w-5 h-5 text-blue-600" />
                          Horário da Ida <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="time-rt"
                          type="time"
                          required
                          value={formData.time}
                          onChange={(e) => setFormData({...formData, time: e.target.value})}
                          className="w-full text-lg h-14 rounded-2xl border-2 border-gray-200 focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-green-50 p-6 md:p-8 rounded-2xl border-2 border-green-200/50">
                    <h3 className="font-bold text-xl mb-4 text-green-900">Volta</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <Label htmlFor="return-date" className="flex items-center gap-2 text-lg font-bold text-gray-900">
                          <Calendar className="w-5 h-5 text-green-600" />
                          Data da Volta <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="return-date"
                          type="date"
                          required
                          min={formData.date ? formData.date : minDateBasedOnLeadTime}
                          value={formData.return_date}
                          onChange={(e) => setFormData({...formData, return_date: e.target.value})}
                          className="w-full text-lg h-14 rounded-2xl border-2 border-gray-200 focus:border-blue-500 transition-colors"
                        />
                      </div>

                      <div className="space-y-3">
                        <Label htmlFor="return-time" className="flex items-center gap-2 text-lg font-bold text-gray-900">
                          <Clock className="w-5 h-5 text-green-600" />
                          Horário da Volta <span className="text-red-500">*</span>
                        </Label>
                        <Input
                          id="return-time"
                          type="time"
                          required
                          value={formData.return_time}
                          onChange={(e) => setFormData({...formData, return_time: e.target.value})}
                          className="w-full text-lg h-14 rounded-2xl border-2 border-gray-200 focus:border-blue-500 transition-colors"
                        />
                      </div>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="hourly" className="space-y-6 md:space-y-8">
                  <div className="space-y-3">
                    <Label htmlFor="hours-select" className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      Pacote de Horas <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={getSelectedHoursOption}
                      onValueChange={(value) => {
                        if (value === 'custom') {
                          setIsCustomHours(true);
                          setFormData(prev => ({ ...prev, hours: '' }));
                        } else {
                          setIsCustomHours(false);
                          setFormData(prev => ({ ...prev, hours: parseInt(value) }));
                        }
                      }}
                    >
                      <SelectTrigger id="hours-select" className="w-full text-lg h-14 rounded-2xl border-2 border-gray-200 focus:border-blue-500 transition-colors">
                        <SelectValue placeholder="Selecione um pacote de horas" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="5">5 Horas</SelectItem>
                        <SelectItem value="10">10 Horas</SelectItem>
                        <SelectItem value="custom">Outras (mín. 5h)</SelectItem>
                      </SelectContent>
                    </Select>
                    
                    {isCustomHours && (
                      <>
                        <Label htmlFor="hours" className="sr-only">Quantidade de Horas</Label>
                        <Input
                          id="hours"
                          type="number"
                          min="5"
                          required
                          value={formData.hours}
                          onChange={(e) => {
                            const value = e.target.value;
                            setFormData(prev => ({ 
                              ...prev, 
                              hours: value === '' ? '' : parseInt(value) || ''
                            }));
                          }}
                          placeholder="Digite a quantidade de horas (mín. 5)"
                          className="text-lg h-14 rounded-2xl border-2 border-gray-200 focus:border-blue-500 transition-colors mt-3"
                        />
                        <p className="text-base text-gray-500 mt-2">Mínimo: 5 horas</p>
                      </>
                    )}
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="origin-hourly" className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      Ponto de Partida <span className="text-red-500">*</span>
                    </Label>
                    <LocationAutocomplete
                      id="origin-hourly"
                      required
                      value={formData.origin}
                      onChange={(value) => setFormData({...formData, origin: value})}
                      placeholder="Digite o endereço inicial ou escolha um local"
                      className="text-lg h-14 rounded-2xl border-2 border-gray-200 focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div className="space-y-3">
                    <Label htmlFor="destination-hourly" className="text-lg font-bold text-gray-900 flex items-center gap-2">
                      Primeiro Destino
                    </Label>
                    <LocationAutocomplete
                      id="destination-hourly"
                      value={formData.destination}
                      onChange={(value) => setFormData({...formData, destination: value})}
                      placeholder="Digite o primeiro destino (opcional) ou escolha um local"
                      className="text-lg h-14 rounded-2xl border-2 border-gray-200 focus:border-blue-500 transition-colors"
                    />
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 md:gap-8">
                    <div className="space-y-3">
                      <Label htmlFor="date-hourly" className="flex items-center gap-2 text-lg font-bold text-gray-900">
                        <Calendar className="w-5 h-5 text-blue-600" />
                        Data <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="date-hourly"
                        type="date"
                        required
                        min={minDateBasedOnLeadTime}
                        value={formData.date}
                        onChange={(e) => setFormData({...formData, date: e.target.value})}
                        className="w-full text-lg h-14 rounded-2xl border-2 border-gray-200 focus:border-blue-500 transition-colors"
                      />
                      <p className="text-xs text-gray-500">
                        Alguns veículos exigem mais antecedência. Verifique no próximo passo.
                      </p>
                    </div>

                    <div className="space-y-3">
                      <Label htmlFor="time-hourly" className="flex items-center gap-2 text-lg font-bold text-gray-900">
                        <Clock className="w-5 h-5 text-blue-600" />
                        Horário de Início <span className="text-red-500">*</span>
                      </Label>
                      <Input
                        id="time-hourly"
                        type="time"
                        required
                        value={formData.time}
                        onChange={(e) => setFormData({...formData, time: e.target.value})}
                        className="w-full text-lg h-14 rounded-2xl border-2 border-gray-200 focus:border-blue-500 transition-colors"
                      />
                    </div>
                  </div>
                </TabsContent>
              </Tabs>

              {distanceError && (
                <Alert variant="destructive" className="mt-6 rounded-2xl border-2">
                  <AlertCircle className="h-5 w-5" />
                  <AlertDescription className="text-base font-medium">{distanceError}</AlertDescription>
                </Alert>
              )}

              <Button
                onClick={handleCalculateAndContinue}
                disabled={isCalculatingDistance}
                className="w-full h-16 md:h-18 text-xl font-bold bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white mt-8 md:mt-10 rounded-2xl shadow-2xl transform transition-all duration-300 hover:scale-105"
              >
                {isCalculatingDistance ? (
                  <>
                    <Loader2 className="w-6 h-6 mr-3 animate-spin" />
                    {serviceType !== 'hourly' ? 'Calculando rota...' : 'Processando...'}
                  </>
                ) : (
                  <>
                    Ver Opções de Veículos
                    <ArrowRight className="w-6 h-6 ml-3" />
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="max-w-7xl mx-auto">
            <div className="mb-6">
              <Button
                variant="ghost"
                onClick={() => setStep(1)}
                className="mb-4"
              >
                ← Voltar aos Detalhes da Viagem
              </Button>
            </div>

            {leadTimeError && (
              <Alert variant="destructive" className="mb-6 rounded-2xl border-2">
                <AlertCircle className="h-5 w-5" />
                <AlertDescription className="text-base font-medium">{leadTimeError}</AlertDescription>
              </Alert>
            )}

            <VehicleSelection
              vehicles={vehiclesWithPrices}
              selectedVehicleId={selectedVehicle?.id}
              onSelectVehicle={handleVehicleSelect}
              onDriverLanguageChange={handleDriverLanguageChange}
              onRequestQuote={handleRequestQuote}
              isCalculating={isCalculatingPrices}
              isLoggedIn={!!user}
              selectedDriverLanguage={driverLanguage}
              bookingDateTime={formData.date && formData.time ? new Date(`${formData.date}T${formData.time}`) : null}
            />
          </div>
        )}

        {step === 3 && selectedVehicle && user && (
          <div className="max-w-3xl mx-auto">
            <Button
              variant="ghost"
              onClick={() => setStep(2)}
              className="mb-6"
            >
              ← Voltar à Seleção de Veículo
            </Button>

            <BookingForm
              serviceType={serviceType}
              tripDetails={formData}
              distanceData={distanceData}
              selectedVehicle={selectedVehicle}
              driverLanguage={driverLanguage}
              onPaymentCompleted={handlePaymentCompleted}
            />
          </div>
        )}
      </div>
    </div>
  );
}