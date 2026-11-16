const supabaseUrl = 'https://qsdosnxvlzkhgdpbwlbo.supabase.co';
const supabaseKey = 'sb_publishable_fnQn-RRq6tRXDwTcgZ0--w_zzA32rai';

let clienteDB = null;

document.addEventListener("DOMContentLoaded", () => {
    // Loja desligada em script/config.js: não conecta no Supabase.
    if (!window.SITE_CONFIG || !window.SITE_CONFIG.lojaOnline) return;
    try {
        if (window.supabase) {
            clienteDB = window.supabase.createClient(supabaseUrl, supabaseKey);
        } else {
            console.error("Erro: SDK do Supabase não encontrado no HTML.");
        }
    } catch (erro) {
        console.error("Erro na inicialização:", erro);
    }

    montarLinhasReferencias();
    configurarNomesArquivos();
    configurarBuscaCNPJ();

    const form = document.getElementById("formCadastroCliente");
    if (form) form.addEventListener("submit", enviarCadastro);
});

// =========================================
// BUSCA AUTOMÁTICA DE DADOS PELO CNPJ (BrasilAPI / Receita Federal)
// =========================================

function configurarBuscaCNPJ() {
    const inputCnpj = document.getElementById("cnpj");
    if (!inputCnpj) return;
    inputCnpj.addEventListener("blur", buscarDadosCNPJ);
}

async function buscarDadosCNPJ() {
    const inputCnpj = document.getElementById("cnpj");
    const cnpjLimpo = inputCnpj.value.replace(/\D/g, '');

    if (cnpjLimpo.length !== 14) return;

    const indicador = document.createElement("span");
    indicador.textContent = " (buscando dados...)";
    indicador.className = "cnpj-buscando";
    inputCnpj.parentElement.querySelector("label").appendChild(indicador);

    try {
        const resposta = await fetch(`https://brasilapi.com.br/api/cnpj/v1/${cnpjLimpo}`);
        if (!resposta.ok) throw new Error("CNPJ não encontrado na Receita Federal.");

        const dados = await resposta.json();
        preencherComDadosReceita(dados);
        mostrarAviso("Dados da empresa preenchidos automaticamente. Confira antes de enviar.", "sucesso");
    } catch (erro) {
        console.error("Erro ao buscar CNPJ:", erro);
        mostrarAviso("Não foi possível buscar os dados desse CNPJ automaticamente. Preencha manualmente.", "aviso");
    } finally {
        indicador.remove();
    }
}

function preencherSeVazio(id, valor) {
    if (!valor) return;
    const campo = document.getElementById(id);
    if (campo && !campo.value) campo.value = valor;
}

function preencherComDadosReceita(dados) {
    preencherSeVazio("razaoSocial", dados.razao_social);
    preencherSeVazio("nomeFantasia", dados.nome_fantasia);
    preencherSeVazio("dataFundacao", dados.data_inicio_atividade);
    preencherSeVazio("segmentoAtividade", dados.cnae_fiscal_descricao);

    const endereco = [dados.logradouro, dados.numero, dados.complemento].filter(Boolean).join(", ");
    preencherSeVazio("endereco", endereco);
    preencherSeVazio("bairro", dados.bairro);
    preencherSeVazio("cidade", dados.municipio);
    preencherSeVazio("cep", dados.cep);

    const ufCampo = document.getElementById("uf");
    if (ufCampo && !ufCampo.value && dados.uf) ufCampo.value = dados.uf;

    if (dados.ddd_telefone_1) {
        preencherSeVazio("telefone", dados.ddd_telefone_1);
    }
    preencherSeVazio("email", dados.email);
}

function configurarNomesArquivos() {
    document.querySelectorAll(".file-input-oculto").forEach(input => {
        input.addEventListener("change", () => {
            const label = input.closest(".file-upload").querySelector(".file-upload-nome");
            const upload = input.closest(".file-upload");
            if (input.files && input.files.length > 0) {
                label.textContent = input.files[0].name;
                upload.classList.add("arquivo-selecionado");
            } else {
                label.textContent = "Nenhum arquivo selecionado";
                upload.classList.remove("arquivo-selecionado");
            }
        });
    });
}

