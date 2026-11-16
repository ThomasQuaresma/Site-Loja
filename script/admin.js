const supabaseUrl = 'https://qsdosnxvlzkhgdpbwlbo.supabase.co'; 
const supabaseKey = 'sb_publishable_fnQn-RRq6tRXDwTcgZ0--w_zzA32rai';

let clienteDB = null; 
let produtosCarregados = [];
let produtoIdEmEdicao = null; 
let imagemUrlAntiga = null;

document.addEventListener("DOMContentLoaded", () => { 
    // Loja desligada em script/config.js: não conecta no Supabase.
    if (!window.SITE_CONFIG || !window.SITE_CONFIG.lojaOnline) return;
    try { 
        if (window.supabase) { 
            clienteDB = window.supabase.createClient(supabaseUrl, supabaseKey); 
            configurarOuvinteDeSessao();
            verificarSessao(); 
            configurarEventosGerais();
        } else {
            console.error("Erro: SDK do Supabase não encontrado no HTML.");
        }
    } catch (erro) { 
        console.error("Erro na inicialização:", erro); 
    }
});

// =========================================
// MÓDULO DE SEGURANÇA E AUTENTICAÇÃO
// =========================================

function configurarOuvinteDeSessao() {
    clienteDB.auth.onAuthStateChange((evento, sessao) => {
        const painelAdmin = document.getElementById('painelAdmin');
        const loginContainer = document.getElementById('loginContainer');
        
        if (evento === 'SIGNED_OUT' || !sessao) {
            if(painelAdmin) painelAdmin.style.display = 'none';
            if(loginContainer) loginContainer.style.display = 'block';
        }
    });
}

async function verificarSessao() { 
    const { data: { session }, error } = await clienteDB.auth.getSession();
    
    const painelAdmin = document.getElementById('painelAdmin');
    const loginContainer = document.getElementById('loginContainer');

    if (error || !session) {
        if(painelAdmin) painelAdmin.style.display = 'none';
        if(loginContainer) loginContainer.style.display = 'block';
        return false;
    }

    if(loginContainer) loginContainer.style.display = 'none';
    if(painelAdmin) painelAdmin.style.display = 'block';
    
    await inicializarSistema();
    return true;
}

async function fazerLogin() { 
    const emailInput = document.getElementById("emailLogin");
    const senhaInput = document.getElementById("senhaLogin");
    const btn = document.getElementById("btnEntrar");
    
    if(!emailInput || !senhaInput) {
        mostrarAviso("Erro: Campos de login não encontrados.", "erro");
        return;
    }
    
    const email = emailInput.value; 
    const senha = senhaInput.value; 

    if (!email || !senha) {
        mostrarAviso("Preencha todos os campos.", "aviso");
        return;
    }

    btn.innerText = "Autenticando...";
    btn.disabled = true;

    const { error } = await clienteDB.auth.signInWithPassword({
        email: email,
        password: senha
    });

    if(error) {
        mostrarAviso("Acesso negado. Verifique as credenciais.", "erro");
        btn.innerText = "Acessar Painel";
        btn.disabled = false;
    } else {
        verificarSessao();
    }
}

async function fazerLogout() { 
    await clienteDB.auth.signOut(); 
    window.location.reload(); 
}

// =========================================
// CONFIGURAÇÃO DOS EVENTOS DA TELA
// =========================================

