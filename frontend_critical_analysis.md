# ORACULUM FRONTEND - CRITICAL ANALYSIS & HANDOVER (v2)

**Data:** 2026-01-08
**Contexto:** Pós-implementação da estrutura base, autenticação e layout.

---

## 1. Sumário Executivo
A fundação do Frontend (`apps/web`) foi estabelecida focando na robustez necessária para um "Produto de Gestão". A infraestrutura crítica de autenticação e navegação está funcional e segue as melhores práticas do Next.js 15 (App Router). O sistema está pronto para receber as implementações complexas de regras de negócio.

---

## 2. Decisões Arquiteturais & Crítica

### A. Navegação Persistente (Cookie-based Sidebar)
*   **Implementação:** Estado aberto/fechado da Sidebar é salvo em cookies (`sidebar:state`) e lido no render inicial do servidor (`layout.tsx`).
*   **Análise:** Essencial para evitar *Layout Shift* (FOUC) durante a navegação ou recarregamento. Diferencia a aplicação de ferramentas amadoras onde a UI "pisca".
*   **Estado:** ✅ **Sólido**.

### B. Autenticação Híbrida (Server Actions + JWT)
*   **Implementação:**
    *   **Login:** `server action` atua como proxy, recebendo credenciais e definindo o cookie `auth-token` como `httpOnly` via servidor.
    *   **Cliente:** Interceptor Axios injeta o token automaticamente em requisições client-side.
*   **Análise:** Maximiza a segurança (token invisível ao JS via cookie httpOnly) enquanto mantém a flexibilidade para o cliente.
*   **Ponto de Atenção:** O interceptor atual lê `document.cookie`. Para *Server Components* que precisem buscar dados, será necessário um padrão de extração de cookies via `next/headers` manual ou um cliente HTTP dedicado ao servidor.
*   **Estado:** 🟡 **Funcional, mas requer padrão para Server-Side Fetching.**

### C. Componentização (Shadcn/UI "Open Code")
*   **Implementação:** Componentes instalados em `src/components/ui`. Sidebar customizada em `src/components/app-sidebar.tsx`.
*   **Análise:** A natureza de "código aberto" dos componentes permitiu customização rápida da Sidebar sem lutar contra abstrações de bibliotecas fechadas.
*   **Estado:** ✅ **Sólido e Escalável.**

---

## 3. Status Técnico Atual

| Módulo | Estado | Observações / Dívidas Técnicas |
| :--- | :--- | :--- |

| **Setup & Config** | 🟢 Completo | Tailwind v4, Shadcn, TypeScript Strict. |
| **Infra HTTP** | 🟢 Completo | Client-side & Server-side (`server-api.ts`) prontos. |
| **Autenticação** | 🟢 Completo | Login Flow, Logout, Proteção de rotas, Admin User. |
| **Dashboard UI** | 🟢 Completo | Layout, Sidebar, Home. |
| **Páginas Internas** | 🟢 Completo | `/oraculum` (Chat Mock), `/library` (DataTable), `/history` (Audit). |

---

## 4. Próximos Passos (Roteiro futuro)

O Frontend Core está finalizado. O foco agora deve mudar para integração real com o Backend e regras de negócio:

1.  **Integração Real com IA (Backend):**
    *   Substituir o Mock em `api/chat/route.ts` pela chamada real ao serviço `Oraculum` do NestJS.
    *   Implementar streaming real via Server-Sent Events ou WebSockets se necessário.

2.  **Persistência de Dados (CRUD):**
    *   Conectar a página `/library` aos endpoints reais de Library (`GET /library`, `POST /library`).
    *   Conectar `/history` aos logs reais do sistema.

3.  **Refinamento de UX:**
    *   Melhorar tratamento de erros (Toasts).
    *   Adicionar confirmações de exclusão (Dialogs).

---

## 5. Notas de Migração de Contexto (Para a Próxima IA)

**ATENÇÃO:** Detalhes cruciais para manter a estabilidade do sistema:

1.  **Vercel AI SDK v6+:**
    *   A versão mais recente separa os hooks React em `@ai-sdk/react`. **Não importe de `ai/react`**, isso quebrará o build.
    *   O hook `useChat` requer tratamento defensivo no input (`input || ''`) para evitar erros em tempo de execução ("trim is not a function").

2.  **Serialização em Server Components:**
    *   **NUNCA** defina colunas de `DataTable` (`columns`) dentro de `page.tsx` se elas contiverem funções (ex: `cell: ({ row }) => ...`).
    *   O Next.js não consegue serializar funções do Servidor para o Cliente.
    *   **Solução:** Extraia a definição da tabela para um Client Component (e.g., `_components/history-table.tsx`) e passe apenas os dados puros (JSON) do Server Component.

3.  **Roteamento:**
    *   A estrutura de pastas usa `src/app/dashboard` (explícito), não `(dashboard)`. Isso foi corrigido para alinhar com o middleware e sidebar.

4.  **Backend Mock vs Real:**
    *   `api/chat/route.ts` é mock.
    *   O backend NestJS roda na porta 3000. Use `createServerApi` em Server Components para chamá-lo com cookies.
