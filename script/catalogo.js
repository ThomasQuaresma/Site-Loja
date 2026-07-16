const supabaseUrl = 'https://qsdosnxvlzkhgdpbwlbo.supabase.co';
const supabaseKey = 'sb_publishable_fnQn-RRq6tRXDwTcgZ0--w_zzA32rai';

let clienteDB = null;
let todosProdutos = [];

document.addEventListener("DOMContentLoaded", () => {
    try {
        if (window.supabase) {
            clienteDB = window.supabase.createClient(supabaseUrl, supabaseKey);
            carregarCatalogo();
        } else {
            document.getElementById('catalogoProdutos').innerHTML = '<h3>Erro de ligação. Verifique a sua conexão ou desative bloqueadores.</h3>';
        }
    } catch (erro) {
        console.error("Erro na inicialização:", erro);
    }
});

async function carregarCatalogo() {
    try {
        const { data, error } = await clienteDB
            .from('produtos')
            .select(`*, especificacoes (*)`)
            .order('created_at', { ascending: false });

        if (error) throw error;

        todosProdutos = data || [];
        renderizarProdutos(todosProdutos);
        configurarBusca();
    } catch (erro) {
        console.error("Erro ao carregar o catálogo:", erro);
        document.getElementById('catalogoProdutos').innerHTML = '<h3>Erro ao carregar os produtos técnicos.</h3>';
    }
}

function renderizarProdutos(produtos) {
    const container = document.getElementById('catalogoProdutos');
    
    if(produtos.length === 0) {
        container.innerHTML = '<h3>Nenhum produto encontrado nesta categoria.</h3>';
        return;
    }

    let htmlFinal = '';

    produtos.forEach(prod => {
        let linhasTabela = '';
        
        if(prod.especificacoes && prod.especificacoes.length > 0) {
            prod.especificacoes.forEach(spec => {
                linhasTabela += `
                    <tr>
                        <td>${spec.codigo || '-'}</td>
                        <td>${spec.descricao || '-'}</td>
                        <td>${spec.embalagem || 'PT 1'}</td>
                    </tr>`;
            });
        }

        const imagemExibir = prod.imagem_url ? prod.imagem_url : 'https://via.placeholder.com/350x250.png?text=FOTO+PRODUTO';

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