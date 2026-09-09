-- Rode este script no SQL Editor do seu projeto Supabase
-- (https://supabase.com/dashboard/project/qsdosnxvlzkhgdpbwlbo/sql/new)

-- Tabela principal: Ficha Cadastral e Solicitação de Crédito
create table if not exists solicitacoes_credito (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),

  -- 1. Dados da Empresa
  razao_social text not null,
  nome_fantasia text,
  cnpj text not null,
  data_fundacao date,
  endereco text,
  bairro text,
  cidade text,
  uf text,
  cep text,
  telefone text,
  email text,
  site text,
  segmento_atividade text,
  inscricao_estadual text,
  qtd_funcionarios text,
  responsavel_compras text,
  cargo_compras text,
  email_financeiro text,
  telefone_financeiro text,
  responsavel_legal text,
  cargo_responsavel_legal text,
  contato_responsavel_legal text,

  -- 2. Solicitação de Crédito e Condições de Pagamento
  limite_credito_pretendido text,
  volume_medio_mensal text,
  finalidade_compras text,
  prazo_pagamento_pretendido text,
  forma_pagamento_habitual text,

  -- 3. Referências Comerciais (até 3 fornecedores)
  referencias jsonb,

  -- 4. Histórico de Pagamento
  possui_compras_faturadas text,
  atrasos_relevantes text,
  protestos_pendencias text,

  -- 5. Documentos (caminhos no Storage, bucket privado)
  doc_cartao_cnpj text,
  doc_contrato_social text,
  doc_documento_responsavel text,
  doc_comprovante_endereco text,
  doc_dados_bancarios text,

  -- 6. Autorização
  nome_responsavel_autorizacao text not null,
  aceite_autorizacao boolean not null default false,
  data_autorizacao date,

  -- 7. Uso Interno — preenchido pelo analista da Precisa Elétrica
  status text not null default 'pendente', -- pendente | aprovado | reprovado
  data_analise date,
  referencias_contatadas text,
  limite_aprovado text,
  prazo_aprovado text,
  parecer text,
  observacoes text,
  analista_responsavel text
);

alter table solicitacoes_credito enable row level security;

-- Qualquer pessoa com o link pode enviar a ficha (cadastro público, mas não listado no menu)
create policy "Permitir envio publico da ficha" on solicitacoes_credito
  for insert to anon with check (true);

-- Só usuários logados no painel (admin.html) podem ver a lista de solicitações
create policy "Permitir leitura para autenticados" on solicitacoes_credito
  for select to authenticated using (true);

-- Só usuários logados podem registrar a análise de crédito
create policy "Permitir atualizacao (analise) para autenticados" on solicitacoes_credito
  for update to authenticated using (true) with check (true);

-- Só usuários logados podem excluir solicitações
create policy "Permitir exclusao para autenticados" on solicitacoes_credito
  for delete to authenticated using (true);

-- Bucket de armazenamento privado para os documentos anexados na ficha
insert into storage.buckets (id, name, public)
values ('documentos_credito', 'documentos_credito', false)
on conflict (id) do nothing;

-- Qualquer pessoa com o link do formulário pode enviar (upload) os documentos
create policy "Upload publico de documentos da ficha" on storage.objects
  for insert to anon
  with check (bucket_id = 'documentos_credito');

-- Só usuários logados no painel podem abrir/baixar os documentos enviados
create policy "Leitura de documentos para autenticados" on storage.objects
  for select to authenticated
  using (bucket_id = 'documentos_credito');
