

# Plano: Realtime Robusto + Persistencia de Bancada

## Problema 1: Realtime Inconsistente

Os hooks atuais (`useQueueDrivers`, `useActiveBenches`, `useVolumosos`) ja possuem listeners realtime, mas faltam:
- Tratamento de reconexao quando o websocket cai
- Callback de status do canal para detectar desconexoes
- Alguns hooks ainda usam polling com `setInterval` (3s), o que pode causar conflitos

### Solucao

Criar um hook utilitario `useRealtimeSubscription` que centraliza:
- Subscribe com callback de status (`SUBSCRIBED`, `CHANNEL_ERROR`, `TIMED_OUT`, `CLOSED`)
- Reconexao automatica com retry exponencial quando o canal cai
- Re-fetch completo de todas as queries ao reconectar
- Remover todos os `setInterval` de polling (causa de travamentos anteriores)

Refatorar os 3 hooks para usar esse utilitario.

## Problema 2: Bancada Trava Apos Refresh

Hoje a tabela `active_benches` so tem `bench_number` e `created_at`. Nao ha como saber QUEM esta usando a bancada, entao ao dar refresh, o usuario perde o acesso.

### Solucao

**Migracoes no banco de dados:**

1. Recriar a tabela `active_benches` com a estrutura:

```text
active_benches
+----------------+------------------------+------------------+
| bench_number   | session_id (text)      | last_seen        |
| (PK, integer)  | (not null)             | (timestamptz)    |
+----------------+------------------------+------------------+
```

- `session_id`: identificador unico gerado por aba do navegador (UUID salvo em `sessionStorage`)
- `last_seen`: atualizado a cada 10 segundos via heartbeat

2. Criar funcao SQL `cleanup_stale_benches()` que libera bancadas com `last_seen` > 60 segundos. Sera chamada antes de listar bancadas ativas.

3. Atualizar politicas RLS para permitir operacoes publicas na nova estrutura.

**Alteracoes no codigo:**

1. **`useActiveBenches.ts`** - Refatorar completamente:
   - Gerar `session_id` via `sessionStorage` (persiste por aba, morre ao fechar)
   - No `claimBench`: salvar `session_id` junto com o `bench_number`
   - Heartbeat a cada 10s: `UPDATE active_benches SET last_seen = now() WHERE session_id = ?`
   - Chamar `cleanup_stale_benches()` antes de cada fetch para limpar bancadas abandonadas

2. **`Bancada.tsx`** - Adicionar reconexao automatica:
   - Ao montar, verificar se ja existe bancada ativa para o `session_id` atual
   - Se existir, reconectar automaticamente (setar `benchNumber` sem precisar selecionar de novo)
   - Isso resolve 100% o problema do refresh

## Detalhes Tecnicos

### Hook `useRealtimeSubscription`

```text
useRealtimeSubscription(table, callback)
  - Cria canal com nome unico
  - Monitora status: SUBSCRIBED, CHANNEL_ERROR, TIMED_OUT, CLOSED
  - Em caso de erro/timeout: remove canal, espera 2s, re-subscribe
  - Ao reconectar com sucesso: executa callback (re-fetch)
  - Cleanup no unmount
```

### Fluxo de Reconexao de Bancada

```text
1. Usuario abre /bancada
2. Verifica sessionStorage por session_id (cria se nao existe)
3. Consulta active_benches WHERE session_id = meu_id
4. Se encontrar: reconecta automaticamente a essa bancada
5. Se nao encontrar: mostra tela de selecao normal
6. Heartbeat a cada 10s atualiza last_seen
7. Cleanup automatico remove bancadas com last_seen > 60s
```

### Arquivos Modificados

| Arquivo | Alteracao |
|---------|-----------|
| Migracao SQL | Recriar `active_benches` com `session_id` e `last_seen`; criar `cleanup_stale_benches()` |
| `src/hooks/useRealtimeSubscription.ts` | Novo hook centralizado de realtime com reconexao |
| `src/hooks/useActiveBenches.ts` | Refatorar para usar `session_id`, heartbeat e cleanup |
| `src/hooks/useQueueDrivers.ts` | Usar `useRealtimeSubscription`, remover polling |
| `src/hooks/useVolumosos.ts` | Usar `useRealtimeSubscription`, remover polling |
| `src/pages/Bancada.tsx` | Auto-reconexao ao montar baseada em `session_id` |

