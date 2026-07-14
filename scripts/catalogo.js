let todosProdutos = [];

// Carrega os dados iniciais
fetch('dados/produtos.json')
    .then(res => res.json())
    .then(data => {
        todosProdutos = data.itens || [];
        renderizarProdutos(todosProdutos);
        configurarBusca();
    })
    .catch(error => {
        console.error("Erro ao carregar os produtos:", error);
        document.getElementById('catalogoProdutos').innerHTML = '<h3>Erro ao carregar o catálogo.</h3>';
    });

// Renderiza os cards na tela
function renderizarProdutos(produtos) {
    const container = document.getElementById('catalogoProdutos');
    
    if(produtos.length === 0) {
        container.innerHTML = '<h3>Nenhum produto encontrado.</h3>';
        return;
    }

    let htmlFinal = '';

    produtos.forEach(prod => {
        let linhasTabela = '';
        if(prod.especificacoes) {
            prod.especificacoes.forEach(spec => {
                linhasTabela += `
                    <tr>
                        <td>${spec.codigo || '-'}</td>
                        <td>${spec.descricao || '-'}</td>
                        <td>${spec.embalagem || 'PT 1'}</td>
                        <td class="col-acao">
                            <button class="btn-add" onclick="adicionarAoOrcamento('${spec.codigo}', '${prod.titulo}')">+</button>
                        </td>
                    </tr>`;
            });
        }

        const imagemExibir = prod.imagem && !prod.imagem.includes('abracadeira.jpg') 
            ? prod.imagem 
            : 'https://via.placeholder.com/350x250.png?text=FOTO+PRODUTO';

        htmlFinal += `
        <div class="card-tecnico" data-categoria="${prod.categoria}">
            <div class="card-header">
                <h2>${prod.titulo}</h2>
            </div>
            <div class="card-body-vertical">
                <div class="product-visual-central">
                    <img src="${imagemExibir}" alt="${prod.titulo}">
                </div>
                <div class="product-data-full">
                    <table class="tabela-tecnica">
                        <thead>
                            <tr>
                                <th>CÓDIGO</th>
                                <th>DESCRIÇÃO / MEDIDA</th>
                                <th>EMB.</th>
                                <th>ADD</th>
                            </tr>
                        </thead>
                        <tbody>
                            ${linhasTabela}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>`;
    });

    container.innerHTML = htmlFinal;
}

// Lógica de Filtro por Categoria
function filtrarCategoria(categoria) {
    document.querySelectorAll('.btn-filter').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');

    if(categoria === 'TODOS') {
        renderizarProdutos(todosProdutos);
    } else {
        const produtosFiltrados = todosProdutos.filter(p => p.categoria === categoria);
        renderizarProdutos(produtosFiltrados);
    }
}

// Lógica de Busca por Texto
function configurarBusca() {
    const input = document.getElementById('inputBusca');
    input.addEventListener('keyup', () => {
        const termo = input.value.toLowerCase();
        const cards = document.querySelectorAll('.card-tecnico');
        
        cards.forEach(card => {
            const texto = card.innerText.toLowerCase();
            card.style.display = texto.includes(termo) ? 'flex' : 'none';
        });
    });
}

// Lógica do Carrinho / Orçamento
let carrinho = [];
function adicionarAoOrcamento(codigo, titulo) {
    carrinho.push({codigo, titulo});
    document.getElementById('cartCount').innerText = carrinho.length;
    document.getElementById('cartWidget').style.display = 'flex';
    
    // Feedback visual do botão
    const btn = event.target;
    btn.style.backgroundColor = '#28a745';
    btn.innerText = '✓';
    setTimeout(() => {
        btn.style.backgroundColor = 'var(--laranja-precisa)';
        btn.innerText = '+';
    }, 1000);
}

// Função temporária de finalização para testar o fluxo
function abrirOrcamento() {
    console.log("Itens no orçamento:", carrinho);
    alert(`Você possui ${carrinho.length} itens no orçamento. A integração com o WhatsApp será feita aqui.`);
}