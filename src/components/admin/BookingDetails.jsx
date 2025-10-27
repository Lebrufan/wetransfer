
import React from 'react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { MapPin, Calendar, Clock, Users, Phone, Mail, MessageSquare, PlaneIcon, ArrowLeftRight, Percent, CreditCard, AlertCircle, Loader2 } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { useMutation, useQueryClient } from '@tanstack/react-query';

export default function BookingDetails({ booking, open, onClose }) {
  const [isRefunding, setIsRefunding] = React.useState(false);
  const [refundReason, setRefundReason] = React.useState('');
  const [showRefundDialog, setShowRefundDialog] = React.useState(false);
  const [refundError, setRefundError] = React.useState('');
  const [refundSuccess, setRefundSuccess] = React.useState(false);

  // Novo estado para reenvio de link
  const [isResendingLink, setIsResendingLink] = React.useState(false);
  const [resendLinkError, setResendLinkError] = React.useState('');
  const [resendLinkSuccess, setResendLinkSuccess] = React.useState(false);

  const queryClient = useQueryClient();

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.Booking.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    }
  });

  const updatePaymentMutation = useMutation({
    mutationFn: ({ id, payment_status }) => base44.entities.Booking.update(id, { payment_status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['bookings'] });
    }
  });

  const handleRefund = async () => {
    if (!refundReason.trim()) {
      setRefundError('Por favor, informe o motivo do cancelamento');
      return;
    }

    setIsRefunding(true);
    setRefundError('');
    setRefundSuccess(false);

    try {
      const response = await base44.functions.invoke('refundPayment', {
        bookingId: booking.id,
        refundReason: refundReason
      });

      if (response.data.success) {
        setRefundSuccess(true);
        setShowRefundDialog(false);
        setRefundReason('');
        queryClient.invalidateQueries({ queryKey: ['bookings'] });

        // Fechar o diálogo de sucesso após 3 segundos
        setTimeout(() => {
          setRefundSuccess(false);
        }, 3000);
      } else {
        setRefundError(response.data.error || 'Erro ao processar reembolso');
      }
    } catch (error) {
      console.error('Erro ao processar reembolso:', error);
      setRefundError(error.response?.data?.error || error.message || 'Erro ao processar reembolso');
    } finally {
      setIsRefunding(false);
    }
  };

  const handleResendPaymentLink = async () => {
    setIsResendingLink(true);
    setResendLinkError('');
    setResendLinkSuccess(false);

    try {
      const response = await base44.functions.invoke('resendPaymentLink', {
        bookingId: booking.id
      });

      if (response.data.success) {
        setResendLinkSuccess(true);
        queryClient.invalidateQueries({ queryKey: ['bookings'] });

        setTimeout(() => {
          setResendLinkSuccess(false);
        }, 5000);
      } else {
        setResendLinkError(response.data.error || 'Erro ao reenviar link de pagamento');
      }
    } catch (error) {
      console.error('Erro ao reenviar link:', error);
      setResendLinkError(error.response?.data?.error || error.message || 'Erro ao reenviar link de pagamento');
    } finally {
      setIsResendingLink(false);
    }
  };

  if (!booking) return null;

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const formatItemPrice = (item) => {
    // Se o item tem adjustment_type e adjustment_value, calcular o preço
    if (item.adjustment_type === 'percentage') {
      // Para itens selecionados na reserva, o preço já está calculado em item.price
      // então só precisamos formatar
      return formatPrice(item.price);
    }
    // Para valores fixos ou quando price já está calculado
    return formatPrice(item.price);
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-2xl flex items-center gap-3">
            Detalhes da Reserva
            {booking.booking_number && (
              <Badge className="bg-blue-600 text-white text-lg px-3 py-1">
                {booking.booking_number}
              </Badge>
            )}
            {booking.has_return && (
              <Badge className="bg-purple-600 text-white text-lg px-3 py-1">
                Ida e Volta
              </Badge>
            )}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Mensagem de Sucesso de Reembolso */}
          {refundSuccess && (
            <Alert className="bg-green-50 border-green-200">
              <AlertCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Reembolso processado com sucesso! O cliente receberá um e-mail de confirmação.
              </AlertDescription>
            </Alert>
          )}

          {/* Mensagem de Sucesso de Reenvio de Link */}
          {resendLinkSuccess && (
            <Alert className="bg-green-50 border-green-200">
              <AlertCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">
                Link de pagamento reenviado com sucesso! O cliente receberá um e-mail com o link.
              </AlertDescription>
            </Alert>
          )}

          {/* Mensagem de Erro de Reenvio de Link */}
          {resendLinkError && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{resendLinkError}</AlertDescription>
            </Alert>
          )}

          {/* Rota IDA */}
          <div className="bg-blue-50 p-4 rounded-lg">
            <div className="flex items-center gap-2 mb-2">
              <MapPin className="w-5 h-5 text-blue-600" />
              <span className="font-semibold text-gray-900">Rota de Ida</span>
              {booking.transfer_type && (
                <Badge className="ml-2 bg-purple-100 text-purple-800">
                  {booking.transfer_type === 'arrival' ? 'Chegada' : 'Saída'}
                </Badge>
              )}
            </div>
            <div className="ml-7 text-lg">
              <span className="font-semibold">{booking.origin}</span>
              <span className="mx-2 text-gray-500">→</span>
              <span className="font-semibold">{booking.destination}</span>
            </div>
          </div>

          {/* Rota RETORNO */}
          {booking.has_return && (
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <ArrowLeftRight className="w-5 h-5 text-green-600" />
                <span className="font-semibold text-gray-900">Rota de Retorno</span>
                {booking.return_transfer_type && (
                  <Badge className="ml-2 bg-purple-100 text-purple-800">
                    {booking.return_transfer_type === 'arrival' ? 'Chegada' : 'Saída'}
                  </Badge>
                )}
              </div>
              <div className="ml-7 text-lg">
                <span className="font-semibold">{booking.return_origin}</span>
                <span className="mx-2 text-gray-500">→</span>
                <span className="font-semibold">{booking.return_destination}</span>
              </div>
            </div>
          )}

          {/* Endereço do Cliente */}
          {booking.customer_address && (
            <div className="bg-orange-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <MapPin className="w-5 h-5 text-orange-600" />
                <span className="font-semibold text-gray-900">
                  {booking.transfer_type === 'arrival' ? 'Endereço de Destino' : 'Endereço de Origem'}
                </span>
              </div>
              <p className="ml-7 text-gray-700">{booking.customer_address}</p>
            </div>
          )}

          {/* Data e Hora - IDA */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Calendar className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-sm text-gray-500">Data (Ida)</div>
                <div className="font-semibold">
                  {format(new Date(booking.date), "dd/MM/yyyy", { locale: ptBR })}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Clock className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-sm text-gray-500">Horário (Ida)</div>
                <div className="font-semibold">{booking.time}</div>
              </div>
            </div>
          </div>

          {/* Data e Hora - RETORNO */}
          {booking.has_return && (
            <div className="grid md:grid-cols-2 gap-4 bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <Calendar className="w-5 h-5 text-green-600" />
                <div>
                  <div className="text-sm text-gray-500">Data (Retorno)</div>
                  <div className="font-semibold">
                    {format(new Date(booking.return_date), "dd/MM/yyyy", { locale: ptBR })}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Clock className="w-5 h-5 text-green-600" />
                <div>
                  <div className="text-sm text-gray-500">Horário (Retorno)</div>
                  <div className="font-semibold">{booking.return_time}</div>
                </div>
              </div>
            </div>
          )}

          {/* Número do Voo IDA */}
          {booking.transfer_type === 'arrival' && booking.flight_number && (
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <PlaneIcon className="w-5 h-5 text-blue-600" />
                <div>
                  <div className="text-sm text-gray-500">Número do Voo (Ida)</div>
                  <div className="font-semibold text-lg">{booking.flight_number}</div>
                </div>
              </div>
            </div>
          )}

          {/* Número do Voo RETORNO */}
          {booking.has_return && booking.return_transfer_type === 'arrival' && booking.return_flight_number && (
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center gap-3">
                <PlaneIcon className="w-5 h-5 text-green-600" />
                <div>
                  <div className="text-sm text-gray-500">Número do Voo (Retorno)</div>
                  <div className="font-semibold text-lg">{booking.return_flight_number}</div>
                </div>
              </div>
            </div>
          )}

          {/* Passageiros e Valor */}
          <div className="grid md:grid-cols-2 gap-4">
            <div className="flex items-center gap-3">
              <Users className="w-5 h-5 text-blue-600" />
              <div>
                <div className="text-sm text-gray-500">Passageiros</div>
                <div className="font-semibold">{booking.passengers}</div>
              </div>
            </div>
            <div>
              <div className="text-sm text-gray-500">Valor Total</div>
              <div className="text-2xl font-bold text-blue-600">
                {formatPrice(booking.total_price)}
              </div>
            </div>
          </div>

          {/* Idioma do Motorista */}
          {booking.driver_language && (
            <div className="bg-purple-50 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-5 h-5 text-purple-600" />
                <span className="font-semibold text-gray-900">Idioma do Motorista</span>
              </div>
              <p className="ml-7 text-lg font-medium text-purple-900">
                {booking.driver_language === 'pt' ? 'Português' :
                 booking.driver_language === 'en' ? 'English' :
                 booking.driver_language === 'es' ? 'Español' :
                 booking.driver_language} {/* Fallback for unknown languages */}
              </p>
            </div>
          )}

          {/* Breakdown de Preços */}
          <div className="bg-gray-50 p-4 rounded-lg space-y-2">
            <h3 className="font-semibold mb-3">Detalhamento do Valor</h3>
            <div className="space-y-1 text-sm">
              <div className="font-medium text-gray-700 mb-2">Ida:</div>
              <div className="flex justify-between ml-4">
                <span>Preço base:</span>
                <span>{formatPrice(booking.base_price || 0)}</span>
              </div>
              {booking.additional_expenses > 0 && (
                <div className="flex justify-between ml-4">
                  <span>Despesas adicionais:</span>
                  <span>{formatPrice(booking.additional_expenses)}</span>
                </div>
              )}
              {booking.pricing_adjustments !== 0 && (
                <div className="flex justify-between ml-4">
                  <span>Ajustes de tarifa:</span>
                  <span className={booking.pricing_adjustments > 0 ? 'text-orange-600' : 'text-green-600'}>
                    {formatPrice(booking.pricing_adjustments)}
                  </span>
                </div>
              )}
              {booking.additional_items_total > 0 && (
                <div className="flex justify-between ml-4">
                  <span>Itens adicionais:</span>
                  <span>{formatPrice(booking.additional_items_total)}</span>
                </div>
              )}

              {booking.has_return && (
                <>
                  <div className="font-medium text-gray-700 mt-3 mb-2">Retorno:</div>
                  <div className="flex justify-between ml-4">
                    <span>Preço base:</span>
                    <span>{formatPrice(booking.return_base_price || 0)}</span>
                  </div>
                  {booking.return_additional_expenses > 0 && (
                    <div className="flex justify-between ml-4">
                      <span>Despesas adicionais:</span>
                      <span>{formatPrice(booking.return_additional_expenses)}</span>
                    </div>
                  )}
                  {booking.return_pricing_adjustments !== 0 && (
                    <div className="flex justify-between ml-4">
                      <span>Ajustes de tarifa:</span>
                      <span className={booking.return_pricing_adjustments > 0 ? 'text-orange-600' : 'text-green-600'}>
                        {formatPrice(booking.return_pricing_adjustments)}
                      </span>
                    </div>
                  )}
                  {booking.return_additional_items_total > 0 && (
                    <div className="flex justify-between ml-4">
                      <span>Itens adicionais:</span>
                      <span>{formatPrice(booking.return_additional_items_total)}</span>
                    </div>
                  )}

                  {booking.round_trip_discount_amount > 0 && (
                    <div className="flex justify-between font-semibold text-green-600 mt-2">
                      <span className="flex items-center gap-1">
                        <Percent className="w-4 h-4" />
                        Desconto no retorno ({booking.round_trip_discount_percentage}%):
                      </span>
                      <span>-{formatPrice(booking.round_trip_discount_amount)}</span>
                    </div>
                  )}
                </>
              )}

              <div className="border-t pt-2 mt-2 flex justify-between font-bold text-base">
                <span>Total:</span>
                <span className="text-blue-600">{formatPrice(booking.total_price)}</span>
              </div>
            </div>
          </div>

          {/* Itens Adicionais */}
          {booking.selected_additional_items && booking.selected_additional_items.length > 0 && (
            <div className="border-t pt-4">
              <h3 className="font-semibold text-lg mb-3">Itens Adicionais</h3>
              <div className="space-y-2">
                {booking.selected_additional_items.map((item, idx) => (
                  <div key={idx} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                    <div>
                      <div className="font-medium">{item.name}</div>
                      <div className="text-sm text-gray-500">Quantidade: {item.quantity}</div>
                    </div>
                    <div className="font-semibold text-blue-600">
                      {formatItemPrice(item)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Dados do Cliente */}
          <div className="border-t pt-4">
            <h3 className="font-semibold text-lg mb-4">Dados do Cliente</h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <Users className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">Nome</div>
                  <div className="font-medium">{booking.customer_name}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">Email</div>
                  <div className="font-medium">{booking.customer_email}</div>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="w-5 h-5 text-gray-400" />
                <div>
                  <div className="text-sm text-gray-500">Telefone</div>
                  <div className="font-medium">{booking.customer_phone}</div>
                </div>
              </div>
            </div>
          </div>

          {/* Observações */}
          {booking.notes && (
            <div className="border-t pt-4">
              <div className="flex items-center gap-2 mb-2">
                <MessageSquare className="w-5 h-5 text-gray-400" />
                <span className="font-semibold">Observações</span>
              </div>
              <p className="text-gray-700 ml-7">{booking.notes}</p>
            </div>
          )}

          {/* Status */}
          <div className="border-t pt-4">
            <h3 className="font-semibold text-lg mb-4">Status</h3>
            <div className="space-y-4">
              <div>
                <label className="text-sm text-gray-500 block mb-2">Status da Reserva</label>
                <Select
                  value={booking.status}
                  onValueChange={(value) => updateStatusMutation.mutate({ id: booking.id, status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pendente">Pendente</SelectItem>
                    <SelectItem value="confirmada">Confirmada</SelectItem>
                    <SelectItem value="concluida">Concluída</SelectItem>
                    <SelectItem value="cancelada">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="text-sm text-gray-500 block mb-2">Status do Pagamento</label>
                <Select
                  value={booking.payment_status}
                  onValueChange={(value) => updatePaymentMutation.mutate({ id: booking.id, payment_status: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="aguardando">Aguardando</SelectItem>
                    <SelectItem value="pago">Pago</SelectItem>
                    <SelectItem value="reembolsado">Reembolsado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {/* Botão de Reenvio de Link de Pagamento */}
              {(booking.payment_status === 'aguardando' || booking.payment_status === 'falhou') && booking.status !== 'cancelada' && (
                <div className="border-t pt-4">
                  <Button
                    onClick={handleResendPaymentLink}
                    disabled={isResendingLink}
                    variant="outline"
                    className="w-full border-blue-600 text-blue-600 hover:bg-blue-50"
                  >
                    {isResendingLink ? (
                      <>
                        <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                        Reenviando Link...
                      </>
                    ) : (
                      <>
                        <Mail className="w-4 h-4 mr-2" />
                        Reenviar Link de Pagamento
                      </>
                    )}
                  </Button>
                  <p className="text-xs text-gray-500 mt-2 text-center">
                    O cliente receberá um e-mail com um novo link para finalizar o pagamento
                  </p>
                </div>
              )}

              {/* Botão de Reembolso */}
              {booking.payment_status === 'pago' && (
                <div className="border-t pt-4">
                  <Button
                    onClick={() => setShowRefundDialog(true)}
                    variant="destructive"
                    className="w-full"
                  >
                    <CreditCard className="w-4 h-4 mr-2" />
                    Cancelar e Reembolsar Reserva
                  </Button>
                </div>
              )}

              {/* Informações de Reembolso (se já foi reembolsado) */}
              {booking.payment_status === 'reembolsado' && (
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center gap-2 mb-2">
                    <CreditCard className="w-5 h-5 text-green-600" />
                    <span className="font-semibold text-green-900">Reembolso Processado</span>
                  </div>
                  {booking.refund_date && (
                    <p className="text-sm text-gray-700">
                      Data do reembolso: {format(new Date(booking.refund_date), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  )}
                  {booking.refund_reason && (
                    <p className="text-sm text-gray-700 mt-1">
                      Motivo: {booking.refund_reason}
                    </p>
                  )}
                  {booking.refund_id && (
                    <p className="text-xs text-gray-500 mt-2">
                      ID do Reembolso: {booking.refund_id}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="flex justify-end">
            <Button onClick={onClose} variant="outline">
              Fechar
            </Button>
          </div>
        </div>
      </DialogContent>

      {/* Dialog de Confirmação de Reembolso */}
      <Dialog open={showRefundDialog} onOpenChange={setShowRefundDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-900">
              <AlertCircle className="w-6 h-6" />
              Confirmar Reembolso
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-4">
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Esta ação irá cancelar a reserva e reembolsar o valor pago pelo cliente. Esta operação não pode ser desfeita.
              </AlertDescription>
            </Alert>

            <div className="bg-gray-50 p-4 rounded-lg">
              <div className="flex justify-between items-center mb-2">
                <span className="text-sm text-gray-600">Valor a ser reembolsado:</span>
                <span className="text-xl font-bold text-red-600">
                  {formatPrice(booking.total_price)}
                </span>
              </div>
              <div className="text-xs text-gray-500">
                O valor será estornado no cartão do cliente em 5-10 dias úteis
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="refund_reason">Motivo do Cancelamento *</Label>
              <Textarea
                id="refund_reason"
                value={refundReason}
                onChange={(e) => setRefundReason(e.target.value)}
                placeholder="Ex: Cancelamento por indisponibilidade de motorista, problema com veículo, etc."
                className="h-24"
              />
              <p className="text-xs text-gray-500">
                Este motivo será enviado por e-mail ao cliente
              </p>
            </div>

            {refundError && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{refundError}</AlertDescription>
              </Alert>
            )}
          </div>

          <DialogFooter className="flex gap-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowRefundDialog(false);
                setRefundReason('');
                setRefundError('');
              }}
              disabled={isRefunding}
            >
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleRefund}
              disabled={isRefunding || !refundReason.trim()}
            >
              {isRefunding ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Processando...
                </>
              ) : (
                <>
                  <CreditCard className="w-4 h-4 mr-2" />
                  Confirmar Reembolso
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Dialog>
  );
}