function montarLinhasReferencias() {
    const container = document.getElementById("referenciasContainer");
    if (!container) return;

    for (let i = 1; i <= 3; i++) {
        const linha = document.createElement("div");
        linha.className = "referencia-row";
        linha.innerHTML = `
            <span class="referencia-numero">Referência ${i}</span>
            <div class="referencia-campos">
                <div class="form-group"><label>Empresa / Fornecedor</label><input type="text" class="ref-empresa"></div>
                <div class="form-group"><label>CNPJ</label><input type="text" class="ref-cnpj"></div>
                <div class="form-group"><label>Contato</label><input type="text" class="ref-contato"></div>
                <div class="form-group"><label>Telefone</label><input type="tel" class="ref-telefone"></div>
                <div class="form-group"><label>Desde quando compra</label><input type="text" class="ref-desde" placeholder="Ex: 2022"></div>
            </div>
        `;
        container.appendChild(linha);
    }
}

function coletarReferencias() {
    const linhas = document.querySelectorAll("#referenciasContainer .referencia-row");
    const referencias = [];

    linhas.forEach(linha => {
        const empresa = linha.querySelector(".ref-empresa").value.trim();
        const cnpj = linha.querySelector(".ref-cnpj").value.trim();
        const contato = linha.querySelector(".ref-contato").value.trim();
        const telefone = linha.querySelector(".ref-telefone").value.trim();
        const desdeQuando = linha.querySelector(".ref-desde").value.trim();

        if (empresa || cnpj || contato || telefone || desdeQuando) {
            referencias.push({ empresa, cnpj, contato, telefone, desde_quando: desdeQuando });
        }
    });

    return referencias;
}

async function enviarDocumento(inputId, pastaCliente) {
    const input = document.getElementById(inputId);
    if (!input || !input.files || input.files.length === 0) return null;

    const ficheiro = input.files[0];
    const extensao = ficheiro.name.split('.').pop();
    const caminho = `${pastaCliente}/${inputId}.${extensao}`;

    const { error } = await clienteDB.storage.from('documentos_credito').upload(caminho, ficheiro);
    if (error) throw error;

    return caminho;
}

