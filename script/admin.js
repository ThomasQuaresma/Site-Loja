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
            inicializarSistema(); 
        }
    } catch (erro) {
        console.error("Erro na inicialização:", erro);
    }

    adicionarLinhaEspecificacaoBlindada('', '', '');
    configurarUploadFoto();
    
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
});

// Garante que as categorias carreguem ANTES dos produtos para a edição funcionar perfeitamente
async function inicializarSistema() {
    await carregarCategorias();
    await carregarListaAdmin();
}

async function carregarCategorias() {
    if (!clienteDB) return;
    const select = document.getElementById("categoria");
    
    try {
        const { data, error } = await clienteDB
            .from('categorias')
            .select('*')
            .order('nome', { ascending: true });

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
    
    // Converte tudo para maiúsculo para manter o padrão visual do seu banco
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
        
        // Atualiza a lista suspensa na mesma hora sem precisar recarregar a página
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
    btnRemoveImage.addEventListener("click", function() {
        inputImagem.value = "";
        previewImg.src = "";
        imagePreview.style.display = "none";
        labelUpload.style.display = "flex";
        if (produtoIdEmEdicao) imagemUrlAntiga = null; 
    });
}

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