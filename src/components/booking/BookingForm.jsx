import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Checkbox } from '@/components/ui/checkbox';
import { User, Mail, Phone, MessageSquare, CreditCard, AlertCircle, Loader2, Users } from 'lucide-react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { base44 } from '@/api/base44Client';

const stripePromise = loadStripe('pk_live_vnilaYyEGuW1pAryMjdWgJoD');

function PaymentForm({ bookingId, onSuccess, onError, totalPrice }) {
  const stripe = useStripe();
  const elements = useElements();
  const [isProcessing, setIsProcessing] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!stripe || !elements) {
      return;
    }

    setIsProcessing(true);
    setErrorMessage('');

    try {
      const { error, paymentIntent } = await stripe.confirmPayment({
        elements,
        redirect: 'if_required',
      });

      if (error) {
        setErrorMessage(error.message);
        setIsProcessing(false);
        onError(error.message);
      } else if (paymentIntent && paymentIntent.status === 'succeeded') {
        await base44.entities.Booking.update(bookingId, {
          payment_status: 'pago',
          status: 'confirmada',
          payment_intent_id: paymentIntent.id
        });
        setIsProcessing(false);
        onSuccess();
      }
    } catch (err) {
      console.error("Erro ao confirmar pagamento:", err);
      setErrorMessage('Erro ao processar pagamento. Tente novamente.');
      setIsProcessing(false);
      onError(err.message);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="bg-blue-50 p-4 rounded-lg mb-4">
        <div className="flex justify-between items-center">
          <span className="font-semibold text-gray-900">Total a Pagar:</span>
          <span className="text-2xl font-bold text-blue-600">
            {new Intl.NumberFormat('pt-BR', {
              style: 'currency',
              currency: 'BRL'
            }).format(totalPrice)}
          </span>
        </div>
      </div>

      <PaymentElement />

      {errorMessage && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{errorMessage}</AlertDescription>
        </Alert>
      )}

      <Button
        type="submit"
        disabled={!stripe || isProcessing}
        className="w-full bg-green-600 hover:bg-green-700 py-6 text-lg"
      >
        {isProcessing ? (
          <>
            <Loader2 className="w-5 h-5 mr-2 animate-spin" />
            Processando Pagamento...
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5 mr-2" />
            Confirmar Pagamento
          </>
        )}
      </Button>
    </form>
  );
}