async function enviarCadastro(event) {
    event.preventDefault();

    if (!clienteDB) {
        mostrarAviso("Erro de ligação ao banco. Recarregue a página.", "erro");
        return;
    }

    const btn = document.getElementById("btnCadastrar");
    btn.innerText = "Enviando...";
    btn.disabled = true;

    try {
        const cnpj = document.getElementById("cnpj").value.trim();
        const cnpjLimpo = cnpj.replace(/[^a-zA-Z0-9]/g, '') || 'sem_cnpj';
        const pastaCliente = `${cnpjLimpo}_${Date.now()}`;

        const [docCartaoCnpj, docContratoSocial, docDocumentoResponsavel, docComprovanteEndereco, docDadosBancarios] = await Promise.all([
            enviarDocumento("docCartaoCnpj", pastaCliente),
            enviarDocumento("docContratoSocial", pastaCliente),
            enviarDocumento("docDocumentoResponsavel", pastaCliente),
            enviarDocumento("docComprovanteEndereco", pastaCliente),
            enviarDocumento("docDadosBancarios", pastaCliente)
        ]);

        const valorOuNulo = (id) => document.getElementById(id).value.trim() || null;
        const radioSelecionado = (nome) => {
            const el = document.querySelector(`input[name="${nome}"]:checked`);
            return el ? el.value : null;
        };

        const payload = {
            razao_social: valorOuNulo("razaoSocial"),
            nome_fantasia: valorOuNulo("nomeFantasia"),
            cnpj: cnpj,
            inscricao_estadual: valorOuNulo("inscricaoEstadual"),
            data_fundacao: valorOuNulo("dataFundacao"),
            segmento_atividade: valorOuNulo("segmentoAtividade"),
            qtd_funcionarios: valorOuNulo("qtdFuncionarios"),
            endereco: valorOuNulo("endereco"),
            bairro: valorOuNulo("bairro"),
            cidade: valorOuNulo("cidade"),
            uf: valorOuNulo("uf"),
            cep: valorOuNulo("cep"),
            telefone: valorOuNulo("telefone"),
            email: valorOuNulo("email"),
            site: valorOuNulo("site"),
            responsavel_compras: valorOuNulo("responsavelCompras"),
            cargo_compras: valorOuNulo("cargoCompras"),
            email_financeiro: valorOuNulo("emailFinanceiro"),
            telefone_financeiro: valorOuNulo("telefoneFinanceiro"),
            responsavel_legal: valorOuNulo("responsavelLegal"),
            cargo_responsavel_legal: valorOuNulo("cargoResponsavelLegal"),
            contato_responsavel_legal: valorOuNulo("contatoResponsavelLegal"),

            limite_credito_pretendido: valorOuNulo("limiteCredito"),
            volume_medio_mensal: valorOuNulo("volumeMedio"),
            finalidade_compras: valorOuNulo("finalidadeCompras"),
            prazo_pagamento_pretendido: valorOuNulo("prazoPagamento"),
            forma_pagamento_habitual: valorOuNulo("formaPagamento"),

            referencias: coletarReferencias(),

            possui_compras_faturadas: radioSelecionado("possuiComprasFaturadas"),
            atrasos_relevantes: radioSelecionado("atrasosRelevantes"),
            protestos_pendencias: radioSelecionado("protestosPendencias"),

            doc_cartao_cnpj: docCartaoCnpj,
            doc_contrato_social: docContratoSocial,
            doc_documento_responsavel: docDocumentoResponsavel,
            doc_comprovante_endereco: docComprovanteEndereco,
            doc_dados_bancarios: docDadosBancarios,

            nome_responsavel_autorizacao: valorOuNulo("nomeResponsavelAutorizacao"),
            aceite_autorizacao: document.getElementById("aceiteAutorizacao").checked,
            data_autorizacao: new Date().toISOString().slice(0, 10),

            status: 'pendente'
        };

        const { error } = await clienteDB.from('solicitacoes_credito').insert([payload]);
        if (error) throw error;

        mostrarAviso("Ficha enviada com sucesso! Nossa equipe entrará em contato após a análise.", "sucesso");
        document.getElementById("formCadastroCliente").reset();
        document.querySelectorAll(".file-upload").forEach(upload => {
            upload.classList.remove("arquivo-selecionado");
            upload.querySelector(".file-upload-nome").textContent = "Nenhum arquivo selecionado";
        });
    } catch (erro) {
        console.error("Erro ao enviar cadastro:", erro);
        mostrarAviso("Erro ao enviar cadastro: " + erro.message, "erro");
    } finally {
        btn.innerText = "Enviar Ficha de Cadastro";
        btn.disabled = false;
    }
}

function mostrarAviso(mensagem, tipo = 'aviso') {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast-moderno toast-${tipo}`;

    let icone = '⚠️';
    if (tipo === 'sucesso') icone = '✅';
    if (tipo === 'erro') icone = '❌';

    const spanIcone = document.createElement('span');
    spanIcone.style.fontSize = '1.2rem';
    spanIcone.textContent = icone;

    const spanTexto = document.createElement('span');
    spanTexto.textContent = mensagem;

    toast.appendChild(spanIcone);
    toast.appendChild(spanTexto);

    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add('mostrar');
    }, 10);

    setTimeout(() => {
        toast.classList.remove('mostrar');
        setTimeout(() => toast.remove(), 400);
    }, 3500);
}
