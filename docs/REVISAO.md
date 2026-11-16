# Revisão do site e estado da loja online

Revisão feita em 16/11/2026, quando a parte online (catálogo, ficha de crédito e
painel admin) foi desligada e só o site institucional ficou no ar.

## Estado atual: loja desligada

A chave fica em [`script/config.js`](../script/config.js):

```js
window.SITE_CONFIG = {
    lojaOnline: false
};
```

Com `lojaOnline: false`:

- Ficam no ar só **Início**, **A Empresa** e **Localização**.
- Os links de **Produtos** (menu e rodapé) ficam escondidos. No banner do início, o
  botão "Ver catálogo completo" dá lugar a "Solicite um orçamento" (WhatsApp).
- `html/catalogo.html`, `html/cadastro-cliente.html` e `admin.html` redirecionam
  para o início.
- Os scripts `catalogo.js`, `cadastro-cliente.js` e `admin.js` não conectam no
  Supabase.

Motivo: o Supabase do plano grátis pausa o projeto depois de um período sem
acesso, e aí o catálogo aparecia quebrado pra quem abrisse o site.

### Como funciona por dentro

- `data-loja="on"` em qualquer elemento: ele só aparece com a loja ligada.
- `data-loja="off"`: só aparece com a loja desligada.
- `<html data-requer-loja="caminho-do-inicio">`: a página depende do Supabase e
  redireciona para o caminho indicado quando a loja está desligada.

## Como religar

1. No dashboard do Supabase, confirme que o projeto está ativo. Se estiver pausado,
   use **Restore project**. Projetos pausados por muito tempo podem perder a opção
   de restaurar; nesse caso é preciso criar um projeto novo, rodar os SQL deste
   repositório e trocar `supabaseUrl`/`supabaseKey` nos três scripts.
2. Antes de religar, corrija pelo menos os itens 1 e 2 da lista abaixo.
3. Mude `lojaOnline` para `true` em `script/config.js`, faça commit e push.

## Pontos encontrados na revisão

### Segurança

1. **Qualquer conta logada lê todas as fichas e documentos.** As regras (RLS) de
   `solicitacoes_credito` e do bucket `documentos_credito` liberam leitura, edição
   e exclusão para qualquer usuário `authenticated`. Se o cadastro por e-mail do
   Supabase estiver ligado (vem ligado por padrão), qualquer pessoa cria uma conta
   com a chave pública e acessa tudo. Conferir em *Authentication > Sign In /
   Providers* que "Allow new users to sign up" está desligado, ou restringir as
   regras a uma lista de admins.
2. **O público pode enviar uma ficha já aprovada.** A regra de insert para `anon`
   é `with check (true)`, então pela API dá para mandar `status: 'aprovado'` com
   limite preenchido. A regra deve exigir `status = 'pendente'` e os campos de
   análise (`limite_aprovado`, `prazo_aprovado`, `parecer` etc.) nulos.
3. **Upload público sem limite.** O bucket `documentos_credito` aceita qualquer
   arquivo, de qualquer tamanho e tipo, sem captcha. Definir limite de tamanho e
   tipos permitidos (PDF/imagem) no bucket.
4. **Regras de `produtos`, `categorias` e `especificacoes` não estão no
   repositório.** Confirmar que só admin escreve nelas. Isso importa porque
   `catalogo.js` monta os cards com `innerHTML` sem escapar título, código e
   descrição.

### Funcionamento

5. **Editar produto pode apagar as medidas** (`admin.js`, `processarSubmissao`):
   as especificações são apagadas e depois reinseridas. Se a reinserção falhar, o
   produto fica sem nenhuma, e o erro da exclusão não é verificado.
6. **`confirm()` nativo** ao excluir solicitação (`excluirSolicitacao`). Trocar
   por um modal próprio, como os avisos já fazem.
7. **Fotos antigas nunca são apagadas** do bucket `imagens_catalogo` quando o
   produto troca de imagem.
8. **Imagem reserva do catálogo usa `via.placeholder.com`**, que pode não estar
   mais no ar. Trocar por uma imagem do próprio repositório.
9. **Service worker (`sw.js`)** serve o painel sempre do cache, com nome fixo
   `precisa-admin-v1`. O registro está comentado em `admin.html`; se for religado,
   trocar para "rede primeiro" e versionar o cache.

### Sobras

10. `admin/config.yml` é resto do Decap CMS e não é usado.
11. A coluna `embalagem` é gravada sempre como `'1'` só para não quebrar a tabela.
