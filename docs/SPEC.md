# Especificação da Plataforma de Venda de Ingressos

**Índice**

1. [Arquitetura existente (base)](#1-arquitetura-existente-base)  
2. [Identificação do publicador do evento](#2-identificação-do-publicador-do-evento)  
3. [Tela de perfil público do produtor](#3-tela-de-perfil-público-do-produtor)  
4. [Upload de foto de perfil (Base64)](#4-upload-de-foto-de-perfil-base64)  
5. [Upload de imagem na criação do evento](#5-upload-de-imagem-na-criaçãoedição-do-evento)  
6. [Janela de escaneamento de QR Codes (Área do produtor)](#6-janela-de-escaneamento-de-qr-codes-área-do-produtor)  
7. [Extensões técnicas GraphQL](#7-extensões-técnicas-graphql-resumo)  
8. [Regras de segurança e consistência](#8-regras-de-segurança-e-consistência)  
9. [Impacto no banco de dados](#9-impacto-no-banco-de-dados-sqlite)  
10. [Resumo da experiência do usuário](#10-resumo-da-experiência-do-usuário-e-fluxos)  
11. [Objetivo final](#11-objetivo-final)

---

## O que já existe vs. o que esta especificação estende

| Área | Já existe | Esta especificação adiciona/estende |
|------|-----------|-------------------------------------|
| API | GraphQL, Go, SQLite, JWT, CORS | Queries de perfil público; mutations de upload Base64; validação com evento e resultado tipado |
| Evento | Detalhe com dados do evento | Bloco “Publicador” (nome + foto clicável) |
| Produtor | Área do produtor (eventos, criar/editar) | Perfil público acessível por link; seção “Validar ingressos” com escaneamento QR |
| Usuário | `User.photoUrl` (URL) | Upload Base64 para foto de perfil; validação e limite (ex.: 300 KB) |
| Evento (capa) | `coverImage` como URL | Upload Base64; prioridade Base64 na exibição; compatibilidade com URL |
| Ingresso | `Ticket.used`, `validateTicket(qrCode)` | `used_at`; validação com `eventId`; apenas dono do evento; auditoria; assinatura do QR |

---

## Visão geral

Plataforma de venda de ingressos com **API GraphQL**, **backend em Go**, **banco SQLite**, separação por domínios e regras de negócio. Este documento descreve a arquitetura existente e as extensões acordadas para identidade de produtores, perfil público, upload de mídia (Base64) e validação de ingressos em tempo real.

---

## 1. Arquitetura existente (base)

### 1.1 Stack

| Camada        | Tecnologia |
|---------------|------------|
| API           | GraphQL (HTTP POST `/graphql`) |
| Backend       | Go (gqlgen, net/http) |
| Banco         | SQLite (arquivo em `api/data/`) |
| Frontend      | React, Vite, Tailwind, shadcn/ui |
| Autenticação  | JWT (Bearer), bcrypt para senhas |

### 1.2 Modelagem de domínios

- **Usuários e produtores:** `users`, `producers` (1:1 por usuário produtor).
- **Eventos:** `events` → `event_dates` → `lots` → `ticket_types`.
- **Vendas:** `orders`, `order_items`, `tickets` (ingressos emitidos após pagamento).

### 1.3 Convenções técnicas

- IDs: UUID (string).
- Datas/horas: armazenadas como texto (SQLite); scalars GraphQL `Date`, `DateTime`.
- CORS configurável por origem; autenticação opcional por rota (queries públicas vs. mutations protegidas).
- Migrações SQL em `api/internal/db/migrations/`; seeds em `api/internal/db/seeds/`.

---

## 2. Identificação do publicador do evento

### 2.1 Requisitos funcionais

Na **tela de detalhes do evento** (página pública do evento):

- Exibir de forma clara:
  - **Nome do publicador** (produtor/organizador).
  - **Foto de perfil do publicador** (ou avatar fallback).
- O publicador deve ser **clicável**, levando ao perfil público do produtor (ver §3).

### 2.2 Dados necessários

- O tipo `Event` já expõe `producer: Producer!` e `Producer` expõe `user: User!`.
- `User` já possui `photoUrl` (a ser estendido para Base64 no §6).
- Nenhuma alteração de schema GraphQL para esta funcionalidade; apenas garantir que as queries de evento (ex.: `event(id)`) retornem `producer { user { id, name, photoUrl } }`.

### 2.3 Frontend

- Na página de detalhe do evento: bloco “Organizado por” (ou “Publicado por”) com avatar, nome e link para `/produtor/:producerId` (ou slug) — rota do perfil público (§3).

---

## 3. Tela de perfil público do produtor

### 3.1 Objetivo

Nova tela acessível ao **clicar no publicador** na página de detalhes do evento.

### 3.2 Conteúdo da tela

- **Foto de perfil** do produtor (via `user.photoUrl`).
- **Nome** do produtor (via `user.name`; opcionalmente exibir `companyName` se existir).
- **Lista de eventos publicados** por esse produtor.

### 3.3 Listagem de eventos

- Exibir **todos os eventos publicados** pelo produtor que **não** estejam em rascunho:
  - **Publicados** e **Pausados:** exibição normal.
  - **Encerrados:** 
    - Aparecer com **coloração cinza** (estilo visual “desativado”).
    - Conter o **rótulo visual “Encerrado”** (ex.: badge).
- Regras:
  - Eventos em **DRAFT** não são exibidos.
  - A listagem deve refletir o status do evento no backend (PUBLISHED, PAUSED, ENDED).

### 3.4 GraphQL

- **Nova query:** `producerPublicProfile(producerId: ID!): ProducerPublicProfile`
  - Retorna dados públicos do produtor (foto, nome, empresa) + lista de eventos (não-draft).
- **Tipo (sugestão):**  
  `type ProducerPublicProfile { producer: Producer!, events: [Event!]! }`  
  ou estender `Producer` com campo `publicEvents: [Event!]!` quando consultado por ID em contexto público.
- Alternativa simples: query `producer(id: ID!): Producer` que, para usuário não-autenticado ou qualquer usuário, retorna apenas dados públicos + eventos com status != DRAFT.

### 3.5 Rota frontend

- Ex.: `/produtor/:producerId` ou `/organizador/:producerId` — página **ProducerPublicProfile** (ou nome equivalente).

---

## 4. Upload de foto de perfil (Base64)

### 4.1 Funcionalidade

- Permitir **upload de foto de perfil** pelo usuário (telas de perfil / configurações).
- A imagem é **convertida para Base64 no frontend** e **persistida no banco como string Base64**.

### 4.2 Requisitos técnicos

- **Tamanho máximo:** ex.: **300 KB** (após conversão Base64, ou equivalente em bytes do arquivo original; definir um limite único e documentar).
- **Formatos:** **JPEG** ou **PNG** (normalização no frontend e validação no backend).
- **Validação e sanitização** antes de persistir (backend): tipo MIME ou assinatura de arquivo, tamanho; rejeitar conteúdo que não seja imagem válida.
- **Campo dedicado no modelo:** o usuário já possui `photoUrl` (string). Semântica estendida:
  - Se a string começar com `data:image/...;base64,`, tratar como imagem Base64 embutida; caso contrário, tratar como URL externa (compatibilidade com dados antigos).

### 4.3 GraphQL

- **Nova mutation:** `updateProfilePhoto(photoBase64: String!): User!`
  - Payload: string Base64 **com** ou **sem** prefixo `data:image/...;base64,` (backend pode normalizar).
  - Validação no resolver: tamanho, formato (JPEG/PNG); em caso de sucesso, atualizar `users.photo_url` (ou o campo que armazenar a foto).
  - Retornar o `User` atualizado (com `photoUrl` preenchido).

### 4.4 Banco de dados

- **Campo:** `users.photo_url` (TEXT) — já existe; passa a aceitar também strings Base64 (com ou sem prefixo data-URI). Nenhuma migração obrigatória se o esquema já suportar texto longo.

---

## 5. Upload de imagem na criação/edição do evento

### 5.1 Objetivo

- Permitir **upload direto da imagem de capa** do evento, além do uso de **link externo**.

### 5.2 Fluxo técnico

- Produtor **seleciona a imagem** no formulário (criação ou edição).
- **Frontend** converte a imagem para Base64 (com limite de tamanho e formato JPEG/PNG).
- **Backend** valida tamanho e formato e armazena a string Base64 no banco (campo de capa do evento).

### 5.3 Regras

- **Compatibilidade:** eventos antigos podem continuar usando **link** (URL) em `coverImage`.
- **Prioridade:** na exibição, **priorizar imagem Base64 quando disponível** (ex.: se `cover_image` começar com `data:image/...;base64,`, usar como src da tag img; senão, usar como URL).

### 5.4 GraphQL e banco

- **Event:** campo `coverImage: String!` já existe; semântica estendida: pode ser URL ou string Base64 (com prefixo data-URI).
- **Inputs:** `CreateEventInput` e `UpdateEventInput` já possuem `coverImage: String`; aceitar tanto URL quanto Base64; validação no resolver (tamanho máximo, ex.: 500 KB; formato JPEG/PNG).
- **Banco:** `events.cover_image` (TEXT) — sem alteração de schema; apenas conteúdo pode ser Base64.

---

## 6. Janela de escaneamento de QR Codes (Área do produtor)

### 6.1 Contexto

- Nova **seção na Área do Produtor** dedicada ao **escaneamento e validação de ingressos** (QR Code).

### 6.2 Seleção de evento para escaneamento

- Listar eventos do produtor com status:
  - **PUBLISHED**
  - **PAUSED** (em andamento)
- **Não** listar DRAFT nem ENDED (ou definir política: apenas PUBLISHED e PAUSED).
- Ao **selecionar um evento**, abrir a **tela de escaneamento** para esse evento.

### 6.3 Tela de escaneamento

- **Componentes:**
  - Nome do evento selecionado.
  - Botão principal: **“Escanear”** (aciona câmera).
  - **Contador de ingressos já escaneados** (validados) nesta sessão.
- Experiência inspirada no fluxo de escaneamento de QR Code do Mercado Livre (entregas): foco em um botão claro e contador visível.

### 6.4 Fluxo técnico de validação

1. **Câmera** do dispositivo é acionada (Web API ou lib de QR no frontend).
2. QR Code é **lido e convertido em string** (payload do QR).
3. Código é **enviado para a API GraphQL** (mutation de validação).
4. **Backend** valida:
   - Existência do ticket (por `qrCode` ou por código assinado).
   - Associação do ticket com o **evento selecionado** (event_id).
   - Status de uso do ingresso (não utilizado).
5. **Caso válido:**
   - Marcar ticket como **utilizado** no banco (`used = 1`, e timestamp de uso se houver campo).
   - Retornar **confirmação de sucesso** (e opcionalmente dados do ticket para feedback na UI).
6. **Caso inválido:**
   - Retornar **erro específico**: já usado, inexistente, evento incorreto (GraphQL errors ou tipo union/erro tipado).

### 6.5 Persistência do contador local

- A **quantidade de tickets escaneados** (validados) na sessão atual:
  - Armazenada em **localStorage** (chave ex.: `ticketScanCount_${eventId}` ou por sessão).
  - **Não** persistida no banco.
  - **Resetada** ao sair da tela (ou ao trocar de evento).

### 6.6 GraphQL (validação)

- **Mutation existente:** `validateTicket(qrCode: String!): Ticket` — estender para:
  - Aceitar **contexto do evento** (ex.: `eventId: ID!`) para garantir que apenas ingressos daquele evento sejam aceitos.
  - Ou manter assinatura e validar no resolver que o ticket pertence a um evento do produtor autenticado; retornar erro se o evento não for o “em foco” na tela (o front envia o eventId e o backend compara).
- **Recomendação:** `validateTicket(eventId: ID!, qrCode: String!): ValidateTicketResult!`  
  - `ValidateTicketResult`: union ou type com `success: Boolean!`, `ticket: Ticket`, `error: String` (código: ALREADY_USED, NOT_FOUND, WRONG_EVENT).

---

## 7. Extensões técnicas GraphQL (resumo)

### 7.1 Novas queries

| Query | Descrição |
|-------|-----------|
| `producerPublicProfile(producerId: ID!)` ou `producer(id: ID!)` | Perfil público do produtor + eventos publicados (excl. DRAFT). |
| (Opcional) `eventsByProducer(producerId: ID!)` | Listagem de eventos por produtor (status != DRAFT). Pode ser parte do `producerPublicProfile`. |

### 7.2 Novas mutations

| Mutation | Descrição |
|----------|-----------|
| `updateProfilePhoto(photoBase64: String!): User!` | Upload de foto de perfil (Base64). |
| (Opcional) `updateEventCover(eventId: ID!, coverBase64: String!): Event!` | Upload de capa do evento em Base64. Alternativa: usar `updateEvent` com `coverImage` em Base64. |
| Validação de ticket | Estender `validateTicket` para aceitar `eventId` e retornar resultado tipado (sucesso/erro). |

### 7.3 Tipos sugeridos (extensões)

- `ProducerPublicProfile { producer: Producer!, events: [Event!]! }`
- `ValidateTicketResult { success: Boolean!, ticket: Ticket, errorCode: String, message: String }`  
  Ou `ValidateTicketPayload` com campos opcionais para sucesso vs. erro.

---

## 8. Regras de segurança e consistência

### 8.1 Escaneamento de ingressos

- **Apenas o produtor dono do evento** pode escanear/validar ingressos daquele evento.
  - No resolver `validateTicket`: obter `eventId` do ticket; verificar se o produtor autenticado é o `producer_id` do evento.
- **QR Codes** devem conter **assinatura criptográfica** (ex.: payload assinado com HMAC ou JWT interno) para evitar falsificação; validação no backend antes de marcar como usado.
- **Cada ingresso pode ser validado apenas uma vez** (campo `used`; atualização atômica).
- **Operação de validação** deve ser **transacional** (uma única transação: leitura do ticket, checagens, update `used` e `used_at` se existir).
- **Logs de validação** devem ser mantidos para auditoria (ex.: tabela `ticket_validations` com ticket_id, producer_id, event_id, validated_at, IP ou request_id).

### 8.2 Upload de mídia

- Validar **tamanho** e **tipo** (JPEG/PNG) no backend; rejeitar payloads malformados ou excessivamente grandes.
- Foto de perfil e capa de evento: apenas o **próprio usuário** (perfil) ou o **produtor dono do evento** (capa) podem atualizar.

---

## 9. Impacto no banco de dados (SQLite)

### 9.1 Novos campos / alterações

| Tabela   | Campo        | Tipo   | Descrição |
|----------|--------------|--------|-----------|
| `users`  | `photo_url`  | TEXT   | Já existe; passa a aceitar Base64 (data-URI ou raw). |
| `events` | `cover_image`| TEXT   | Já existe; passa a aceitar Base64 (data-URI ou raw). |
| `tickets`| `used_at`    | TEXT   | **Novo** — timestamp de uso do ingresso (ISO 8601 ou datetime SQLite). |

### 9.2 Nova tabela (auditoria de validação)

| Tabela (ex.: `ticket_validations`) | Descrição |
|------------------------------------|-----------|
| `id` (TEXT PK)                     | UUID. |
| `ticket_id` (TEXT FK → tickets)    | Ingresso validado. |
| `event_id` (TEXT FK → events)       | Evento no qual foi validado. |
| `producer_id` (TEXT FK → producers)| Produtor que validou. |
| `validated_at` (TEXT)              | Data/hora da validação. |
| (Opcional) `request_id` / `ip`     | Rastreabilidade. |

### 9.3 Migração

- Criar **nova migração** (ex.: `0002_producer_identity_and_validation.sql`):
  - `ALTER TABLE tickets ADD COLUMN used_at TEXT;`
  - `CREATE TABLE ticket_validations (...);`
  - Índices conforme necessidade (ex.: `ticket_id`, `event_id`, `validated_at`).

---

## 10. Resumo da experiência do usuário e fluxos

- **Detalhe do evento:** exibe publicador (foto + nome) clicável → **Perfil público do produtor** com lista de eventos (ativos e encerrados, com rótulo “Encerrado” em cinza).
- **Perfil do usuário:** upload de foto de perfil (Base64); exibição em header e perfis.
- **Criação/edição de evento:** upload de imagem de capa (Base64) ou link; prioridade Base64 na exibição.
- **Área do produtor:** nova seção “Validar ingressos” → seleção de evento (PUBLISHED/PAUSED) → tela de escaneamento (nome do evento, botão “Escanear”, contador em localStorage) → validação via API → feedback de sucesso/erro; contador resetado ao sair.

---

## 11. Objetivo final

Expandir a plataforma para um **nível operacional completo**, incluindo:

- **Identidade de produtores** na página do evento e perfil público.
- **Perfil público** do produtor com listagem de eventos (sem rascunhos).
- **Upload de mídia** (foto de perfil e capa de evento) em Base64, com validação e limites.
- **Validação de ingressos** em tempo real na área do produtor, com segurança (dono do evento, assinatura do QR, uso único, transação, auditoria).

Tudo mantendo a **arquitetura existente** (API GraphQL, Go, SQLite, separação por domínios), **padronização técnica** e **escalabilidade** para evolução futura.
