console.log("🟢 admin.js carregado com sucesso!");

document.addEventListener("DOMContentLoaded", () => {
    console.log("⚙️ Iniciando configurações da página...");
    
    // 1. Inicializa o formulário com uma linha vazia
    adicionarLinhaEspecificacao();
    
    // 2. Configura a foto
    configurarUploadFoto();
    
    // 3. Vincula o botão de adicionar
    const btnAddSpec = document.getElementById("btnAddSpec");
    if (btnAddSpec) {
        btnAddSpec.addEventListener("click", adicionarLinhaEspecificacao);
        console.log("✅ Botão de adicionar medida conectado.");
    } else {
        console.error("❌ ERRO: Botão btnAddSpec não encontrado no HTML!");
    }
    
    // 4. Vincula o botão de remover medida
    const containerSpecs = document.getElementById("especificacoesContainer");
    if (containerSpecs) {
        containerSpecs.addEventListener("click", function(event) {
            if (event.target.classList.contains("btn-remove-spec")) {
                event.target.closest(".spec-row").remove();
            }
        });
    }

    // 5. Monitoriza a submissão
    const formProduto = document.getElementById("formProduto");
    if (formProduto) {
        formProduto.addEventListener("submit", processarSubmissao);
    }
});

function adicionarLinhaEspecificacao() {
    const container = document.getElementById("especificacoesContainer");
    if (!container) return;

    const novaLinha = document.createElement("div");
    novaLinha.className = "spec-row";

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
        <button type="button" class="btn-remove-spec">🗑️</button>
    `;

    container.appendChild(novaLinha);
}

function configurarUploadFoto() {
    const inputImagem = document.getElementById("imagem");
    const imagePreview = document.getElementById("imagePreview");
    const previewImg = document.getElementById("previewImg");
    const labelUpload = document.querySelector(".image-upload-label");
    const btnRemoveImage = document.getElementById("btnRemoveImage");

    if (!inputImagem) {
        console.error("❌ ERRO: Input de imagem não encontrado!");
        return;
    }

    console.log("✅ Sistema de upload de foto conectado.");

    inputImagem.addEventListener("change", function() {
        console.log("📸 Ficheiro selecionado!");
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

function processarSubmissao(event) {
    event.preventDefault();
    console.log("🚀 Iniciando gravação do produto...");
    /* A lógica de submissão continua igual */
}