import { useState, useEffect, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible';
import {
  ArrowLeft,
  Plus,
  Calendar,
  ChevronDown,
  Loader2,
  MapPin,
  BarChart3,
  Pause,
  Play,
  Square,
  ExternalLink,
} from 'lucide-react';
import { categories } from '@/types/events';
import {
  useProducerEvent,
  useUpdateEvent,
  usePublishEvent,
  useUpdateEventStatus,
  useCreateEventDate,
  useCreateLot,
  useCreateTicketType,
} from '@/hooks/useProducerEvents';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';

const statusLabels: Record<string, string> = {
  DRAFT: 'Rascunho',
  PUBLISHED: 'Publicado',
  PAUSED: 'Pausado',
  ENDED: 'Encerrado',
};

const audienceLabels: Record<string, string> = {
  GENERAL: 'Geral',
  MALE: 'Homem',
  FEMALE: 'Mulher',
  CHILD: 'Criança',
};

export default function ProducerEventEdit() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { data: event, isLoading, error } = useProducerEvent(id ?? undefined);
  const updateEvent = useUpdateEvent();
  const publishEvent = usePublishEvent();
  const updateStatus = useUpdateEventStatus();
  const createDate = useCreateEventDate(id ?? '');
  const createLot = useCreateLot();
  const createTicketType = useCreateTicketType();

  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editCategory, setEditCategory] = useState('');
  const [editCoverImage, setEditCoverImage] = useState('');
  const [editLocation, setEditLocation] = useState('');
  const [editAddress, setEditAddress] = useState('');
  const [dateOpen, setDateOpen] = useState(false);
  const [newDate, setNewDate] = useState('');
  const [newStartTime, setNewStartTime] = useState('');
  const [newEndTime, setNewEndTime] = useState('');
  const [lotOpen, setLotOpen] = useState<string | null>(null);
  const [newLotName, setNewLotName] = useState('');
  const [newLotStartsAt, setNewLotStartsAt] = useState('');
  const [newLotEndsAt, setNewLotEndsAt] = useState('');
  const [newLotQuantity, setNewLotQuantity] = useState('');
  const [ticketOpen, setTicketOpen] = useState<string | null>(null);
  const [newTicketName, setNewTicketName] = useState('');
  const [newTicketDesc, setNewTicketDesc] = useState('');
  type TicketVariantRow = { audience: string; maxQuantity: string; price: string };
  const [newTicketVariants, setNewTicketVariants] = useState<TicketVariantRow[]>([
    { audience: 'GENERAL', maxQuantity: '', price: '' },
  ]);
  const coverFileRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!event) return;
    setEditTitle(event.title);
    setEditDescription(event.description);
    setEditCategory(event.category);
    setEditCoverImage(event.coverImage);
    setEditLocation(event.location);
    setEditAddress(event.address ?? '');
  }, [event?.id]);

  const handleSaveEvent = async () => {
    if (!id) return;
    try {
      await updateEvent.mutateAsync({
        id,
        input: {
          title: editTitle || undefined,
          description: editDescription || undefined,
          category: editCategory || undefined,
          coverImage: editCoverImage || undefined,
          location: editLocation || undefined,
          address: editAddress || undefined,
        },
      });
      toast({ title: 'Evento atualizado' });
    } catch {
      toast({ title: 'Erro ao salvar', variant: 'destructive' });
    }
  };

  const handleAddDate = async () => {
    if (!id || !newDate.trim()) return;
    try {
      await createDate.mutateAsync({
        date: newDate,
        startTime: newStartTime.trim() || null,
        endTime: newEndTime.trim() || null,
      });
      setNewDate('');
      setNewStartTime('');
      setNewEndTime('');
      setDateOpen(false);
      toast({ title: 'Data adicionada' });
    } catch {
      toast({ title: 'Erro ao adicionar data', variant: 'destructive' });
    }
  };

  const handleAddLot = async (dateId: string) => {
    if (!newLotName.trim() || !newLotStartsAt.trim() || !newLotEndsAt.trim() || !newLotQuantity.trim()) return;
    const qty = parseInt(newLotQuantity, 10);
    if (isNaN(qty) || qty <= 0) return;
    createLot.mutate(
      {
        dateId,
        input: {
          name: newLotName.trim(),
          startsAt: newLotStartsAt,
          endsAt: newLotEndsAt,
          totalQuantity: qty,
        },
      },
      {
        onSuccess: () => {
          setNewLotName('');
          setNewLotStartsAt('');
          setNewLotEndsAt('');
          setNewLotQuantity('');
          setLotOpen(null);
          toast({ title: 'Lote adicionado' });
        },
        onError: () => toast({ title: 'Erro ao adicionar lote', variant: 'destructive' }),
      }
    );
  };

  const addTicketVariantRow = () => {
    setNewTicketVariants((prev) => [...prev, { audience: 'GENERAL', maxQuantity: '', price: '' }]);
  };

  const updateTicketVariant = (index: number, field: keyof TicketVariantRow, value: string) => {
    setNewTicketVariants((prev) =>
      prev.map((row, i) => (i === index ? { ...row, [field]: value } : row))
    );
  };

  const removeTicketVariantRow = (index: number) => {
    setNewTicketVariants((prev) => (prev.length > 1 ? prev.filter((_, i) => i !== index) : prev));
  };

  const handleAddTicketType = async (lotId: string) => {
    const name = newTicketName.trim();
    if (!name) return;
    const valid = newTicketVariants.filter(
      (v) => v.maxQuantity.trim() && v.price.trim()
    );
    if (valid.length === 0) {
      toast({ title: 'Adicione ao menos uma variante (público, quantidade, preço).', variant: 'destructive' });
      return;
    }
    const description = newTicketDesc.trim() || null;
    let ok = 0;
    for (const v of valid) {
      const price = parseFloat(v.price.replace(',', '.'));
      const max = parseInt(v.maxQuantity, 10);
      if (isNaN(price) || price < 0 || isNaN(max) || max <= 0) continue;
      try {
        await createTicketType.mutateAsync({
          lotId,
          input: {
            name,
            description,
            price,
            audience: v.audience,
            maxQuantity: max,
          },
        });
        ok++;
      } catch {
        toast({ title: 'Erro ao adicionar variante', variant: 'destructive' });
        return;
      }
    }
    setNewTicketName('');
    setNewTicketDesc('');
    setNewTicketVariants([{ audience: 'GENERAL', maxQuantity: '', price: '' }]);
    setTicketOpen(null);
    toast({ title: ok === 1 ? 'Tipo de ingresso adicionado' : `${ok} variantes adicionadas` });
  };

  const totalSold =
    event?.dates?.reduce(
      (acc, d) =>
        acc +
        (d.lots?.reduce(
          (a, l) =>
            a + (l.ticketTypes?.reduce((s, tt) => s + (tt.soldQuantity ?? 0), 0) ?? 0),
          0
        ) ?? 0),
      0
    ) ?? 0;

  if (isLoading || !id) {
    return (
      <Layout>
        <div className="container py-8">
          <Skeleton className="h-8 w-48 mb-6" />
          <Skeleton className="h-64 w-full rounded-2xl" />
        </div>
      </Layout>
    );
  }

  if (error || !event) {
    return (
      <Layout>
        <div className="container py-16 text-center">
          <p className="text-muted-foreground mb-4">Evento não encontrado.</p>
          <Button asChild>
            <Link to="/produtor">Voltar ao painel</Link>
          </Button>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="container py-6 sm:py-10 max-w-4xl">
        <Link
          to="/produtor"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>

        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4 mb-8">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold">{event.title}</h1>
            <div className="flex items-center gap-2 mt-2">
              <Badge>{statusLabels[event.status] ?? event.status}</Badge>
              <span className="text-muted-foreground text-sm flex items-center gap-1">
                <BarChart3 className="w-4 h-4" />
                {totalSold} ingressos vendidos
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            {(event.status === 'PUBLISHED' || event.status === 'PAUSED') && (
              <Button size="sm" variant="outline" asChild>
                <a href={`/evento/${event.id}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2">
                  <ExternalLink className="w-4 h-4" />
                  Ver evento (página pública)
                </a>
              </Button>
            )}
            {event.status === 'DRAFT' && (
              <Button
                size="sm"
                onClick={() =>
                  publishEvent.mutate(id, {
                    onSuccess: () => toast({ title: 'Evento publicado' }),
                    onError: () => toast({ title: 'Erro ao publicar', variant: 'destructive' }),
                  })
                }
                disabled={publishEvent.isPending}
              >
                {publishEvent.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4 mr-1" />}
                Publicar
              </Button>
            )}
            {event.status === 'PUBLISHED' && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  updateStatus.mutate(
                    { id, status: 'PAUSED' },
                    {
                      onSuccess: () => toast({ title: 'Evento pausado' }),
                      onError: () => toast({ title: 'Erro', variant: 'destructive' }),
                    }
                  )
                }
                disabled={updateStatus.isPending}
              >
                <Pause className="w-4 h-4 mr-1" />
                Pausar
              </Button>
            )}
            {event.status === 'PAUSED' && (
              <Button
                size="sm"
                onClick={() =>
                  updateStatus.mutate(
                    { id, status: 'PUBLISHED' },
                    {
                      onSuccess: () => toast({ title: 'Evento republicado' }),
                      onError: () => toast({ title: 'Erro', variant: 'destructive' }),
                    }
                  )
                }
                disabled={updateStatus.isPending}
              >
                <Play className="w-4 h-4 mr-1" />
                Republicar
              </Button>
            )}
            {(event.status === 'PUBLISHED' || event.status === 'PAUSED') && (
              <Button
                size="sm"
                variant="outline"
                onClick={() =>
                  updateStatus.mutate(
                    { id, status: 'ENDED' },
                    {
                      onSuccess: () => toast({ title: 'Vendas encerradas' }),
                      onError: () => toast({ title: 'Erro', variant: 'destructive' }),
                    }
                  )
                }
                disabled={updateStatus.isPending}
              >
                <Square className="w-4 h-4 mr-1" />
                Encerrar
              </Button>
            )}
          </div>
        </div>

        {/* Dados do evento */}
        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="text-lg">Dados do evento</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label>Nome</Label>
                <Input
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  placeholder="Nome do evento"
                />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Descrição</Label>
                <Textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={3}
                  className="resize-none"
                />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={editCategory} onValueChange={setEditCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Categoria" />
                  </SelectTrigger>
                  <SelectContent>
                    {categories.filter((c) => c.id !== 'all').map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Imagem de capa (URL ou arquivo)</Label>
                <Input
                  value={editCoverImage}
                  onChange={(e) => setEditCoverImage(e.target.value)}
                  placeholder="https://... ou envie arquivo"
                />
                <input
                  ref={coverFileRef}
                  type="file"
                  accept="image/jpeg,image/png"
                  className="hidden"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (!file || file.size > 500 * 1024) return;
                    const reader = new FileReader();
                    reader.onload = () => setEditCoverImage(reader.result as string);
                    reader.readAsDataURL(file);
                    e.target.value = '';
                  }}
                />
                <Button type="button" variant="outline" size="sm" onClick={() => coverFileRef.current?.click()}>
                  Enviar arquivo (JPEG/PNG, máx. 500 KB)
                </Button>
              </div>
              <div className="space-y-2">
                <Label>Local</Label>
                <Input
                  value={editLocation}
                  onChange={(e) => setEditLocation(e.target.value)}
                  placeholder="Local do evento"
                />
              </div>
              <div className="space-y-2">
                <Label>Endereço completo</Label>
                <Input
                  value={editAddress}
                  onChange={(e) => setEditAddress(e.target.value)}
                  placeholder="Rua, número, cidade - UF"
                />
              </div>
            </div>
            <Button onClick={handleSaveEvent} disabled={updateEvent.isPending}>
              {updateEvent.isPending ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Salvar alterações
            </Button>
          </CardContent>
        </Card>

        {/* Datas */}
        <Card className="mb-6">
          <Collapsible defaultOpen>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-lg flex items-center gap-2">
                <Calendar className="w-5 h-5 text-primary" />
                Datas do evento
              </CardTitle>
              <CollapsibleTrigger asChild>
                <Button variant="ghost" size="icon">
                  <ChevronDown className="w-4 h-4" />
                </Button>
              </CollapsibleTrigger>
            </CardHeader>
            <CardContent>
              <CollapsibleContent>
                <ul className="space-y-4 mb-4">
                  {event.dates?.map((d) => (
                    <li key={d.id} className="border rounded-xl p-4 bg-muted/30">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <span className="font-medium">
                          {new Date(d.date).toLocaleDateString('pt-BR', {
                            weekday: 'short',
                            day: '2-digit',
                            month: 'short',
                            year: 'numeric',
                          })}
                        </span>
                        {(d.startTime || d.endTime) && (
                          <span className="text-muted-foreground text-sm">
                            {d.startTime ?? ''}
                            {d.endTime ? ` – ${d.endTime}` : ''}
                          </span>
                        )}
                      </div>
                      {/* Lotes desta data */}
                      <div className="ml-2 space-y-3 mt-3">
                        {d.lots?.map((lot) => (
                          <div key={lot.id} className="border-l-2 border-primary/30 pl-3 py-2">
                            <div className="flex items-center gap-2 mb-2">
                              <span className="font-medium text-sm">{lot.name}</span>
                              <Badge variant="outline" className="text-xs">
                                {lot.active ? 'Ativo' : 'Encerrado'} · {lot.availableQuantity} disp.
                              </Badge>
                            </div>
                            <ul className="text-sm text-muted-foreground space-y-1">
                              {lot.ticketTypes?.map((tt) => (
                                <li key={tt.id}>
                                  {tt.name} – R$ {tt.price.toFixed(2).replace('.', ',')} ·{' '}
                                  {audienceLabels[tt.audience] ?? tt.audience} · vendidos: {tt.soldQuantity}/{tt.maxQuantity}
                                </li>
                              ))}
                            </ul>
                            <Dialog
                              open={ticketOpen === lot.id}
                              onOpenChange={(o) => {
                                setTicketOpen(o ? lot.id : null);
                                if (!o) setNewTicketVariants([{ audience: 'GENERAL', maxQuantity: '', price: '' }]);
                              }}
                            >
                              <DialogTrigger asChild>
                                <Button variant="outline" size="sm" className="mt-2">
                                  <Plus className="w-3 h-3 mr-1" />
                                  Tipo de ingresso
                                </Button>
                              </DialogTrigger>
                              <DialogContent className="max-w-md max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                  <DialogTitle>Novo tipo de ingresso (com variantes)</DialogTitle>
                                </DialogHeader>
                                <p className="text-sm text-muted-foreground">
                                  Ex: um card &quot;Pista&quot; com Homem 200 ingressos e Mulher 100 — adicione uma variante por público/quantidade/preço.
                                </p>
                                <div className="space-y-4">
                                  <div className="space-y-2">
                                    <Label>Nome do tipo (ex: Pista)</Label>
                                    <Input
                                      value={newTicketName}
                                      onChange={(e) => setNewTicketName(e.target.value)}
                                      placeholder="Ex: Pista"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Descrição (opcional)</Label>
                                    <Input
                                      value={newTicketDesc}
                                      onChange={(e) => setNewTicketDesc(e.target.value)}
                                      placeholder="Ex: Acesso à área de pista"
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Variantes (público + quantidade + preço)</Label>
                                    {newTicketVariants.map((row, index) => (
                                      <div key={index} className="flex flex-wrap items-end gap-2 p-2 rounded-lg border border-border bg-muted/30">
                                        <Select
                                          value={row.audience}
                                          onValueChange={(v) => updateTicketVariant(index, 'audience', v)}
                                        >
                                          <SelectTrigger className="w-[110px] h-9">
                                            <SelectValue />
                                          </SelectTrigger>
                                          <SelectContent>
                                            {Object.entries(audienceLabels).map(([k, v]) => (
                                              <SelectItem key={k} value={k}>
                                                {v}
                                              </SelectItem>
                                            ))}
                                          </SelectContent>
                                        </Select>
                                        <Input
                                          type="number"
                                          min={1}
                                          placeholder="Qtd"
                                          className="w-16 h-9"
                                          value={row.maxQuantity}
                                          onChange={(e) => updateTicketVariant(index, 'maxQuantity', e.target.value)}
                                        />
                                        <Input
                                          type="text"
                                          placeholder="R$ 0,00"
                                          className="w-20 h-9"
                                          value={row.price}
                                          onChange={(e) => updateTicketVariant(index, 'price', e.target.value)}
                                        />
                                        <Button
                                          type="button"
                                          variant="ghost"
                                          size="icon"
                                          className="h-9 w-9 shrink-0"
                                          onClick={() => removeTicketVariantRow(index)}
                                          disabled={newTicketVariants.length <= 1}
                                        >
                                          ×
                                        </Button>
                                      </div>
                                    ))}
                                    <Button type="button" variant="outline" size="sm" onClick={addTicketVariantRow}>
                                      <Plus className="w-3 h-3 mr-1" />
                                      Adicionar variante
                                    </Button>
                                  </div>
                                  <Button
                                    onClick={() => handleAddTicketType(lot.id)}
                                    disabled={
                                      !newTicketName.trim() ||
                                      !newTicketVariants.some((v) => v.maxQuantity.trim() && v.price.trim()) ||
                                      createTicketType.isPending
                                    }
                                  >
                                    {createTicketType.isPending ? (
                                      <Loader2 className="w-4 h-4 animate-spin mr-2" />
                                    ) : null}
                                    Adicionar tipo de ingresso
                                  </Button>
                                </div>
                              </DialogContent>
                            </Dialog>
                          </div>
                        ))}
                        <Dialog open={lotOpen === d.id} onOpenChange={(o) => setLotOpen(o ? d.id : null)}>
                          <DialogTrigger asChild>
                            <Button variant="outline" size="sm">
                              <Plus className="w-3 h-3 mr-1" />
                              Adicionar lote
                            </Button>
                          </DialogTrigger>
                          <DialogContent>
                            <DialogHeader>
                              <DialogTitle>Novo lote</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4">
                              <div className="space-y-2">
                                <Label>Nome do lote</Label>
                                <Input
                                  value={newLotName}
                                  onChange={(e) => setNewLotName(e.target.value)}
                                  placeholder="Ex: 1º Lote"
                                />
                              </div>
                              <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                  <Label>Início (data/hora)</Label>
                                  <Input
                                    type="datetime-local"
                                    value={newLotStartsAt}
                                    onChange={(e) => setNewLotStartsAt(e.target.value)}
                                  />
                                </div>
                                <div className="space-y-2">
                                  <Label>Fim (data/hora)</Label>
                                  <Input
                                    type="datetime-local"
                                    value={newLotEndsAt}
                                    onChange={(e) => setNewLotEndsAt(e.target.value)}
                                  />
                                </div>
                              </div>
                              <div className="space-y-2">
                                <Label>Quantidade total de ingressos</Label>
                                <Input
                                  type="number"
                                  min={1}
                                  value={newLotQuantity}
                                  onChange={(e) => setNewLotQuantity(e.target.value)}
                                  placeholder="1000"
                                />
                              </div>
                              <Button
                                onClick={() => handleAddLot(d.id)}
                                disabled={
                                  !newLotName.trim() ||
                                  !newLotStartsAt ||
                                  !newLotEndsAt ||
                                  !newLotQuantity.trim() ||
                                  createLot.isPending
                                }
                              >
                                {createLot.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Adicionar lote'}
                              </Button>
                            </div>
                          </DialogContent>
                        </Dialog>
                      </div>
                    </li>
                  ))}
                </ul>
                <Dialog open={dateOpen} onOpenChange={setDateOpen}>
                  <DialogTrigger asChild>
                    <Button variant="outline">
                      <Plus className="w-4 h-4 mr-2" />
                      Adicionar data
                    </Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader>
                      <DialogTitle>Nova data do evento</DialogTitle>
                    </DialogHeader>
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Data</Label>
                        <Input
                          type="date"
                          value={newDate}
                          onChange={(e) => setNewDate(e.target.value)}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          <Label>Horário de abertura</Label>
                          <Input
                            type="time"
                            value={newStartTime}
                            onChange={(e) => setNewStartTime(e.target.value)}
                            placeholder="18:00"
                          />
                        </div>
                        <div className="space-y-2">
                          <Label>Horário de encerramento</Label>
                          <Input
                            type="time"
                            value={newEndTime}
                            onChange={(e) => setNewEndTime(e.target.value)}
                            placeholder="23:00"
                          />
                        </div>
                      </div>
                      <Button
                        onClick={handleAddDate}
                        disabled={!newDate.trim() || createDate.isPending}
                      >
                        {createDate.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Adicionar data'}
                      </Button>
                    </div>
                  </DialogContent>
                </Dialog>
              </CollapsibleContent>
            </CardContent>
          </Collapsible>
        </Card>

        {/* Resumo de vendas */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-primary" />
              Resumo de vendas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-muted-foreground text-sm">
              Total de ingressos vendidos: <strong className="text-foreground">{totalSold}</strong>
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Por data, lote e tipo de ingresso: veja os números em cada bloco acima (vendidos / máximo).
            </p>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
