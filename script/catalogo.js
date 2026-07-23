const supabaseUrl = 'https://qsdosnxvlzkhgdpbwlbo.supabase.co';
const supabaseKey = 'sb_publishable_fnQn-RRq6tRXDwTcgZ0--w_zzA32rai';

let clienteDB = null;
let todosProdutos = [];

document.addEventListener("DOMContentLoaded", () => {
    try {
        if (window.supabase) {
            clienteDB = window.supabase.createClient(supabaseUrl, supabaseKey);
            inicializarCatalogo();
        } else {
            document.getElementById('catalogoProdutos').innerHTML = '<h3>Erro de ligação. Verifique a sua conexão ou desative bloqueadores.</h3>';
        }
    } catch (erro) {
        console.error("Erro na inicialização:", erro);
    }
});

// Carrega os produtos PRIMEIRO, para sabermos o que está em uso
async function inicializarCatalogo() {
    await carregarProdutos();
    await carregarCategorias();
}

async function carregarCategorias() {
    try {
        const { data, error } = await clienteDB
            .from('categorias')
            .select('*')
            .order('nome', { ascending: true });

        if (error) throw error;

        const categoryBar = document.getElementById('categoryBar');
        if (!categoryBar) return; // Trava de segurança

        // A MÁGICA ACONTECE AQUI: 
        // Filtra para manter apenas as categorias que existem dentro de 'todosProdutos'
        const categoriasAtivas = data.filter(cat => 
            todosProdutos.some(prod => prod.categoria === cat.nome)
        );

        // Agora criamos os botões apenas para as categorias ativas
        categoriasAtivas.forEach(cat => {
            const btn = document.createElement('button');
            btn.className = 'btn-filter';
            
            // Converte "FERRAMENTAS" para "Ferramentas"
            btn.textContent = cat.nome.charAt(0).toUpperCase() + cat.nome.slice(1).toLowerCase();
            
            btn.onclick = function() { filtrarCategoria(cat.nome, this); };
            
            categoryBar.appendChild(btn);
        });
    } catch (erro) {
        console.error("Erro ao carregar categorias dinâmicas:", erro);
    }
}

async function carregarProdutos() {
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
        const container = document.getElementById('catalogoProdutos');
        if (container) {
            container.innerHTML = '<h3>Erro ao carregar os produtos técnicos.</h3>';
        }
    }
}

function renderizarProdutos(produtos) {
    const container = document.getElementById('catalogoProdutos');
    if (!container) return; // Trava de segurança
    
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

// A função de filtro agora recebe o botão exato que foi clicado para alterar as cores
function filtrarCategoria(categoria, elementoBotao) {
    document.querySelectorAll('.btn-filter').forEach(btn => btn.classList.remove('active'));
    
    if (elementoBotao) {
        elementoBotao.classList.add('active');
    }

    if(categoria === 'TODOS') {
        renderizarProdutos(todosProdutos);
    } else {
        const produtosFiltrados = todosProdutos.filter(p => p.categoria === categoria);
        renderizarProdutos(produtosFiltrados);
    }
}

function configurarBusca() {
    // CORREÇÃO AQUI: Trocado de 'inputBusca' para 'busca' para bater com o HTML
    const input = document.getElementById('busca'); 
    
    // Trava de segurança: se o input não existir na tela, a função para aqui e não quebra o site
    if (!input) return; 

    input.addEventListener('keyup', () => {
        const termo = input.value.toLowerCase();
        const cards = document.querySelectorAll('.card-tecnico');
        
        cards.forEach(card => {
            const texto = card.innerText.toLowerCase();
            card.style.display = texto.includes(termo) ? 'flex' : 'none';
        });
    });
}