import { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Camera, ArrowLeft, Check, Loader2 } from 'lucide-react';
import { Layout } from '@/components/layout/Layout';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';
import { graphqlClient } from '@/lib/graphql';
import { MUTATION_UPDATE_PROFILE_PHOTO } from '@/lib/graphql-operations';

const MAX_PHOTO_BYTES = 300 * 1024; // 300 KB

export default function Profile() {
  const navigate = useNavigate();
  const { user, isAuthenticated, updateProfile, refreshUser } = useAuth();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [photoUploading, setPhotoUploading] = useState(false);

  const [name, setName] = useState(user?.name || '');
  const [cpf, setCpf] = useState(user?.cpf || '');
  const [birthDate, setBirthDate] = useState(user?.birthDate || '');
  const [isEditing, setIsEditing] = useState(false);

  if (!isAuthenticated || !user) {
    navigate('/auth');
    return null;
  }

  const formatCpf = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `${numbers.slice(0, 3)}.${numbers.slice(3)}`;
    if (numbers.length <= 9) return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6)}`;
    return `${numbers.slice(0, 3)}.${numbers.slice(3, 6)}.${numbers.slice(6, 9)}-${numbers.slice(9, 11)}`;
  };

  const handleSave = () => {
    updateProfile({ name, cpf, birthDate });
    setIsEditing(false);
    toast({
      title: "Perfil atualizado!",
      description: "Suas informações foram salvas.",
    });
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr);
    return date.toLocaleDateString('pt-BR', { 
      day: '2-digit', 
      month: 'long',
      year: 'numeric' 
    });
  };

  const handlePhotoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const validTypes = ['image/jpeg', 'image/png'];
    if (!validTypes.includes(file.type)) {
      toast({ title: 'Formato inválido', description: 'Use JPEG ou PNG.', variant: 'destructive' });
      return;
    }
    if (file.size > MAX_PHOTO_BYTES) {
      toast({ title: 'Imagem muito grande', description: 'Máximo 300 KB.', variant: 'destructive' });
      return;
    }
    setPhotoUploading(true);
    try {
      const dataUrl = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
      await graphqlClient.request(MUTATION_UPDATE_PROFILE_PHOTO, { photoBase64: dataUrl });
      await refreshUser();
      toast({ title: 'Foto atualizada!', description: 'Sua foto de perfil foi alterada.' });
    } catch {
      toast({ title: 'Erro', description: 'Não foi possível atualizar a foto.', variant: 'destructive' });
    } finally {
      setPhotoUploading(false);
      e.target.value = '';
    }
  };

  return (
    <Layout>
      <div className="container py-5 sm:py-8">
        <button
          onClick={() => navigate('/')}
          className="flex items-center gap-2 text-muted-foreground hover:text-foreground mb-6 transition-colors py-1 -ml-1 min-h-touch"
        >
          <ArrowLeft className="w-4 h-4" />
          <span className="text-sm">Voltar</span>
        </button>

        <div className="max-w-lg mx-auto">
          {/* Profile Card */}
          <div className="bg-card rounded-2xl sm:rounded-3xl shadow-card overflow-hidden">
            {/* Header with gradient */}
            <div className="h-24 sm:h-28 bg-gradient-primary relative">
              <div className="absolute -bottom-10 sm:-bottom-12 left-1/2 -translate-x-1/2">
                <div className="relative">
                  <Avatar className="w-20 h-20 sm:w-24 sm:h-24 border-4 border-card shadow-lg">
                    <AvatarImage src={user.avatar} alt={user.name} />
                    <AvatarFallback className="bg-primary text-primary-foreground text-xl sm:text-2xl font-bold">
                      {user.name?.charAt(0)}
                    </AvatarFallback>
                  </Avatar>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept="image/jpeg,image/png"
                    className="hidden"
                    onChange={handlePhotoChange}
                    disabled={photoUploading}
                  />
                  <button 
                    type="button"
                    className="absolute bottom-0 right-0 w-8 h-8 rounded-full bg-primary text-primary-foreground flex items-center justify-center shadow-soft hover:shadow-elevated transition-shadow min-h-touch min-w-touch disabled:opacity-60"
                    onClick={() => fileInputRef.current?.click()}
                    aria-label="Alterar foto"
                    disabled={photoUploading}
                  >
                    {photoUploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Camera className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="pt-14 sm:pt-16 px-4 sm:px-6 pb-6 sm:pb-8">
              <div className="text-center mb-6">
                <h1 className="font-display text-xl sm:text-2xl font-bold">{user.name}</h1>
                <p className="text-muted-foreground text-sm">{user.email}</p>
              </div>

              <div className="space-y-4 sm:space-y-5">
                <div>
                  <Label htmlFor="name" className="text-sm">Nome Completo</Label>
                  {isEditing ? (
                    <Input
                      id="name"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      className="mt-1.5 h-11"
                    />
                  ) : (
                    <p className="mt-1.5 px-4 py-2.5 bg-muted rounded-lg text-sm sm:text-base">{user.name}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="cpf" className="text-sm">CPF</Label>
                  {isEditing ? (
                    <Input
                      id="cpf"
                      value={cpf}
                      onChange={(e) => setCpf(formatCpf(e.target.value))}
                      maxLength={14}
                      className="mt-1.5 h-11 font-mono"
                    />
                  ) : (
                    <p className="mt-1.5 px-4 py-2.5 bg-muted rounded-lg font-mono text-sm sm:text-base">{user.cpf}</p>
                  )}
                </div>

                <div>
                  <Label htmlFor="birthDate" className="text-sm">Data de Nascimento</Label>
                  {isEditing ? (
                    <Input
                      id="birthDate"
                      type="date"
                      value={birthDate}
                      onChange={(e) => setBirthDate(e.target.value)}
                      className="mt-1.5 h-11"
                    />
                  ) : (
                    <p className="mt-1.5 px-4 py-2.5 bg-muted rounded-lg text-sm sm:text-base">
                      {formatDate(user.birthDate)}
                    </p>
                  )}
                </div>

                <div>
                  <Label className="text-sm">E-mail</Label>
                  <p className="mt-1.5 px-4 py-2.5 bg-muted rounded-lg text-muted-foreground text-sm sm:text-base">
                    {user.email}
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    O e-mail não pode ser alterado
                  </p>
                </div>

                <div className="flex gap-3 pt-3">
                  {isEditing ? (
                    <>
                      <Button 
                        variant="outline" 
                        className="flex-1"
                        onClick={() => {
                          setName(user.name);
                          setCpf(user.cpf);
                          setBirthDate(user.birthDate);
                          setIsEditing(false);
                        }}
                      >
                        Cancelar
                      </Button>
                      <Button className="flex-1" onClick={handleSave}>
                        <Check className="w-4 h-4" />
                        Salvar
                      </Button>
                    </>
                  ) : (
                    <Button className="w-full" onClick={() => setIsEditing(true)}>
                      Editar Perfil
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </Layout>
  );
}