function configurarEventosGerais() {
    adicionarLinhaEspecificacaoBlindada('', '');
    configurarUploadFoto();
    configurarAbasAdmin();

    const btnEntrar = document.getElementById("btnEntrar");
    if (btnEntrar) btnEntrar.addEventListener("click", fazerLogin);

    const btnSair = document.getElementById("btnSair");
    if (btnSair) btnSair.addEventListener("click", fazerLogout);
    
    const btnAddSpec = document.getElementById("btnAddSpec");
    if (btnAddSpec) {
        btnAddSpec.addEventListener("click", () => adicionarLinhaEspecificacaoBlindada('', ''));
    }
    
    const containerSpecs = document.getElementById("especificacoesContainer");
        if (containerSpecs) {
            containerSpecs.addEventListener("click", function(event) {
                const linha = event.target.closest(".spec-row");
                if (!linha) return;

                // Função de Remover
                if (event.target.classList.contains("btn-remove-spec")) {
                    linha.remove();
                }
                // Função de Subir
                else if (event.target.classList.contains("btn-move-up")) {
                    const anterior = linha.previousElementSibling;
                    if (anterior) {
                        linha.parentNode.insertBefore(linha, anterior);
                    }
                }
                // Função de Descer
                else if (event.target.classList.contains("btn-move-down")) {
                    const proximo = linha.nextElementSibling;
                    if (proximo) {
                        // O insertBefore insere ANTES do próximo do próximo (ou seja, inverte as posições)
                        linha.parentNode.insertBefore(proximo, linha);
                    }
                }
            });
    }

    const containerLista = document.getElementById("listaProdutosAdmin");
    if (containerLista) {
        containerLista.addEventListener("click", function(event) {
            const btnEditar = event.target.closest(".btn-editar-produto");
            if (btnEditar) {
                const idDoProduto = btnEditar.getAttribute("data-id");
                prepararEdicao(idDoProduto);
            }
        });
    }

    const formProduto = document.getElementById("formProduto");
    if (formProduto) formProduto.addEventListener("submit", processarSubmissao);

    const btnCancelarEdicao = document.getElementById("btnCancelarEdicao");
    if (btnCancelarEdicao) {
        btnCancelarEdicao.addEventListener("click", limparFormulario);
    }

    const btnCriarCategoria = document.getElementById("btnCriarCategoria");
    if (btnCriarCategoria) {
        btnCriarCategoria.addEventListener("click", criarNovaCategoria);
    }
}

function configurarAbasAdmin() {
    const botoes = document.querySelectorAll(".admin-tab-btn");
    botoes.forEach(botao => {
        botao.addEventListener("click", () => {
            botoes.forEach(b => b.classList.remove("ativo"));
            botao.classList.add("ativo");

            document.querySelectorAll(".admin-tab-painel").forEach(painel => {
                painel.style.display = painel.id === botao.dataset.tab ? "block" : "none";
            });
        });
    });
}

// =========================================
// MÓDULO DE GESTÃO E PRODUTOS
// =========================================

async function inicializarSistema() {
    await carregarCategorias();
    await carregarListaAdmin();
    await carregarListaClientes();
}

async function carregarCategorias() { 
    if (!clienteDB) return; 
    const select = document.getElementById("categoria");
    if (!select) return;

    try {
        const { data, error } = await clienteDB.from('categorias').select('*').order('nome', { ascending: true });
        if (error) throw error;
        
        select.innerHTML = '<option value="" disabled selected>Selecione uma categoria...</option>';
        data.forEach(cat => {
            const option = document.createElement("option");
            option.value = cat.nome;
            option.textContent = cat.nome;
            select.appendChild(option);
        });
    } catch (erro) {
        console.error("Erro ao carregar categorias:", erro);
        select.innerHTML = '<option value="" disabled selected>Erro ao carregar categorias</option>';
    }
}

async function criarNovaCategoria() {
    const input = document.getElementById("inputNovaCategoria");
    const btn = document.getElementById("btnCriarCategoria");
    
    if (!input || !btn) {
        console.error("Erro: Campos de nova categoria não encontrados no HTML.");
        return; 
    }

    let nomeCategoria = input.value.trim().toUpperCase();

    if (!nomeCategoria) {
        mostrarAviso("Por favor, digite o nome da nova categoria.", "aviso");
        return;
    }

    btn.innerText = "A gravar...";
    btn.disabled = true;

    try {
        const { error } = await clienteDB.from('categorias').insert([{ nome: nomeCategoria }]);
        if (error) throw error;

        input.value = "";
        mostrarAviso("Categoria adicionada com sucesso!", "sucesso");
        await carregarCategorias();
    } catch (erro) {
        console.error("Erro ao gravar categoria:", erro);
        mostrarAviso("Erro ao criar categoria: " + erro.message, "erro");
    } finally {
        btn.innerText = "Adicionar Rápido";
        btn.disabled = false;
    }
}