export default function BookingForm({ 
  serviceType, 
  tripDetails, 
  distanceData, 
  selectedVehicle, 
  driverLanguage = 'pt',
  onPaymentCompleted 
}) {
  const [isBookingForOther, setIsBookingForOther] = useState(false);
  const [loggedUserData, setLoggedUserData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: ''
  });

  const [formData, setFormData] = useState({
    customer_name: '',
    customer_email: '',
    customer_phone: '',
    passengers: 1,
    notes: ''
  });

  const [user, setUser] = useState(null);

  const [showPayment, setShowPayment] = useState(false);
  const [clientSecret, setClientSecret] = useState('');
  const [currentBookingId, setCurrentBookingId] = useState(null);
  const [currentBookingNumber, setCurrentBookingNumber] = useState(null);
  const [isCreatingBooking, setIsCreatingBooking] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  // Preencher dados do usuário autenticado
  useEffect(() => {
    const loadUserData = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
        
        const userData = {
          customer_name: currentUser.full_name || '',
          customer_email: currentUser.email || '',
          customer_phone: ''
        };
        
        setLoggedUserData(userData);
        setFormData(prev => ({
          ...prev,
          ...userData
        }));
      } catch (error) {
        console.log('[BookingForm] Usuário não autenticado ou erro ao carregar dados:', error);
      }
    };

    loadUserData();
  }, []);

  // Atualizar campos quando o checkbox muda
  const handleBookingForOtherChange = (checked) => {
    setIsBookingForOther(checked);
    
    if (checked) {
      // Limpar campos para outra pessoa
      setFormData(prev => ({
        ...prev,
        customer_name: '',
        customer_email: '',
        customer_phone: ''
      }));
    } else {
      // Restaurar dados do usuário logado
      setFormData(prev => ({
        ...prev,
        ...loggedUserData
      }));
    }
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (formData.passengers < 1) {
      setErrorMessage('Informe pelo menos 1 passageiro');
      return;
    }

    if (formData.passengers > selectedVehicle.max_passengers) {
      setErrorMessage(`Este veículo suporta no máximo ${selectedVehicle.max_passengers} passageiros`);
      return;
    }

    setIsCreatingBooking(true);
    setErrorMessage('');

    try {
      // 1. Gerar número da reserva
      const bookingNumberResponse = await base44.functions.invoke('generateBookingNumber');
      const bookingNumber = bookingNumberResponse.data.bookingNumber;

      // 2. Preparar dados da reserva
      const bookingData = {
        booking_number: bookingNumber,
        service_type: serviceType,
        vehicle_type_id: selectedVehicle.id,
        vehicle_type_name: selectedVehicle.name,
        driver_language: driverLanguage,
        origin: tripDetails.origin,
        destination: tripDetails.destination || tripDetails.origin,
        date: tripDetails.date,
        time: tripDetails.time,
        distance_km: parseFloat(distanceData?.distance_km || 0),
        duration_minutes: parseInt(distanceData?.duration_minutes || 0),
        passengers: formData.passengers,
        customer_name: formData.customer_name,
        customer_email: formData.customer_email,
        customer_phone: formData.customer_phone,
        is_booking_for_other: isBookingForOther,
        notes: formData.notes,
        total_price: selectedVehicle.calculated_price,
        payment_status: 'aguardando',
        status: 'pendente'
      };

      // Adicionar dados específicos do tipo de serviço
      if (serviceType === 'round_trip') {
        bookingData.return_date = tripDetails.return_date;
        bookingData.return_time = tripDetails.return_time;
      } else if (serviceType === 'hourly') {
        bookingData.hours = tripDetails.hours;
      }

      // 3. Criar reserva
      const booking = await base44.entities.Booking.create(bookingData);
      setCurrentBookingId(booking.id);
      setCurrentBookingNumber(booking.booking_number);

      // 4. Criar PaymentIntent
      const response = await base44.functions.invoke('createPaymentIntent', {
        amount: selectedVehicle.calculated_price,
        currency: 'brl',
        metadata: {
          booking_id: booking.id,
          booking_number: booking.booking_number,
          customer_email: formData.customer_email,
          customer_name: formData.customer_name,
          service_type: serviceType
        }
      });

      if (response.data.clientSecret) {
        setClientSecret(response.data.clientSecret);
        setShowPayment(true);
      } else {
        throw new Error('Erro ao iniciar pagamento. Resposta do servidor incompleta.');
      }
    } catch (error) {
      console.error('Erro ao criar reserva:', error);
      setErrorMessage(error.response?.data?.error || error.message || 'Erro ao processar reserva. Tente novamente.');
    } finally {
      setIsCreatingBooking(false);
    }
  };

  const handlePaymentSuccess = async () => {
    try {
      // Enviar e-mail de confirmação para o cliente
      await base44.functions.invoke('sendBookingEmail', {
        bookingId: currentBookingId,
        recipientType: 'customer',
        emailType: 'confirmation'
      });

      // Enviar notificação para o administrador
      await base44.functions.invoke('sendBookingEmail', {
        bookingId: currentBookingId,
        recipientType: 'admin',
        emailType: 'new_booking_notification'
      });
    } catch (emailError) {
      console.error('Erro ao enviar e-mails:', emailError);
    }

    if (onPaymentCompleted) {
      onPaymentCompleted(currentBookingNumber);
    }
  };

  const handlePaymentError = (error) => {
    console.error('Erro no pagamento:', error);
    setErrorMessage(error);
  };

  if (showPayment && clientSecret) {
    return (
      <Card className="shadow-xl">
        <CardHeader className="bg-gradient-to-r from-green-600 to-green-700 text-white p-6">
          <CardTitle className="text-2xl">Pagamento</CardTitle>
          <div className="text-green-100 text-sm">
            Reserva {currentBookingNumber} - Finalize o pagamento para confirmar
          </div>
        </CardHeader>
        <CardContent className="p-6">
          <Elements
            stripe={stripePromise}
            options={{
              clientSecret,
              appearance: {
                theme: 'stripe',
                variables: {
                  colorPrimary: '#2563eb',
                }
              },
              locale: 'pt-BR'
            }}
          >
            <PaymentForm
              bookingId={currentBookingId}
              onSuccess={handlePaymentSuccess}
              onError={handlePaymentError}
              totalPrice={selectedVehicle.calculated_price}
            />
          </Elements>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-xl overflow-hidden">
      <CardHeader className="bg-gradient-to-r from-blue-600 to-blue-700 text-white p-6">
        <CardTitle className="text-2xl">Dados da Reserva</CardTitle>
        <div className="text-blue-100 text-sm">
          {tripDetails.origin} → {tripDetails.destination || tripDetails.origin}
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {errorMessage && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{errorMessage}</AlertDescription>
          </Alert>
        )}

        {/* Resumo da Viagem */}
        <div className="bg-blue-50 p-4 rounded-lg mb-6 space-y-2">
          <h3 className="font-semibold text-gray-900 mb-3">Resumo da Viagem</h3>
          <div className="grid md:grid-cols-2 gap-3 text-sm">
            <div>
              <span className="text-gray-600">Tipo:</span>
              <span className="ml-2 font-medium">
                {serviceType === 'one_way' ? 'Só Ida' : serviceType === 'round_trip' ? 'Ida e Volta' : 'Por Hora'}
              </span>
            </div>
            <div>
              <span className="text-gray-600">Veículo:</span>
              <span className="ml-2 font-medium">{selectedVehicle.name}</span>
            </div>
            <div>
              <span className="text-gray-600">Idioma do Motorista:</span>
              <span className="ml-2 font-medium">
                {driverLanguage === 'pt' ? 'Português' : driverLanguage === 'en' ? 'English' : 'Español'}
              </span>
            </div>
            {serviceType === 'hourly' && (
              <div>
                <span className="text-gray-600">Horas:</span>
                <span className="ml-2 font-medium">{tripDetails.hours}h</span>
              </div>
            )}
            <div>
              <span className="text-gray-600">Data:</span>
              <span className="ml-2 font-medium">{new Date(tripDetails.date).toLocaleDateString('pt-BR')}</span>
            </div>
            <div>
              <span className="text-gray-600">Horário:</span>
              <span className="ml-2 font-medium">{tripDetails.time}</span>
            </div>
            {serviceType === 'round_trip' && (
              <>
                <div>
                  <span className="text-gray-600">Data Retorno:</span>
                  <span className="ml-2 font-medium">{new Date(tripDetails.return_date).toLocaleDateString('pt-BR')}</span>
                </div>
                <div>
                  <span className="text-gray-600">Horário Retorno:</span>
                  <span className="ml-2 font-medium">{tripDetails.return_time}</span>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Formulário de Dados do Passageiro */}
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="border-t pt-6">
            <h3 className="font-semibold text-lg mb-4 text-gray-900">Dados do Passageiro</h3>
            
            {/* Checkbox "Reservando para outra pessoa" */}
            <div className="flex items-center space-x-3 mb-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <Checkbox
                id="booking_for_other"
                checked={isBookingForOther}
                onCheckedChange={handleBookingForOtherChange}
              />
              <Label
                htmlFor="booking_for_other"
                className="flex items-center gap-2 text-base font-medium text-gray-900 cursor-pointer"
              >
                <Users className="w-5 h-5 text-yellow-600" />
                Estou reservando para outra pessoa
              </Label>
            </div>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="customer_name" className="flex items-center gap-2 text-base font-medium text-gray-900">
                  <User className="w-5 h-5 text-blue-600" />
                  Nome Completo {isBookingForOther && 'do Passageiro'} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="customer_name"
                  required
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  placeholder={isBookingForOther ? "Nome completo do passageiro" : "Seu nome completo"}
                  className="w-full px-3 py-3 text-base"
                  disabled={!isBookingForOther && !!loggedUserData.customer_name}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer_email" className="flex items-center gap-2 text-base font-medium text-gray-900">
                  <Mail className="w-5 h-5 text-blue-600" />
                  Email {isBookingForOther && 'do Passageiro'} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="customer_email"
                  type="email"
                  required
                  value={formData.customer_email}
                  onChange={(e) => setFormData({ ...formData, customer_email: e.target.value })}
                  placeholder={isBookingForOther ? "email@passageiro.com" : "seu@email.com"}
                  className="w-full px-3 py-3 text-base"
                  disabled={!isBookingForOther && !!loggedUserData.customer_email}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="customer_phone" className="flex items-center gap-2 text-base font-medium text-gray-900">
                  <Phone className="w-5 h-5 text-blue-600" />
                  Telefone {isBookingForOther && 'do Passageiro'} <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="customer_phone"
                  type="tel"
                  required
                  value={formData.customer_phone}
                  onChange={(e) => setFormData({ ...formData, customer_phone: e.target.value })}
                  placeholder="(00) 00000-0000"
                  className="w-full px-3 py-3 text-base"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="passengers" className="text-base font-medium text-gray-900">
                  Número de Passageiros <span className="text-red-500">*</span>
                </Label>
                <Input
                  id="passengers"
                  type="number"
                  min="1"
                  max={selectedVehicle.max_passengers}
                  required
                  value={formData.passengers}
                  onChange={(e) => setFormData({ ...formData, passengers: parseInt(e.target.value) })}
                  className="w-full px-3 py-3 text-base"
                />
                <p className="text-sm text-gray-500">
                  Máximo: {selectedVehicle.max_passengers} passageiros
                </p>
              </div>

              <div className="space-y-2">
                <Label htmlFor="notes" className="flex items-center gap-2 text-base font-medium text-gray-900">
                  <MessageSquare className="w-5 h-5 text-blue-600" />
                  Observações (opcional)
                </Label>
                <Textarea
                  id="notes"
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  placeholder="Informações adicionais sobre a viagem..."
                  className="w-full min-h-[100px] px-3 py-2 text-base resize-none"
                />
              </div>
            </div>
          </div>

          {/* Total */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex justify-between items-center">
              <span className="text-lg font-semibold text-gray-900">Valor Total:</span>
              <span className="text-3xl font-bold text-blue-600">
                {formatPrice(selectedVehicle.calculated_price)}
              </span>
            </div>
          </div>

          <Button
            type="submit"
            disabled={isCreatingBooking}
            className="w-full bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 text-white h-14 text-lg font-semibold shadow-lg"
          >
            {isCreatingBooking ? (
              <>
                <Loader2 className="w-5 h-5 mr-2 animate-spin" />
                Processando...
              </>
            ) : (
              <>
                <CreditCard className="w-5 h-5 mr-2" />
                Prosseguir para Pagamento
              </>
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}