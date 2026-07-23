// =========================================
// ANIMADOR DE CONTADORES (HOME)
// =========================================
document.addEventListener("DOMContentLoaded", () => {
    const contadores = document.querySelectorAll('.stat-numero');
    let jaRodou = false;

    function iniciarContadores() {
        if (jaRodou) return;
        jaRodou = true;

        const duracao = 2000; // Tempo total da animação em milissegundos (2 segundos)

        contadores.forEach(contador => {
            const alvo = parseInt(contador.getAttribute('data-alvo'));
            const incremento = alvo / (duracao / 16); // 16ms é a taxa de atualização de tela padrão (60fps)
            let atual = 0;

            const atualizarContador = () => {
                atual += incremento;
                if (atual < alvo) {
                    // Se for o 100 da garantia, podemos adicionar um "%" no final se quiser, 
                    // mas mantemos simples rodando apenas o número inteiro:
                    contador.textContent = Math.floor(atual) + (alvo === 100 ? '%' : '+');
                    requestAnimationFrame(atualizarContador);
                } else {
                    contador.textContent = alvo + (alvo === 100 ? '%' : '+');
                }
            };

            atualizarContador();
        });
    }

    // Dispara a animação assim que a seção dos contadores aparece na tela do usuário
    const secaoEstatisticas = document.querySelector('.estatisticas-precisa');
    if (secaoEstatisticas) {
        const observer = new IntersectionObserver((entries, observer) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    iniciarContadores();
                    observer.unobserve(entry.target);
                }
            });
        }, { threshold: 0.5 }); // Dispara quando 50% da seção estiver visível

        observer.observe(secaoEstatisticas);
    }
});