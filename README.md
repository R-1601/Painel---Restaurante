# Painel do Restaurante

Caixa, fechamento do dia, relatórios, estoque e contas a pagar para restaurantes. Funciona no celular e no computador.
Cada restaurante cliente tem os próprios dados, isolados no banco.

## Rodar localmente

```bash
npm install
cp .env.example .env   # preencha com a URL e a chave anon do seu projeto Supabase
npm run dev
```

Variáveis (`.env`):

| Variável | Para quê |
|---|---|
| `VITE_SUPABASE_URL` / `VITE_SUPABASE_ANON_KEY` | Projeto Supabase |
| `VITE_SUPORTE_WHATSAPP` (opcional) | Número com DDI/DDD (ex.: `5511999999999`). Mostra o botão "Falar com o suporte" na tela de conta pendente/vencida |
| `VITE_PRECO_MENSAL` (opcional, padrão 29) | Usado no cálculo de receita da aba Admin |

## Banco de dados

As migrations estão em `supabase/migrations`. Aplique em ordem (Supabase CLI: `supabase db push`, ou cole no SQL Editor).
A migration `20261006120000_multi_restaurante_e_seguranca.sql` transforma o app em multi-restaurante e corrige as permissões.
Os dados que já existiam vão para um restaurante "Meu Restaurante", já ativo.

## Como funciona a venda do acesso

1. O dono do restaurante entra em **Criar conta** e informa o nome do restaurante. A conta fica **aguardando ativação**.
2. Você (admin, `robert-fc@outlook.com`) abre **Admin da plataforma** e clica em **Ativar 1 mês**.
3. Todo mês, ao receber o pagamento, clique em **+1 mês**. Se a data de "Pago até" passar, o acesso é bloqueado sozinho e os dados continuam guardados.
4. O dono convida funcionários pelo código em **Restaurante e equipe** e aprova cada um. Funcionários veem só Caixa, Fechamento e Estoque.

## Permissões (resumo)

- Só usuários aprovados, de restaurante ativo e em dia, acessam os dados, e só os do próprio restaurante (RLS no Postgres).
- Perfis e restaurantes não podem ser alterados direto pela API; mudanças passam por funções que checam quem pode fazer o quê.
- O histórico de estoque é só de inserção.