async function carregarListaAdmin() {
    if (!clienteDB) return;
    const container = document.getElementById("listaProdutosAdmin");
    if (!container) return;

    try {
        const { data: produtos, error } = await clienteDB
            .from('produtos')
            .select(`*, especificacoes (*)`)
            .order('created_at', { ascending: false });

        if (error) throw error;

        produtosCarregados = produtos; 
        container.innerHTML = '';

        if (produtos.length === 0) {
            container.innerHTML = '<p>Nenhum produto cadastrado ainda.</p>';
            return;
        }

        produtos.forEach(prod => {
            const divItem = document.createElement("div");
            divItem.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 15px; border: 1px solid #ddd; border-radius: 8px; background: #fafafa;";

            const divInfo = document.createElement("div");
            
            const tituloProd = document.createElement("strong");
            tituloProd.textContent = prod.titulo;
            
            // Etiqueta visual de produto oculto
            const badgeOculto = prod.visivel === false ? '<span style="color: #ef4444; font-size: 0.75rem; margin-left: 10px; font-weight: bold;">[OCULTO]</span>' : '';
            tituloProd.innerHTML += badgeOculto;
            
            const catProd = document.createElement("span");
            catProd.style.cssText = "font-size: 0.85rem; color: #666;";
            catProd.textContent = ` (${prod.categoria})`;
            
            const quebraLinha = document.createElement("br");
            
            const qtdMedidas = document.createElement("span");
            qtdMedidas.style.cssText = "font-size: 0.85rem;";
            qtdMedidas.textContent = `${prod.especificacoes ? prod.especificacoes.length : 0} medida(s)`;

            divInfo.appendChild(tituloProd);
            divInfo.appendChild(catProd);
            divInfo.appendChild(quebraLinha);
            divInfo.appendChild(qtdMedidas);

            const btnEditar = document.createElement("button");
            btnEditar.type = "button";
            btnEditar.className = "btn-submit btn-editar-produto";
            btnEditar.setAttribute("data-id", prod.id);
            btnEditar.style.cssText = "width: auto; padding: 8px 15px; font-size: 0.9rem;";
            btnEditar.textContent = "Editar";

            divItem.appendChild(divInfo);
            divItem.appendChild(btnEditar);
            
            container.appendChild(divItem);
        });
        
    } catch (erro) {
        console.error("Erro ao carregar lista:", erro);
        container.innerHTML = '<p>Erro ao carregar os produtos.</p>';
    }
}

// =========================================
// MÓDULO DE GESTÃO DE SOLICITAÇÕES DE CRÉDITO
// =========================================

let solicitacoesCarregadas = [];

const ROTULOS_STATUS = { pendente: "Pendente", aprovado: "Aprovado", reprovado: "Reprovado" };

const ROTULOS_DOCUMENTOS = {
    doc_cartao_cnpj: "Cartão CNPJ",
    doc_contrato_social: "Contrato Social",
    doc_documento_responsavel: "Documento do Responsável",
    doc_comprovante_endereco: "Comprovante de Endereço",
    doc_dados_bancarios: "Dados Bancários"
};

async function carregarListaClientes() {
    if (!clienteDB) return;
    const container = document.getElementById("listaClientesAdmin");
    if (!container) return;

    try {
        const { data: solicitacoes, error } = await clienteDB
            .from('solicitacoes_credito')
            .select('*')
            .order('created_at', { ascending: false });

        if (error) throw error;

        solicitacoesCarregadas = solicitacoes;
        container.innerHTML = '';

        if (solicitacoes.length === 0) {
            container.innerHTML = '<p>Nenhuma solicitação recebida ainda.</p>';
            return;
        }

        solicitacoes.forEach(sol => container.appendChild(criarCardSolicitacao(sol)));

    } catch (erro) {
        console.error("Erro ao carregar solicitações:", erro);
        container.innerHTML = '<p>Erro ao carregar as solicitações.</p>';
    }
}

