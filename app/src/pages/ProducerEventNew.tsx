import { useState, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ArrowLeft, Loader2 } from 'lucide-react';
import { categories } from '@/types/events';
import { useCreateEvent } from '@/hooks/useProducerEvents';
import { useToast } from '@/hooks/use-toast';

export default function ProducerEventNew() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const createEvent = useCreateEvent();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [category, setCategory] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [location, setLocation] = useState('');
  const [address, setAddress] = useState('');
  const coverFileRef = useRef<HTMLInputElement>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim() || !category || !coverImage.trim() || !location.trim()) {
      toast({
        title: 'Campos obrigatórios',
        description: 'Preencha nome, descrição, categoria, imagem e local.',
        variant: 'destructive',
      });
      return;
    }
    try {
      const id = await createEvent.mutateAsync({
        title: title.trim(),
        description: description.trim(),
        category: category === 'all' ? 'shows' : category,
        coverImage: coverImage.trim(),
        location: location.trim(),
        address: address.trim() || undefined,
      });
      toast({
        title: 'Evento criado',
        description: 'Agora adicione datas, lotes e tipos de ingresso.',
      });
      navigate(`/produtor/eventos/${id}`);
    } catch {
      toast({
        title: 'Erro',
        description: 'Não foi possível criar o evento.',
        variant: 'destructive',
      });
    }
  };

  return (
    <Layout>
      <div className="container py-6 sm:py-10 max-w-2xl">
        <Link
          to="/produtor"
          className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar
        </Link>

        <h1 className="font-display text-2xl sm:text-3xl font-bold mb-2">Novo evento</h1>
        <p className="text-muted-foreground text-sm sm:text-base mb-8">
          Preencha os dados básicos do evento. Depois você poderá adicionar datas, lotes e ingressos.
        </p>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="title">Nome do evento *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Ex: Festival de Verão 2025"
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="description">Descrição *</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descreva o evento..."
              rows={4}
              className="resize-none"
            />
          </div>

          <div className="space-y-2">
            <Label>Categoria *</Label>
            <Select value={category} onValueChange={setCategory} required>
              <SelectTrigger className="h-11">
                <SelectValue placeholder="Selecione a categoria" />
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
            <Label htmlFor="coverImage">Imagem de capa *</Label>
            <Input
              id="coverImage"
              type="url"
              value={coverImage}
              onChange={(e) => setCoverImage(e.target.value)}
              placeholder="URL (https://...) ou envie um arquivo abaixo"
              className="h-11"
            />
            <div className="flex items-center gap-2">
              <input
                ref={coverFileRef}
                type="file"
                accept="image/jpeg,image/png"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file || file.size > 500 * 1024) return;
                  const reader = new FileReader();
                  reader.onload = () => setCoverImage(reader.result as string);
                  reader.readAsDataURL(file);
                  e.target.value = '';
                }}
              />
              <Button type="button" variant="outline" size="sm" onClick={() => coverFileRef.current?.click()}>
                Enviar arquivo (JPEG/PNG, máx. 500 KB)
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="location">Local *</Label>
            <Input
              id="location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="Ex: Arena Fonte Nova"
              className="h-11"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Endereço completo</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Rua, número, bairro, cidade - UF"
              className="h-11"
            />
          </div>

          <div className="flex flex-col-reverse sm:flex-row gap-3 pt-4">
            <Button type="button" variant="outline" asChild className="flex-1 sm:flex-initial">
              <Link to="/produtor">Cancelar</Link>
            </Button>
            <Button type="submit" disabled={createEvent.isPending} className="flex-1 sm:flex-initial">
              {createEvent.isPending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Criando...
                </>
              ) : (
                'Criar evento'
              )}
            </Button>
          </div>
        </form>
      </div>
    </Layout>
  );
}
