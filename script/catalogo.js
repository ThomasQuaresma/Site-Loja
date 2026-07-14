// Cole aqui as mesmas credenciais que você usou no admin.js
const supabaseUrl = 'https://qsdosnxvlzkhgdpbwlbo.supabase.co';
const supabaseKey = 'sb_publishable_fnQn-RRq6tRXDwTcgZ0--w_zzA32rai';
const supabase = window.supabase.createClient(supabaseUrl, supabaseKey);

let todosProdutos = [];

// Função que busca os dados no banco
async function carregarCatalogo() {
    try {
        // O Supabase permite puxar o produto e todas as suas medidas de uma vez só
        const { data, error } = await supabase
            .from('produtos')
            .select(`
                *,
                especificacoes (*)
            `)
            .order('created_at', { ascending: false }); // Traz os mais recentes primeiro

        if (error) throw error;

        todosProdutos = data || [];
        renderizarProdutos(todosProdutos);
        configurarBusca();
    } catch (erro) {
        console.error("Erro ao carregar o catálogo:", erro);
        document.getElementById('catalogoProdutos').innerHTML = '<h3>Erro ao carregar o catálogo de produtos.</h3>';
    }
}

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
        
        // Verifica se existem especificações atreladas no banco
        if(prod.especificacoes && prod.especificacoes.length > 0) {
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

        // Puxa a imagem do banco ou mostra uma provisória
        const imagemExibir = prod.imagem_url 
            ? prod.imagem_url 
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
    
    const btn = event.target;
    btn.style.backgroundColor = '#28a745';
    btn.innerText = '✓';
    setTimeout(() => {
        btn.style.backgroundColor = 'var(--laranja-precisa)';
        btn.innerText = '+';
    }, 1000);
}

function abrirOrcamento() {
    alert(`Você possui ${carrinho.length} itens no orçamento. A integração com o WhatsApp será feita na sequência.`);
}

// Inicializa a página
document.addEventListener("DOMContentLoaded", carregarCatalogo);