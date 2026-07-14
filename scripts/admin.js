document.addEventListener("DOMContentLoaded", () => {
    // Inicializa o formulário com uma linha de especificação vazia
    adicionarLinhaEspecificacao();
    
    // Configura o comportamento de upload e pré-visualização da foto
    configurarUploadFoto();
    
    // Monitoriza a submissão do formulário
    document.getElementById("formProduto").addEventListener("submit", processarSubmissao);
});

// Gera um ID único para cada linha de especificação criada
function adicionarLinhaEspecificacao() {
    const container = document.getElementById("especificacoesContainer");
    const idLinha = "spec_" + Date.now();

    const novaLinha = document.createElement("div");
    novaLinha.className = "spec-row";
    novaLinha.id = idLinha;

    novaLinha.innerHTML = `
        <div class="spec-field">
            <label>Código</label>
            <input type="text" placeholder="Ex: CB0150" required class="input-codigo">
        </div>
        <div class="spec-field">
            <label>Descrição / Medida</label>
            <input type="text" placeholder="Ex: Seção: 1,5mm²" required class="input-descricao">
        </div>
        <div class="spec-field">
            <label>Embalagem</label>
            <input type="text" placeholder="Ex: RL 100M" required class="input-embalagem">
        </div>
        <button type="button" class="btn-remove-spec" onclick="removerLinhaEspecificacao('${idLinha}')">
            🗑️
        </button>
    `;

    container.appendChild(novaLinha);
}

// Remove o bloco correspondente à variação selecionada
function removerLinhaEspecificacao(idLinha) {
    const linha = document.getElementById(idLinha);
    if (linha) {
        linha.remove();
    }
}

// Monitoriza o ficheiro de imagem e exibe antevisão antes do upload
function configurarUploadFoto() {
    const inputImagem = document.getElementById("imagem");
    const imagePreview = document.getElementById("imagePreview");
    const previewImg = document.getElementById("previewImg");
    const btnRemoveImage = document.getElementById("btnRemoveImage");
    const labelUpload = document.querySelector(".image-upload-label");

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
    });
}

// Junta todas as variáveis do formulário para estruturação de dados
function processarSubmissao(event) {
    event.preventDefault();

    const titulo = document.getElementById("titulo").value;
    const categoria = document.getElementById("categoria").value;
    const inputImagem = document.getElementById("imagem");
    
    const linhasSpecs = document.querySelectorAll(".spec-row");
    const especificacoes = [];

    linhasSpecs.forEach(linha => {
        const codigo = linha.querySelector(".input-codigo").value;
        const descricao = linha.querySelector(".input-descricao").value;
        const embalagem = linha.querySelector(".input-embalagem").value;

        especificacoes.push({
            codigo: codigo,
            descricao: descricao,
            embalagem: embalagem
        });
    });

    if (especificacoes.length === 0) {
        alert("Por favor, adicione pelo menos uma especificação técnica ao produto.");
        return;
    }

    // Estrutura de dados pronta para ser empurrada para a API do Supabase
    const dadosProduto = {
        titulo: titulo,
        categoria: categoria,
        especificacoes: especificacoes,
        ficheiroImagem: inputImagem.files[0] || null
    };

    console.log("Informação estruturada pronta para envio:", dadosProduto);
    alert("Campos validados com sucesso! O formulário está pronto para ser conectado à base de dados.");
}