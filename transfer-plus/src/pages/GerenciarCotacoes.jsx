import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { 
  Loader2, 
  Eye, 
  DollarSign, 
  Send, 
  CheckCircle, 
  XCircle, 
  Clock,
  MessageSquare,
  Mail,
  Phone,
  MapPin,
  Calendar,
  Users,
  AlertCircle
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export default function GerenciarCotacoes() {
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const [selectedQuote, setSelectedQuote] = useState(null);
  const [showDetailsDialog, setShowDetailsDialog] = useState(false);
  const [showQuoteDialog, setShowQuoteDialog] = useState(false);
  const [quotePrice, setQuotePrice] = useState('');
  const [adminNotes, setAdminNotes] = useState('');
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const queryClient = useQueryClient();

  const { data: quoteRequests = [], isLoading } = useQuery({
    queryKey: ['quoteRequests'],
    queryFn: () => base44.entities.QuoteRequest.list('-created_date'),
    initialData: [],
  });

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const currentUser = await base44.auth.me();
        if (currentUser.role !== 'admin') {
          window.location.href = '/';
          return;
        }
        setIsCheckingAuth(false);
      } catch (error) {
        base44.auth.redirectToLogin();
      }
    };

    checkAuth();
  }, []);

  const updateStatusMutation = useMutation({
    mutationFn: ({ id, status }) => base44.entities.QuoteRequest.update(id, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quoteRequests'] });
      setSuccess('Status atualizado com sucesso!');
      setTimeout(() => setSuccess(''), 3000);
    },
    onError: (error) => {
      setError(error.message || 'Erro ao atualizar status');
    }
  });

  const submitQuoteMutation = useMutation({
    mutationFn: async ({ quoteId, price, notes }) => {
      const response = await base44.functions.invoke('createPaymentLinkForQuote', {
        quoteId,
        price,
        adminNotes: notes
      });
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quoteRequests'] });
      setSuccess('Cotação enviada com sucesso! O cliente receberá um e-mail com o link de pagamento.');
      setShowQuoteDialog(false);
      setQuotePrice('');
      setAdminNotes('');
      setTimeout(() => setSuccess(''), 5000);
    },
    onError: (error) => {
      setError(error.message || 'Erro ao enviar cotação');
    }
  });

  const handleViewDetails = (quote) => {
    setSelectedQuote(quote);
    setShowDetailsDialog(true);
  };

  const handleOpenQuoteDialog = (quote) => {
    setSelectedQuote(quote);
    setQuotePrice(quote.admin_quote_price || '');
    setAdminNotes(quote.admin_notes || '');
    setShowQuoteDialog(true);
    setError('');
  };

  const handleSubmitQuote = () => {
    if (!quotePrice || parseFloat(quotePrice) <= 0) {
      setError('Por favor, insira um preço válido');
      return;
    }

    submitQuoteMutation.mutate({
      quoteId: selectedQuote.id,
      price: parseFloat(quotePrice),
      notes: adminNotes
    });
  };

  const formatPrice = (price) => {
    return new Intl.NumberFormat('pt-BR', {
      style: 'currency',
      currency: 'BRL'
    }).format(price);
  };

  const getStatusColor = (status) => {
    const colors = {
      pendente: 'bg-yellow-100 text-yellow-800 border-yellow-300',
      em_analise: 'bg-blue-100 text-blue-800 border-blue-300',
      cotado: 'bg-purple-100 text-purple-800 border-purple-300',
      aceito: 'bg-green-100 text-green-800 border-green-300',
      recusado: 'bg-red-100 text-red-800 border-red-300',
      cancelado: 'bg-gray-100 text-gray-800 border-gray-300',
      convertido: 'bg-emerald-100 text-emerald-800 border-emerald-300'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getStatusLabel = (status) => {
    const labels = {
      pendente: 'Pendente',
      em_analise: 'Em Análise',
      cotado: 'Cotado',
      aceito: 'Aceito',
      recusado: 'Recusado',
      cancelado: 'Cancelado',
      convertido: 'Convertido'
    };
    return labels[status] || status;
  };

  const pendingQuotes = quoteRequests.filter(q => q.status === 'pendente' || q.status === 'em_analise');
  const quotedQuotes = quoteRequests.filter(q => q.status === 'cotado');
  const completedQuotes = quoteRequests.filter(q => ['aceito', 'convertido', 'recusado', 'cancelado'].includes(q.status));

  if (isCheckingAuth) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="w-12 h-12 animate-spin text-blue-600 mx-auto mb-4" />
          <p className="text-gray-600">Verificando permissões...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-2">
            Gerenciar Cotações
          </h1>
          <p className="text-gray-600">Visualize e responda solicitações de cotação de clientes</p>
        </div>

        {success && (
          <Alert className="mb-6 bg-green-50 border-green-200">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <AlertDescription className="text-green-800">{success}</AlertDescription>
          </Alert>
        )}

        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        <Tabs defaultValue="pending" className="space-y-6">
          <TabsList className="grid w-full md:w-auto md:inline-grid grid-cols-3 gap-2">
            <TabsTrigger value="pending" className="flex items-center gap-2">
              <Clock className="w-4 h-4" />
              Pendentes ({pendingQuotes.length})
            </TabsTrigger>
            <TabsTrigger value="quoted" className="flex items-center gap-2">
              <DollarSign className="w-4 h-4" />
              Cotados ({quotedQuotes.length})
            </TabsTrigger>
            <TabsTrigger value="completed" className="flex items-center gap-2">
              <CheckCircle className="w-4 h-4" />
              Finalizados ({completedQuotes.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="pending">
            <Card>
              <CardHeader>
                <CardTitle>Cotações Pendentes</CardTitle>
              </CardHeader>
              <CardContent>
                <QuoteTable
                  quotes={pendingQuotes}
                  onViewDetails={handleViewDetails}
                  onQuote={handleOpenQuoteDialog}
                  onUpdateStatus={updateStatusMutation.mutate}
                  formatPrice={formatPrice}
                  getStatusColor={getStatusColor}
                  getStatusLabel={getStatusLabel}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="quoted">
            <Card>
              <CardHeader>
                <CardTitle>Cotações Enviadas</CardTitle>
              </CardHeader>
              <CardContent>
                <QuoteTable
                  quotes={quotedQuotes}
                  onViewDetails={handleViewDetails}
                  onUpdateStatus={updateStatusMutation.mutate}
                  formatPrice={formatPrice}
                  getStatusColor={getStatusColor}
                  getStatusLabel={getStatusLabel}
                  hideQuoteButton
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="completed">
            <Card>
              <CardHeader>
                <CardTitle>Cotações Finalizadas</CardTitle>
              </CardHeader>
              <CardContent>
                <QuoteTable
                  quotes={completedQuotes}
                  onViewDetails={handleViewDetails}
                  formatPrice={formatPrice}
                  getStatusColor={getStatusColor}
                  getStatusLabel={getStatusLabel}
                  hideActions
                />
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Dialog de Detalhes */}
        {selectedQuote && (
          <Dialog open={showDetailsDialog} onOpenChange={setShowDetailsDialog}>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="text-2xl flex items-center gap-3">
                  Detalhes da Cotação
                  <Badge className={`${getStatusColor(selectedQuote.status)} border text-lg px-3 py-1`}>
                    {selectedQuote.quote_number}
                  </Badge>
                </DialogTitle>
              </DialogHeader>

              <div className="space-y-6">
                {/* Informações da Viagem */}
                <div className="bg-blue-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-lg mb-3">Informações da Viagem</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Tipo:</span>
                      <span className="font-medium">
                        {selectedQuote.service_type === 'one_way' ? 'Só Ida' : 
                         selectedQuote.service_type === 'round_trip' ? 'Ida e Volta' : 'Por Hora'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Veículo:</span>
                      <span className="font-medium">{selectedQuote.vehicle_type_name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Idioma Motorista:</span>
                      <span className="font-medium">
                        {selectedQuote.driver_language === 'pt' ? 'Português' : 
                         selectedQuote.driver_language === 'en' ? 'English' : 'Español'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Rota */}
                <div>
                  <div className="flex items-center gap-2 mb-2">
                    <MapPin className="w-5 h-5 text-blue-600" />
                    <span className="font-semibold">Rota</span>
                  </div>
                  <div className="ml-7 bg-gray-50 p-3 rounded-lg">
                    <div className="text-sm">
                      <span className="font-semibold">{selectedQuote.origin}</span>
                      <span className="mx-2 text-gray-500">→</span>
                      <span className="font-semibold">{selectedQuote.destination}</span>
                    </div>
                    {selectedQuote.distance_km > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        Distância total: {selectedQuote.distance_km} km
                      </p>
                    )}
                  </div>
                </div>

                {/* Data e Hora */}
                <div className="grid md:grid-cols-2 gap-4">
                  <div className="flex items-center gap-3">
                    <Calendar className="w-5 h-5 text-blue-600" />
                    <div>
                      <div className="text-sm text-gray-500">Data</div>
                      <div className="font-semibold">
                        {format(new Date(selectedQuote.date), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Clock className="w-5 h-5 text-blue-600" />
                    <div>
                      <div className="text-sm text-gray-500">Horário</div>
                      <div className="font-semibold">{selectedQuote.time}</div>
                    </div>
                  </div>
                </div>

                {selectedQuote.service_type === 'round_trip' && selectedQuote.return_date && (
                  <div className="grid md:grid-cols-2 gap-4 bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Calendar className="w-5 h-5 text-green-600" />
                      <div>
                        <div className="text-sm text-gray-500">Data Retorno</div>
                        <div className="font-semibold">
                          {format(new Date(selectedQuote.return_date), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-green-600" />
                      <div>
                        <div className="text-sm text-gray-500">Horário Retorno</div>
                        <div className="font-semibold">{selectedQuote.return_time}</div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedQuote.service_type === 'hourly' && selectedQuote.hours && (
                  <div className="bg-purple-50 p-4 rounded-lg">
                    <div className="flex items-center gap-3">
                      <Clock className="w-5 h-5 text-purple-600" />
                      <div>
                        <div className="text-sm text-gray-500">Duração</div>
                        <div className="font-semibold text-lg">{selectedQuote.hours} horas</div>
                      </div>
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
                        <div className="font-medium">{selectedQuote.customer_name}</div>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail className="w-5 h-5 text-gray-400" />
                      <div>
                        <div className="text-sm text-gray-500">Email</div>
                        <div className="font-medium">{selectedQuote.customer_email}</div>
                      </div>
                    </div>
                    {selectedQuote.customer_phone && (
                      <div className="flex items-center gap-3">
                        <Phone className="w-5 h-5 text-gray-400" />
                        <div>
                          <div className="text-sm text-gray-500">Telefone</div>
                          <div className="font-medium">{selectedQuote.customer_phone}</div>
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Observações do Cliente */}
                {selectedQuote.notes && (
                  <div className="border-t pt-4">
                    <div className="flex items-center gap-2 mb-2">
                      <MessageSquare className="w-5 h-5 text-gray-400" />
                      <span className="font-semibold">Observações do Cliente</span>
                    </div>
                    <p className="text-gray-700 ml-7 bg-gray-50 p-3 rounded-lg">{selectedQuote.notes}</p>
                  </div>
                )}

                {/* Motivo da Cotação */}
                {selectedQuote.reason && (
                  <div className="bg-orange-50 border border-orange-200 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <AlertCircle className="w-5 h-5 text-orange-600" />
                      <span className="font-semibold text-orange-900">Motivo da Cotação</span>
                    </div>
                    <p className="text-orange-800 ml-7">{selectedQuote.reason}</p>
                  </div>
                )}

                {/* Cotação do Admin (se já foi cotado) */}
                {selectedQuote.admin_quote_price && (
                  <div className="border-t pt-4">
                    <h3 className="font-semibold text-lg mb-4">Cotação Enviada</h3>
                    <div className="bg-green-50 p-4 rounded-lg space-y-3">
                      <div>
                        <div className="text-sm text-gray-600">Preço Cotado:</div>
                        <div className="text-2xl font-bold text-green-600">
                          {formatPrice(selectedQuote.admin_quote_price)}
                        </div>
                      </div>
                      {selectedQuote.admin_notes && (
                        <div>
                          <div className="text-sm text-gray-600 mb-1">Observações do Admin:</div>
                          <p className="text-gray-700">{selectedQuote.admin_notes}</p>
                        </div>
                      )}
                      {selectedQuote.quoted_at && (
                        <div className="text-xs text-gray-500">
                          Cotado em: {format(new Date(selectedQuote.quoted_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Reserva Convertida */}
                {selectedQuote.status === 'convertido' && selectedQuote.booking_id && (
                  <div className="bg-emerald-50 border border-emerald-200 p-4 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <CheckCircle className="w-5 h-5 text-emerald-600" />
                      <span className="font-semibold text-emerald-900">Convertido em Reserva</span>
                    </div>
                    <p className="text-emerald-800 ml-7">
                      Esta cotação foi convertida em uma reserva após o pagamento do cliente.
                    </p>
                    {selectedQuote.converted_at && (
                      <p className="text-xs text-emerald-600 ml-7 mt-2">
                        Convertido em: {format(new Date(selectedQuote.converted_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    )}
                  </div>
                )}
              </div>

              <DialogFooter>
                <Button onClick={() => setShowDetailsDialog(false)} variant="outline">
                  Fechar
                </Button>
                {(selectedQuote.status === 'pendente' || selectedQuote.status === 'em_analise') && (
                  <Button
                    onClick={() => {
                      setShowDetailsDialog(false);
                      handleOpenQuoteDialog(selectedQuote);
                    }}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <DollarSign className="w-4 h-4 mr-2" />
                    Cotar Preço
                  </Button>
                )}
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}

        {/* Dialog de Cotação */}
        {selectedQuote && (
          <Dialog open={showQuoteDialog} onOpenChange={setShowQuoteDialog}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle>Cotar Preço</DialogTitle>
              </DialogHeader>

              <div className="space-y-4">
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="text-sm text-gray-600">Cotação:</div>
                  <div className="font-bold text-lg">{selectedQuote.quote_number}</div>
                  <div className="text-sm text-gray-600 mt-2">Cliente:</div>
                  <div className="font-medium">{selectedQuote.customer_name}</div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="quote_price">Preço da Cotação (R$) *</Label>
                  <Input
                    id="quote_price"
                    type="number"
                    min="0"
                    step="0.01"
                    value={quotePrice}
                    onChange={(e) => setQuotePrice(e.target.value)}
                    placeholder="0.00"
                    className="text-lg"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="admin_notes">Observações (opcional)</Label>
                  <Textarea
                    id="admin_notes"
                    value={adminNotes}
                    onChange={(e) => setAdminNotes(e.target.value)}
                    placeholder="Informações adicionais para o cliente..."
                    className="h-24"
                  />
                </div>

                {error && (
                  <Alert variant="destructive">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                <Alert className="bg-blue-50 border-blue-200">
                  <Send className="h-4 w-4 text-blue-600" />
                  <AlertDescription className="text-blue-800 text-sm">
                    Ao enviar, o cliente receberá um e-mail com o preço e um link de pagamento do Stripe.
                  </AlertDescription>
                </Alert>
              </div>

              <DialogFooter>
                <Button onClick={() => setShowQuoteDialog(false)} variant="outline">
                  Cancelar
                </Button>
                <Button
                  onClick={handleSubmitQuote}
                  disabled={submitQuoteMutation.isLoading}
                  className="bg-green-600 hover:bg-green-700"
                >
                  {submitQuoteMutation.isLoading ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Enviando...
                    </>
                  ) : (
                    <>
                      <Send className="w-4 h-4 mr-2" />
                      Enviar Cotação
                    </>
                  )}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </div>
    </div>
  );
}

function QuoteTable({ 
  quotes, 
  onViewDetails, 
  onQuote, 
  onUpdateStatus, 
  formatPrice, 
  getStatusColor, 
  getStatusLabel,
  hideQuoteButton = false,
  hideActions = false
}) {
  if (quotes.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        Nenhuma cotação encontrada
      </div>
    );
  }

  return (
    <div className="rounded-lg border bg-white overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow className="bg-gray-50">
            <TableHead className="font-semibold">Nº Cotação</TableHead>
            <TableHead className="font-semibold">Cliente</TableHead>
            <TableHead className="font-semibold">Rota</TableHead>
            <TableHead className="font-semibold">Data</TableHead>
            <TableHead className="font-semibold">Veículo</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            {!hideActions && <TableHead className="font-semibold">Ações</TableHead>}
          </TableRow>
        </TableHeader>
        <TableBody>
          {quotes.map((quote) => (
            <TableRow key={quote.id} className="hover:bg-gray-50">
              <TableCell>
                <div className="font-mono font-semibold text-blue-600">
                  {quote.quote_number}
                </div>
                {quote.admin_quote_price && (
                  <div className="text-sm text-green-600 font-semibold mt-1">
                    {formatPrice(quote.admin_quote_price)}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <div>
                  <div className="font-medium text-gray-900">{quote.customer_name}</div>
                  <div className="text-sm text-gray-500">{quote.customer_email}</div>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <div className="font-medium">{quote.origin}</div>
                  <div className="text-gray-500">→ {quote.destination}</div>
                  {quote.distance_km > 0 && (
                    <div className="text-xs text-gray-400 mt-1">{quote.distance_km} km</div>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm">
                  <div>{format(new Date(quote.date), "dd/MM/yyyy", { locale: ptBR })}</div>
                  <div className="text-gray-500">{quote.time}</div>
                </div>
              </TableCell>
              <TableCell>
                <div className="text-sm font-medium">{quote.vehicle_type_name}</div>
                {quote.service_type && (
                  <div className="text-xs text-gray-500">
                    {quote.service_type === 'one_way' ? 'Só Ida' : 
                     quote.service_type === 'round_trip' ? 'Ida e Volta' : 'Por Hora'}
                  </div>
                )}
              </TableCell>
              <TableCell>
                <Badge className={`${getStatusColor(quote.status)} border`}>
                  {getStatusLabel(quote.status)}
                </Badge>
              </TableCell>
              {!hideActions && (
                <TableCell>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetails(quote)}
                      title="Ver detalhes"
                    >
                      <Eye className="w-4 h-4" />
                    </Button>
                    {!hideQuoteButton && (quote.status === 'pendente' || quote.status === 'em_analise') && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onQuote(quote)}
                        className="text-green-600 hover:text-green-700 hover:bg-green-50"
                        title="Cotar preço"
                      >
                        <DollarSign className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              )}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}