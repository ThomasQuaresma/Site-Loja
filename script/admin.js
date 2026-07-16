const supabaseUrl = 'https://qsdosnxvlzkhgdpbwlbo.supabase.co';
const supabaseKey = 'sb_publishable_fnQn-RRq6tRXDwTcgZ0--w_zzA32rai';

let clienteDB = null;

// Variáveis de controle de edição
let produtoIdEmEdicao = null;
let imagemUrlAntiga = null;

document.addEventListener("DOMContentLoaded", () => {
    try {
        if (window.supabase) {
            clienteDB = window.supabase.createClient(supabaseUrl, supabaseKey);
            carregarListaAdmin(); // Carrega a lista de produtos existentes
        }
    } catch (erro) {
        console.error("Erro na inicialização:", erro);
    }

    adicionarLinhaEspecificacao();
    configurarUploadFoto();
    
    const btnAddSpec = document.getElementById("btnAddSpec");
    if (btnAddSpec) btnAddSpec.addEventListener("click", adicionarLinhaEspecificacao);
    
    const containerSpecs = document.getElementById("especificacoesContainer");
    if (containerSpecs) {
        containerSpecs.addEventListener("click", function(event) {
            if (event.target.classList.contains("btn-remove-spec")) {
                event.target.closest(".spec-row").remove();
            }
        });
    }

    const formProduto = document.getElementById("formProduto");
    if (formProduto) formProduto.addEventListener("submit", processarSubmissao);

    // Botão para cancelar a edição
    const btnCancelarEdicao = document.getElementById("btnCancelarEdicao");
    if (btnCancelarEdicao) {
        btnCancelarEdicao.addEventListener("click", limparFormulario);
    }
});

// --- NOVA FUNÇÃO: CARREGAR LISTA PARA EDIÇÃO ---
async function carregarListaAdmin() {
    if (!clienteDB) return;
    const container = document.getElementById("listaProdutosAdmin");

    try {
        const { data: produtos, error } = await clienteDB
            .from('produtos')
            .select(`*, especificacoes (*)`)
            .order('created_at', { ascending: false });

        if (error) throw error;

        if (produtos.length === 0) {
            container.innerHTML = '<p>Nenhum produto cadastrado ainda.</p>';
            return;
        }

        let html = '';
        produtos.forEach(prod => {
            html += `
            <div style="display: flex; justify-content: space-between; align-items: center; padding: 15px; border: 1px solid #ddd; border-radius: 8px; background: #fafafa;">
                <div>
                    <strong>${prod.titulo}</strong> <span style="font-size: 0.85rem; color: #666;">(${prod.categoria})</span>
                    <br>
                    <span style="font-size: 0.85rem;">${prod.especificacoes ? prod.especificacoes.length : 0} medida(s)</span>
                </div>
                <button type="button" class="btn-submit" style="width: auto; padding: 8px 15px; font-size: 0.9rem;" onclick='prepararEdicao(${JSON.stringify(prod)})'>
                    Editar
                </button>
            </div>`;
        });
        
        container.innerHTML = html;
    } catch (erro) {
        console.error("Erro ao carregar lista:", erro);
        container.innerHTML = '<p>Erro ao carregar os produtos.</p>';
    }
}

// --- NOVA FUNÇÃO: PREENCHER FORMULÁRIO COM DADOS ANTIGOS ---
window.prepararEdicao = function(produto) {
    produtoIdEmEdicao = produto.id;
    imagemUrlAntiga = produto.imagem_url;

    document.getElementById("titulo").value = produto.titulo;
    document.getElementById("categoria").value = produto.categoria;
    document.querySelector('.form-title').innerText = "Editar Produto: " + produto.titulo;
    
    // Atualiza a interface da foto
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

    // Recria as linhas de especificações
    const containerSpecs = document.getElementById("especificacoesContainer");
    containerSpecs.innerHTML = "";
    
    if (produto.especificacoes && produto.especificacoes.length > 0) {
        produto.especificacoes.forEach(spec => {
            const novaLinha = document.createElement("div");
            novaLinha.className = "spec-row";
            novaLinha.innerHTML = `
                <div class="spec-field">
                    <label>Código</label>
                    <input type="text" value="${spec.codigo || ''}" required class="input-codigo">
                </div>
                <div class="spec-field">
                    <label>Descrição / Medida</label>
                    <input type="text" value="${spec.descricao || ''}" required class="input-descricao">
                </div>
                <div class="spec-field">
                    <label>Embalagem</label>
                    <input type="text" value="${spec.embalagem || ''}" required class="input-embalagem">
                </div>
                <button type="button" class="btn-remove-spec">🗑️</button>
            `;
            containerSpecs.appendChild(novaLinha);
        });
    } else {
        adicionarLinhaEspecificacao();
    }

    // Mostra o botão de cancelar edição e muda o texto do botão principal
    document.getElementById("btnCancelarEdicao").style.display = "block";
    document.querySelector('#formProduto button[type="submit"]').innerText = "Atualizar Produto";
    
    // Rola a tela para o topo
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
    adicionarLinhaEspecificacao();
    
    document.getElementById("btnCancelarEdicao").style.display = "none";
    document.querySelector('#formProduto button[type="submit"]').innerText = "Gravar Produto";
}