function criarCardSolicitacao(sol) {
    const card = document.createElement("div");
    card.style.cssText = "border: 1px solid #ddd; border-radius: 8px; background: #fafafa; overflow: hidden;";

    const cabecalho = document.createElement("div");
    cabecalho.style.cssText = "display: flex; justify-content: space-between; align-items: center; padding: 15px; gap: 15px; cursor: pointer;";

    const divInfo = document.createElement("div");

    const nomeEmpresa = document.createElement("strong");
    nomeEmpresa.textContent = sol.razao_social + (sol.nome_fantasia ? ` (${sol.nome_fantasia})` : '');

    const contato = document.createElement("div");
    contato.style.cssText = "font-size: 0.85rem; color: #444; margin-top: 4px;";
    contato.textContent = `CNPJ: ${sol.cnpj || '-'} · ${sol.email || '-'} · ${sol.telefone || '-'}`;

    divInfo.appendChild(nomeEmpresa);
    divInfo.appendChild(contato);

    const badge = document.createElement("span");
    badge.textContent = ROTULOS_STATUS[sol.status] || sol.status;
    badge.className = `badge-status badge-${sol.status || 'pendente'}`;
    badge.style.flexShrink = "0";

    cabecalho.appendChild(divInfo);
    cabecalho.appendChild(badge);

    const corpo = document.createElement("div");
    corpo.style.cssText = "display: none; padding: 0 15px 20px; border-top: 1px solid #ddd;";

    cabecalho.addEventListener("click", () => {
        const aberto = corpo.style.display === "block";
        corpo.style.display = aberto ? "none" : "block";
        if (!aberto && corpo.childElementCount === 0) {
            corpo.appendChild(montarDetalheSolicitacao(sol));
        }
    });

    card.appendChild(cabecalho);
    card.appendChild(corpo);
    return card;
}

function linhaDetalhe(rotulo, valor) {
    const div = document.createElement("div");
    div.style.cssText = "font-size: 0.85rem; margin-bottom: 6px;";

    const forte = document.createElement("strong");
    forte.textContent = rotulo + ": ";

    const span = document.createElement("span");
    span.textContent = valor || "-";

    div.appendChild(forte);
    div.appendChild(span);
    return div;
}

function montarDetalheSolicitacao(sol) {
    const wrapper = document.createElement("div");
    wrapper.style.paddingTop = "15px";

    const grid = document.createElement("div");
    grid.style.cssText = "display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 5px 20px;";

    [
        ["Segmento/Atividade", sol.segmento_atividade],
        ["Inscrição Estadual", sol.inscricao_estadual],
        ["Data de Fundação", sol.data_fundacao],
        ["Funcionários", sol.qtd_funcionarios],
        ["Endereço", `${sol.endereco || ''} - ${sol.bairro || ''}`],
        ["Cidade/UF", `${sol.cidade || ''} - ${sol.uf || ''}`],
        ["CEP", sol.cep],
        ["Site", sol.site],
        ["Responsável Compras", `${sol.responsavel_compras || ''} (${sol.cargo_compras || ''})`],
        ["Financeiro", `${sol.email_financeiro || ''} · ${sol.telefone_financeiro || ''}`],
        ["Responsável Legal", `${sol.responsavel_legal || ''} (${sol.cargo_responsavel_legal || ''}) · ${sol.contato_responsavel_legal || ''}`],
        ["Limite Pretendido", sol.limite_credito_pretendido],
        ["Volume Médio Mensal", sol.volume_medio_mensal],
        ["Finalidade das Compras", sol.finalidade_compras],
        ["Prazo Pretendido", sol.prazo_pagamento_pretendido],
        ["Forma de Pagamento", sol.forma_pagamento_habitual],
        ["Compras faturadas c/ outros?", sol.possui_compras_faturadas],
        ["Atrasos relevantes?", sol.atrasos_relevantes],
        ["Protestos/Pendências?", sol.protestos_pendencias],
        ["Assinatura (nome)", sol.nome_responsavel_autorizacao],
        ["Data da Autorização", sol.data_autorizacao]
    ].forEach(([rotulo, valor]) => grid.appendChild(linhaDetalhe(rotulo, valor)));

    wrapper.appendChild(grid);

    if (sol.referencias && sol.referencias.length > 0) {
        const tituloRef = document.createElement("h4");
        tituloRef.style.cssText = "margin: 15px 0 8px; color: var(--azul-precisa);";
        tituloRef.textContent = "Referências Comerciais";
        wrapper.appendChild(tituloRef);

        sol.referencias.forEach(ref => {
            const linha = document.createElement("div");
            linha.style.cssText = "font-size: 0.85rem; margin-bottom: 4px;";
            linha.textContent = `${ref.empresa || '-'} · CNPJ: ${ref.cnpj || '-'} · Contato: ${ref.contato || '-'} · Tel: ${ref.telefone || '-'} · Desde: ${ref.desde_quando || '-'}`;
            wrapper.appendChild(linha);
        });
    }

    const tituloDocs = document.createElement("h4");
    tituloDocs.style.cssText = "margin: 15px 0 8px; color: var(--azul-precisa);";
    tituloDocs.textContent = "Documentos";
    wrapper.appendChild(tituloDocs);

    const divDocs = document.createElement("div");
    divDocs.style.cssText = "display: flex; flex-wrap: wrap; gap: 10px; margin-bottom: 10px;";

    Object.keys(ROTULOS_DOCUMENTOS).forEach(campo => {
        const caminho = sol[campo];
        const btnDoc = document.createElement("button");
        btnDoc.type = "button";
        btnDoc.className = "btn-back";
        btnDoc.style.cssText = "background: var(--azul-precisa); font-size: 0.8rem; padding: 6px 12px;";
        btnDoc.textContent = ROTULOS_DOCUMENTOS[campo] + (caminho ? "" : " (não enviado)");
        btnDoc.disabled = !caminho;
        if (caminho) btnDoc.addEventListener("click", () => abrirDocumento(caminho));
        divDocs.appendChild(btnDoc);
    });

    wrapper.appendChild(divDocs);
    wrapper.appendChild(montarFormularioAnalise(sol));

    return wrapper;
}

