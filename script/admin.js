const supabaseUrl = 'https://qsdosnxvlzkhgdpbwlbo.supabase.co'; 
const supabaseKey = 'sb_publishable_fnQn-RRq6tRXDwTcgZ0--w_zzA32rai';

let clienteDB = null; 
let produtosCarregados = [];
let produtoIdEmEdicao = null; 
let imagemUrlAntiga = null;

document.addEventListener("DOMContentLoaded", () => { 
    try { 
        if (window.supabase) { 
            clienteDB = window.supabase.createClient(supabaseUrl, supabaseKey); 
            
            // 1. Inicia o ouvinte de segurança em tempo real (compatível com os IDs do HTML)
            configurarOuvinteDeSessao();
            
            // 2. Verifica a sessão atual
            verificarSessao(); 
            
            // 3. Configura os eventos visuais e botões
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
    
    if(!emailInput || !senhaInput) return alert("Erro: Campos de login não encontrados.");
    
    const email = emailInput.value; 
    const senha = senhaInput.value; 

    if (!email || !senha) return alert("Preencha todos os campos.");

    btn.innerText = "Autenticando...";
    btn.disabled = true;

    const { error } = await clienteDB.auth.signInWithPassword({
        email: email,
        password: senha
    });

    if(error) {
        alert("Acesso negado. Verifique as credenciais.");
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
    adicionarLinhaEspecificacaoBlindada('', '', '');
    configurarUploadFoto();
    
    const btnEntrar = document.getElementById("btnEntrar");
    if (btnEntrar) btnEntrar.addEventListener("click", fazerLogin);

    const btnSair = document.getElementById("btnSair");
    if (btnSair) btnSair.addEventListener("click", fazerLogout);
    
    const btnAddSpec = document.getElementById("btnAddSpec");
    if (btnAddSpec) {
        btnAddSpec.addEventListener("click", () => adicionarLinhaEspecificacaoBlindada('', '', ''));
    }
    
    const containerSpecs = document.getElementById("especificacoesContainer");
    if (containerSpecs) {
        containerSpecs.addEventListener("click", function(event) {
            if (event.target.classList.contains("btn-remove-spec")) {
                event.target.closest(".spec-row").remove();
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

// =========================================
// MÓDULO DE GESTÃO E PRODUTOS
// =========================================

async function inicializarSistema() { 
    await carregarCategorias(); 
    await carregarListaAdmin(); 
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
    // 1. Busca os elementos na tela
    const input = document.getElementById("inputNovaCategoria");
    const btn = document.getElementById("btnCriarCategoria");
    
    // 2. Trava de segurança (evita Null Reference)
    if (!input || !btn) {
        console.error("Erro: Campos de nova categoria não encontrados no HTML.");
        return; 
    }

    // 3. Agora sim, extrai o valor com segurança
    let nomeCategoria = input.value.trim().toUpperCase();

    if (!nomeCategoria) {
        alert("Por favor, digite o nome da nova categoria.");
        return;
    }

    btn.innerText = "A gravar...";
    btn.disabled = true;

    try {
        const { error } = await clienteDB.from('categorias').insert([{ nome: nomeCategoria }]);
        if (error) throw error;

        input.value = "";
        alert("Categoria adicionada com sucesso!");
        await carregarCategorias();
    } catch (erro) {
        console.error("Erro ao gravar categoria:", erro);
        alert("Erro ao criar categoria: " + erro.message);
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

function prepararEdicao(idProduto) {
    const produto = produtosCarregados.find(p => String(p.id) === String(idProduto));
    if (!produto) return;

    produtoIdEmEdicao = produto.id;
    imagemUrlAntiga = produto.imagem_url;

    document.getElementById("titulo").value = produto.titulo;
    document.getElementById("categoria").value = produto.categoria;
    document.querySelector('.form-title').innerText = "Editar Produto: " + produto.titulo;
    
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
            adicionarLinhaEspecificacaoBlindada(spec.codigo, spec.descricao, spec.embalagem);
        });
    } else {
        adicionarLinhaEspecificacaoBlindada('', '', '');
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
    
    document.getElementById("imagePreview").style.display = "none";
    document.querySelector(".image-upload-label").style.display = "flex";
    document.getElementById("previewImg").src = "";
    
    const container = document.getElementById("especificacoesContainer");
    container.innerHTML = "";
    adicionarLinhaEspecificacaoBlindada('', '', '');
    
    document.getElementById("btnCancelarEdicao").style.display = "none";
    document.querySelector('#formProduto button[type="submit"]').innerText = "Gravar Produto";
}

function adicionarLinhaEspecificacaoBlindada(codigoValor, descricaoValor, embalagemValor) {
    const container = document.getElementById("especificacoesContainer");
    if (!container) return;
    
    const novaLinha = document.createElement("div");
    novaLinha.className = "spec-row";
    
    novaLinha.innerHTML = `
        <div class="spec-field"><label>Código</label><input type="text" required class="input-codigo"></div>
        <div class="spec-field"><label>Descrição / Medida</label><input type="text" required class="input-descricao"></div>
        <div class="spec-field"><label>Embalagem</label><input type="text" required class="input-embalagem"></div>
        <button type="button" class="btn-remove-spec">🗑️</button>
    `;
    
    novaLinha.querySelector(".input-codigo").value = codigoValor || '';
    novaLinha.querySelector(".input-descricao").value = descricaoValor || '';
    novaLinha.querySelector(".input-embalagem").value = embalagemValor || '';
    
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
    if (!clienteDB) return alert("Erro de ligação ao banco.");
    
    // 1. Busca os elementos principais
    const btnSubmit = event.target.querySelector('button[type="submit"]');
    const inputTitulo = document.getElementById("titulo");
    const inputCategoria = document.getElementById("categoria");
    const inputImagem = document.getElementById("imagem");

    // 2. Trava de segurança (evita Null Reference)
    if (!btnSubmit || !inputTitulo || !inputCategoria || !inputImagem) {
        alert("Erro fatal: Campos do formulário não encontrados na tela.");
        return;
    }

    btnSubmit.innerText = "A processar...";
    btnSubmit.disabled = true;

    // Trava de segurança contra sessão expirada
    const { data: sessaoAtual } = await clienteDB.auth.getSession();
    if (!sessaoAtual.session) {
        alert("Sua sessão expirou por inatividade. Faça login novamente (os seus dados não serão perdidos).");
        document.getElementById("loginContainer").style.display = "block";
        document.getElementById("painelAdmin").style.display = "none";
        
        btnSubmit.innerText = produtoIdEmEdicao ? "Atualizar Produto" : "Gravar Produto";
        btnSubmit.disabled = false;
        return; 
    }

    // 3. Agora sim, extrai os valores com segurança
    const titulo = inputTitulo.value;
    const categoria = inputCategoria.value;
    
    const especificacoes = [];
    document.querySelectorAll(".spec-row").forEach(linha => {
        const inputCodigo = linha.querySelector(".input-codigo");
        const inputDescricao = linha.querySelector(".input-descricao");
        const inputEmbalagem = linha.querySelector(".input-embalagem");
        
        // Validação de segurança para as linhas dinâmicas também
        if (inputCodigo && inputDescricao && inputEmbalagem) {
            especificacoes.push({
                codigo: inputCodigo.value,
                descricao: inputDescricao.value,
                embalagem: inputEmbalagem.value
            });
        }
    });

    if (especificacoes.length === 0) {
        alert("Adicione pelo menos uma especificação técnica.");
        btnSubmit.innerText = produtoIdEmEdicao ? "Atualizar Produto" : "Gravar Produto";
        btnSubmit.disabled = false;
        return;
    }

    try {
        let imagemUrl = imagemUrlAntiga;

        if (inputImagem.files.length > 0) {
            const ficheiro = inputImagem.files[0];
            
            const tituloLimpo = titulo
                .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
                .replace(/[^a-zA-Z0-9]/g, '_')
                .toLowerCase();
            
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
                .update({ titulo: titulo, categoria: categoria, imagem_url: imagemUrl })
                .eq('id', produtoIdEmEdicao);
            if (produtoError) throw produtoError;

            await clienteDB.from('especificacoes').delete().eq('produto_id', produtoIdEmEdicao);
        } 
        else {
            const { data: produtoData, error: produtoError } = await clienteDB
                .from('produtos')
                .insert([{ titulo: titulo, categoria: categoria, imagem_url: imagemUrl }])
                .select();
            if (produtoError) throw produtoError;
            idTratado = produtoData[0].id;
        }

        const especificacoesComId = especificacoes.map(spec => ({ ...spec, produto_id: idTratado }));
        const { error: specError } = await clienteDB.from('especificacoes').insert(especificacoesComId);
        if (specError) throw specError;

        alert(produtoIdEmEdicao ? "Produto atualizado com sucesso!" : "Produto cadastrado com sucesso!");
        
        limparFormulario();
        carregarListaAdmin(); 
        
    } catch (erro) {
        console.error("Erro na gravação:", erro);
        alert("Ocorreu um erro ao salvar: " + erro.message);
    } finally {
        btnSubmit.innerText = produtoIdEmEdicao ? "Atualizar Produto" : "Gravar Produto";
        btnSubmit.disabled = false;
    }
}