// ... (Funções originais de adicionar linha e configurar upload permanecem inalteradas) ...
function adicionarLinhaEspecificacao() {
    const container = document.getElementById("especificacoesContainer");
    if (!container) return;
    const novaLinha = document.createElement("div");
    novaLinha.className = "spec-row";
    novaLinha.innerHTML = `
        <div class="spec-field"><label>Código</label><input type="text" required class="input-codigo"></div>
        <div class="spec-field"><label>Descrição / Medida</label><input type="text" required class="input-descricao"></div>
        <div class="spec-field"><label>Embalagem</label><input type="text" required class="input-embalagem"></div>
        <button type="button" class="btn-remove-spec">🗑️</button>`;
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
    btnRemoveImage.addEventListener("click", function() {
        inputImagem.value = "";
        previewImg.src = "";
        imagePreview.style.display = "none";
        labelUpload.style.display = "flex";
        // Se remover a foto durante a edição, limpa a URL antiga para forçar a deleção na nuvem
        if (produtoIdEmEdicao) imagemUrlAntiga = null; 
    });
}

// --- LÓGICA ATUALIZADA: INSERIR OU ATUALIZAR ---
async function processarSubmissao(event) {
    event.preventDefault();
    if (!clienteDB) return alert("Erro de ligação ao banco.");
    
    const btnSubmit = event.target.querySelector('button[type="submit"]');
    btnSubmit.innerText = "A processar...";
    btnSubmit.disabled = true;

    const titulo = document.getElementById("titulo").value;
    const categoria = document.getElementById("categoria").value;
    const inputImagem = document.getElementById("imagem");
    
    const especificacoes = [];
    document.querySelectorAll(".spec-row").forEach(linha => {
        especificacoes.push({
            codigo: linha.querySelector(".input-codigo").value,
            descricao: linha.querySelector(".input-descricao").value,
            embalagem: linha.querySelector(".input-embalagem").value
        });
    });

    if (especificacoes.length === 0) {
        alert("Adicione pelo menos uma especificação técnica.");
        btnSubmit.innerText = produtoIdEmEdicao ? "Atualizar Produto" : "Gravar Produto";
        btnSubmit.disabled = false;
        return;
    }

    try {
        let imagemUrl = imagemUrlAntiga; // Mantém a foto antiga se nenhuma nova for enviada

        // Se uma FOTO NOVA foi selecionada, faz o upload
        if (inputImagem.files.length > 0) {
            const ficheiro = inputImagem.files[0];
            const nomeFicheiro = `${Date.now()}_${ficheiro.name.replace(/\s+/g, '')}`;
            const { error: imgError } = await clienteDB.storage.from('imagens_catalogo').upload(nomeFicheiro, ficheiro);
            if (imgError) throw imgError;
            const { data: publicUrlData } = clienteDB.storage.from('imagens_catalogo').getPublicUrl(nomeFicheiro);
            imagemUrl = publicUrlData.publicUrl;
        }

        let idTratado = produtoIdEmEdicao;

        // SE FOR EDIÇÃO (UPDATE)
        if (produtoIdEmEdicao) {
            const { error: produtoError } = await clienteDB
                .from('produtos')
                .update({ titulo: titulo, categoria: categoria, imagem_url: imagemUrl })
                .eq('id', produtoIdEmEdicao);
            if (produtoError) throw produtoError;

            // Apaga as medidas antigas para inserir as novas limpas (evita duplicação)
            await clienteDB.from('especificacoes').delete().eq('produto_id', produtoIdEmEdicao);
        } 
        // SE FOR NOVO CADASTRO (INSERT)
        else {
            const { data: produtoData, error: produtoError } = await clienteDB
                .from('produtos')
                .insert([{ titulo: titulo, categoria: categoria, imagem_url: imagemUrl }])
                .select();
            if (produtoError) throw produtoError;
            idTratado = produtoData[0].id;
        }

        // Grava as novas medidas
        const especificacoesComId = especificacoes.map(spec => ({ ...spec, produto_id: idTratado }));
        const { error: specError } = await clienteDB.from('especificacoes').insert(especificacoesComId);
        if (specError) throw specError;

        alert(produtoIdEmEdicao ? "Produto atualizado com sucesso!" : "Produto cadastrado com sucesso!");
        
        limparFormulario();
        carregarListaAdmin(); // Atualiza a lista na tela
        
    } catch (erro) {
        console.error("Erro na gravação:", erro);
        alert("Ocorreu um erro ao salvar: " + erro.message);
    } finally {
        btnSubmit.innerText = produtoIdEmEdicao ? "Atualizar Produto" : "Gravar Produto";
        btnSubmit.disabled = false;
    }
}