/* =========================================================
   CHAVE GERAL DO SITE
   ---------------------------------------------------------
   lojaOnline: false  -> só o site institucional fica no ar
                         (Início, A Empresa, Localização).
                         Catálogo, ficha de crédito e painel
                         admin redirecionam pro início e o
                         Supabase não é chamado.
   lojaOnline: true   -> religa tudo. Antes de religar, veja
                         docs/REVISAO.md (o Supabase do plano
                         grátis pausa sem acesso e precisa ser
                         reativado no dashboard).
   ========================================================= */
window.SITE_CONFIG = {
    lojaOnline: false
};

(function () {
    var html = document.documentElement;

    // Elementos com data-loja="on" só aparecem com a loja ligada;
    // data-loja="off" só aparecem com ela desligada.
    var estilo = document.createElement('style');
    estilo.textContent =
        'html.loja-off [data-loja="on"]{display:none!important}' +
        'html:not(.loja-off) [data-loja="off"]{display:none!important}' +
        'html.loja-off[data-requer-loja] body{display:none!important}';
    document.head.appendChild(estilo);

    if (window.SITE_CONFIG.lojaOnline) return;

    html.classList.add('loja-off');

    // Páginas que dependem do Supabase marcam <html data-requer-loja="caminho-do-inicio">
    var inicio = html.getAttribute('data-requer-loja');
    if (inicio !== null) window.location.replace(inicio || '/');
})();
