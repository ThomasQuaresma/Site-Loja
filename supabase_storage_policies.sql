-- Rode DEPOIS de criar manualmente o bucket "documentos_credito" (privado)
-- em Supabase Dashboard > Storage > New bucket

-- Qualquer pessoa com o link do formulário pode enviar (upload) os documentos
create policy "Upload publico de documentos da ficha" on storage.objects
  for insert to anon
  with check (bucket_id = 'documentos_credito');

-- Só usuários logados no painel podem abrir/baixar os documentos enviados
create policy "Leitura de documentos para autenticados" on storage.objects
  for select to authenticated
  using (bucket_id = 'documentos_credito');