async function abrirDocumento(caminho) {
    try {
        const { data, error } = await clienteDB.storage.from('documentos_credito').createSignedUrl(caminho, 60);
        if (error) throw error;
        window.open(data.signedUrl, '_blank', 'noopener,noreferrer');
    } catch (erro) {
        console.error("Erro ao abrir documento:", erro);
        mostrarAviso("Erro ao abrir documento: " + erro.message, "erro");
    }
}

function montarFormularioAnalise(sol) {
    const form = document.createElement("form");
    form.style.cssText = "background: var(--branco); border: 1px solid var(--cinza-borda); border-radius: 6px; padding: 15px; margin-top: 10px;";

    const titulo = document.createElement("h4");
    titulo.style.cssText = "margin-bottom: 10px; color: var(--azul-precisa);";
    titulo.textContent = "Análise de Crédito (Uso Interno)";
    form.appendChild(titulo);

    const campoSelect = (id, label, opcoes, valorAtual) => {
        const div = document.createElement("div");
        div.className = "form-group";
        div.style.marginBottom = "12px";
        const lab = document.createElement("label");
        lab.textContent = label;
        lab.style.cssText = "font-size: 0.8rem; display:block; margin-bottom: 4px;";
        const select = document.createElement("select");
        select.id = id;
        opcoes.forEach(op => {
            const opt = document.createElement("option");
            opt.value = op.value;
            opt.textContent = op.label;
            if (op.value === valorAtual) opt.selected = true;
            select.appendChild(opt);
        });
        div.appendChild(lab);
        div.appendChild(select);
        return div;
    };

    const campoTexto = (id, label, valorAtual, tipo = "text") => {
        const div = document.createElement("div");
        div.className = "form-group";
        div.style.marginBottom = "12px";
        const lab = document.createElement("label");
        lab.textContent = label;
        lab.style.cssText = "font-size: 0.8rem; display:block; margin-bottom: 4px;";
        const input = document.createElement(tipo === "textarea" ? "textarea" : "input");
        if (tipo !== "textarea") input.type = tipo;
        input.id = id;
        input.value = valorAtual || "";
        div.appendChild(lab);
        div.appendChild(input);
        return div;
    };

    const idUnico = sol.id;
    form.appendChild(campoSelect(`status_${idUnico}`, "Status", [
        { value: "pendente", label: "Pendente" },
        { value: "aprovado", label: "Aprovado" },
        { value: "reprovado", label: "Reprovado" }
    ], sol.status || "pendente"));

    const linha1 = document.createElement("div");
    linha1.style.cssText = "display: flex; gap: 12px;";
    linha1.appendChild(campoTexto(`limite_${idUnico}`, "Limite aprovado", sol.limite_aprovado));
    linha1.appendChild(campoTexto(`prazo_${idUnico}`, "Prazo aprovado", sol.prazo_aprovado));
    linha1.appendChild(campoTexto(`dataAnalise_${idUnico}`, "Data da análise", sol.data_analise, "date"));
    form.appendChild(linha1);

    form.appendChild(campoTexto(`referenciasContatadas_${idUnico}`, "Referências contatadas", sol.referencias_contatadas));
    form.appendChild(campoTexto(`analista_${idUnico}`, "Analista responsável", sol.analista_responsavel));
    form.appendChild(campoTexto(`parecer_${idUnico}`, "Parecer", sol.parecer, "textarea"));
    form.appendChild(campoTexto(`observacoes_${idUnico}`, "Observações", sol.observacoes, "textarea"));

    const acoes = document.createElement("div");
    acoes.style.cssText = "display: flex; gap: 10px; margin-top: 10px;";

    const btnSalvar = document.createElement("button");
    btnSalvar.type = "submit";
    btnSalvar.className = "btn-submit";
    btnSalvar.style.cssText = "width: auto; padding: 8px 16px; font-size: 0.85rem;";
    btnSalvar.textContent = "Salvar Análise";

    const btnExcluir = document.createElement("button");
    btnExcluir.type = "button";
    btnExcluir.className = "btn-remove-image";
    btnExcluir.style.cssText = "width: auto; padding: 8px 16px; font-size: 0.85rem;";
    btnExcluir.textContent = "Excluir Solicitação";
    btnExcluir.addEventListener("click", () => excluirSolicitacao(sol.id));

    acoes.appendChild(btnSalvar);
    acoes.appendChild(btnExcluir);
    form.appendChild(acoes);

    form.addEventListener("submit", (event) => salvarAnalise(event, idUnico));

    return form;
}

async function salvarAnalise(event, idUnico) {
    event.preventDefault();

    const statusAnterior = solicitacoesCarregadas.find(s => s.id === idUnico)?.status;

    const dados = {
        status: document.getElementById(`status_${idUnico}`).value,
        limite_aprovado: document.getElementById(`limite_${idUnico}`).value.trim() || null,
        prazo_aprovado: document.getElementById(`prazo_${idUnico}`).value.trim() || null,
        data_analise: document.getElementById(`dataAnalise_${idUnico}`).value || null,
        referencias_contatadas: document.getElementById(`referenciasContatadas_${idUnico}`).value.trim() || null,
        analista_responsavel: document.getElementById(`analista_${idUnico}`).value.trim() || null,
        parecer: document.getElementById(`parecer_${idUnico}`).value.trim() || null,
        observacoes: document.getElementById(`observacoes_${idUnico}`).value.trim() || null
    };

    try {
        const { error } = await clienteDB.from('solicitacoes_credito').update(dados).eq('id', idUnico);
        if (error) throw error;

        mostrarAviso("Análise salva com sucesso!", "sucesso");
        if (dados.status !== statusAnterior) {
            mostrarAviso(`Status alterado para "${ROTULOS_STATUS[dados.status]}". Lembre-se de avisar o cliente.`, "aviso");
        }
        await carregarListaClientes();
    } catch (erro) {
        console.error("Erro ao salvar análise:", erro);
        mostrarAviso("Erro ao salvar análise: " + erro.message, "erro");
    }
}

async function excluirSolicitacao(idSolicitacao) {
    if (!confirm("Tem certeza que deseja excluir esta solicitação?")) return;

    try {
        const { error } = await clienteDB.from('solicitacoes_credito').delete().eq('id', idSolicitacao);
        if (error) throw error;

        mostrarAviso("Solicitação excluída com sucesso!", "sucesso");
        await carregarListaClientes();
    } catch (erro) {
        console.error("Erro ao excluir solicitação:", erro);
        mostrarAviso("Erro ao excluir solicitação: " + erro.message, "erro");
    }
}

function prepararEdicao(idProduto) {
    const produto = produtosCarregados.find(p => String(p.id) === String(idProduto));
    if (!produto) return;

    produtoIdEmEdicao = produto.id;
    imagemUrlAntiga = produto.imagem_url;

    document.getElementById("titulo").value = produto.titulo;
    document.getElementById("categoria").value = produto.categoria;
    document.querySelector('.form-title').innerText = "Editar Produto: " + produto.titulo;
    
    const checkboxVisivel = document.getElementById("visivel");
    if (checkboxVisivel) {
        checkboxVisivel.checked = produto.visivel !== false; // Se for null ou true, fica marcado
    }
    
    const imagePreview = document.getElementById("imagePreview");
    const previewImg = document.getElementById("previewImg");
    const labelUpload = document.querySelector(".image-upload-label");
    
    if (produto.imagem_url) {
        previewImg.src = produto.imagem_url;
        imagePreview.style.display = "flex";
        labelUpload.style.display = "none";
    } else {
        previewImg.src = "";
        imagePreview.style.display = "none";
        labelUpload.style.display = "flex";
    }

    const containerSpecs = document.getElementById("especificacoesContainer");
    containerSpecs.innerHTML = "";
    
    if (produto.especificacoes && produto.especificacoes.length > 0) {
        produto.especificacoes.forEach(spec => {
            adicionarLinhaEspecificacaoBlindada(spec.codigo, spec.descricao);
        });
    } else {
        adicionarLinhaEspecificacaoBlindada('', '');
    }

    document.getElementById("btnCancelarEdicao").style.display = "block";
    document.querySelector('#formProduto button[type="submit"]').innerText = "Atualizar Produto";
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

function limparFormulario() {
    produtoIdEmEdicao = null;
    imagemUrlAntiga = null;
    
    document.getElementById("formProduto").reset();
    document.querySelector('.form-title').innerText = "Novo Produto";
    
    const checkboxVisivel = document.getElementById("visivel");
    if (checkboxVisivel) checkboxVisivel.checked = true;

    document.getElementById("imagePreview").style.display = "none";
    document.querySelector(".image-upload-label").style.display = "flex";
    document.getElementById("previewImg").src = "";
    
    const container = document.getElementById("especificacoesContainer");
    container.innerHTML = "";
    adicionarLinhaEspecificacaoBlindada('', '');
    
    document.getElementById("btnCancelarEdicao").style.display = "none";
    document.querySelector('#formProduto button[type="submit"]').innerText = "Gravar Produto";
}

function adicionarLinhaEspecificacaoBlindada(codigoValor, descricaoValor) {
    const container = document.getElementById("especificacoesContainer");
    if (!container) return;
    
    const novaLinha = document.createElement("div");
    novaLinha.className = "spec-row";
    
    novaLinha.innerHTML = `
        <div class="spec-field"><label>Código</label><input type="text" required class="input-codigo"></div>
        <div class="spec-field"><label>Descrição / Medida</label><input type="text" required class="input-descricao"></div>
        <div class="spec-controls">
            <button type="button" class="btn-move-up" title="Mover para cima">⬆️</button>
            <button type="button" class="btn-move-down" title="Mover para baixo">⬇️</button>
            <button type="button" class="btn-remove-spec" title="Remover item">🗑️</button>
        </div>
    `;
    
    novaLinha.querySelector(".input-codigo").value = codigoValor || '';
    novaLinha.querySelector(".input-descricao").value = descricaoValor || '';
    
    container.appendChild(novaLinha);
}

function configurarUploadFoto() {
    const inputImagem = document.getElementById("imagem");
    const imagePreview = document.getElementById("imagePreview");
    const previewImg = document.getElementById("previewImg");
    const labelUpload = document.querySelector(".image-upload-label");
    const btnRemoveImage = document.getElementById("btnRemoveImage");
    
    if (!inputImagem) return;
    
    inputImagem.addEventListener("change", function() {
        const ficheiro = this.files[0];
        if (ficheiro) {
            const leitor = new FileReader();
            leitor.onload = function(e) {
                previewImg.src = e.target.result;
                imagePreview.style.display = "flex";
                labelUpload.style.display = "none";
            }
            leitor.readAsDataURL(ficheiro);
        }
    });
    
    if (btnRemoveImage) {
        btnRemoveImage.addEventListener("click", function() {
            inputImagem.value = "";
            previewImg.src = "";
            imagePreview.style.display = "none";
            labelUpload.style.display = "flex";
            if (produtoIdEmEdicao) imagemUrlAntiga = null; 
        });
    }
}

async function processarSubmissao(event) {
    event.preventDefault();
    if (!clienteDB) {
        mostrarAviso("Erro de ligação ao banco.", "erro");
        return;
    }
    
    const btnSubmit = event.target.querySelector('button[type="submit"]');
    const inputTitulo = document.getElementById("titulo");
    const inputCategoria = document.getElementById("categoria");
    const inputImagem = document.getElementById("imagem");

    if (!btnSubmit || !inputTitulo || !inputCategoria || !inputImagem) {
        mostrarAviso("Erro fatal: Campos do formulário não encontrados na tela.", "erro");
        return;
    }

    btnSubmit.innerText = "A processar...";
    btnSubmit.disabled = true;

    const { data: sessaoAtual } = await clienteDB.auth.getSession();
    if (!sessaoAtual.session) {
        mostrarAviso("Sua sessão expirou por inatividade. Faça login novamente.", "aviso");
        document.getElementById("loginContainer").style.display = "block";
        document.getElementById("painelAdmin").style.display = "none";
        
        btnSubmit.innerText = produtoIdEmEdicao ? "Atualizar Produto" : "Gravar Produto";
        btnSubmit.disabled = false;
        return; 
    }

    const titulo = inputTitulo.value;
    const categoria = inputCategoria.value;
    
    // Captura o estado do novo botão
    const isVisivel = document.getElementById("visivel").checked;
    
    const especificacoes = [];
    document.querySelectorAll(".spec-row").forEach(linha => {
        const inputCodigo = linha.querySelector(".input-codigo");
        const inputDescricao = linha.querySelector(".input-descricao");
        
        if (inputCodigo && inputDescricao) {
            especificacoes.push({
                codigo: inputCodigo.value,
                descricao: inputDescricao.value,
                embalagem: '1' // Preenchimento automático para não quebrar a tabela do banco
            });
        }
    });

    if (especificacoes.length === 0) {
        mostrarAviso("Adicione pelo menos uma especificação técnica.", "aviso");
        btnSubmit.innerText = produtoIdEmEdicao ? "Atualizar Produto" : "Gravar Produto";
        btnSubmit.disabled = false;
        return;
    }

    try {
        let imagemUrl = imagemUrlAntiga;

        if (inputImagem.files.length > 0) {
            const ficheiro = inputImagem.files[0];
            const tituloLimpo = titulo.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9]/g, '_').toLowerCase();
            const extensao = ficheiro.name.split('.').pop();
            const nomeFicheiro = `${tituloLimpo}_${Date.now()}.${extensao}`;

            const { error: imgError } = await clienteDB.storage.from('imagens_catalogo').upload(nomeFicheiro, ficheiro);
            if (imgError) throw imgError;
            
            const { data: publicUrlData } = clienteDB.storage.from('imagens_catalogo').getPublicUrl(nomeFicheiro);
            imagemUrl = publicUrlData.publicUrl;
        }

        let idTratado = produtoIdEmEdicao;

        if (produtoIdEmEdicao) {
            const { error: produtoError } = await clienteDB
                .from('produtos')
                .update({ titulo: titulo, categoria: categoria, imagem_url: imagemUrl, visivel: isVisivel })
                .eq('id', produtoIdEmEdicao);
            if (produtoError) throw produtoError;

            await clienteDB.from('especificacoes').delete().eq('produto_id', produtoIdEmEdicao);
        } else {
            const { data: produtoData, error: produtoError } = await clienteDB
                .from('produtos')
                .insert([{ titulo: titulo, categoria: categoria, imagem_url: imagemUrl, visivel: isVisivel }])
                .select();
            if (produtoError) throw produtoError;
            idTratado = produtoData[0].id;
        }

        const especificacoesComId = especificacoes.map(spec => ({ ...spec, produto_id: idTratado }));
        const { error: specError } = await clienteDB.from('especificacoes').insert(especificacoesComId);
        if (specError) throw specError;

        mostrarAviso(produtoIdEmEdicao ? "Produto atualizado com sucesso!" : "Produto cadastrado com sucesso!", "sucesso");
        
        limparFormulario();
        carregarListaAdmin(); 
        
    } catch (erro) {
        console.error("Erro na gravação:", erro);
        mostrarAviso("Ocorreu um erro ao salvar: " + erro.message, "erro");
    } finally {
        btnSubmit.innerText = produtoIdEmEdicao ? "Atualizar Produto" : "Gravar Produto";
        btnSubmit.disabled = false;
    }
}

// =========================================
// SISTEMA DE NOTIFICAÇÕES (TOASTS)
// =========================================
function mostrarAviso(mensagem, tipo = 'aviso') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-moderno toast-${tipo}`;
    
    let icone = '⚠️';
    if (tipo === 'sucesso') icone = '✅';
    if (tipo === 'erro') icone = '❌';

    toast.innerHTML = `<span style="font-size: 1.2rem;">${icone}</span> <span>${mensagem}</span>`;
    
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('mostrar');
    }, 10);

    setTimeout(() => {
        toast.classList.remove('mostrar');
        setTimeout(() => toast.remove(), 400); 
    }, 3500);
}