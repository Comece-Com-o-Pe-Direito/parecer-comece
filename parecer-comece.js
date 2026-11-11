/* Parecer Técnico · Comece Hub — paginação automática, numeração, sumário e cabeçalhos. */
// Paginação de segurança. Ao abrir o arquivo, o script:
// 1) mede cada folha e move para uma folha nova tudo que passaria do rodapé
//    (tabelas são divididas por linhas; abertura de seção e conclusão nunca ficam sozinhas no pé);
// 2) renumera os rodapés, o sumário e o nome da seção no cabeçalho de cada folha;
// 3) marca em vermelho (só na tela) uma folha que ainda não caiba, caso exista um bloco maior que a folha.
(function () {
  const MM = 96 / 25.4;
  const FOLGA = 3 * MM; // distância mínima entre o último bloco e o rodapé

  const folhas = () => Array.from(document.querySelectorAll('.folha'));
  const conteudo = (folha) => Array.from(folha.children).filter((el) => !el.matches('.cabecalho, .rodape'));
  const colado = (el) => el.matches('.aviso-legal, .sumario'); // encostados no pé da folha
  const limite = (folha) => folha.querySelector('.rodape').getBoundingClientRect().top - FOLGA;

  function passou(el, folha) {
    const r = el.getBoundingClientRect();
    if (colado(el)) {
      const margem = parseFloat(getComputedStyle(el).marginBottom) || 0;
      return r.bottom + margem > folha.getBoundingClientRect().bottom + 1;
    }
    return r.bottom > limite(folha);
  }

  // Tabela comprida: mantém as linhas que cabem e leva as demais para uma cópia com o mesmo cabeçalho.
  function dividirTabela(tabela, folha) {
    const linhas = Array.from(tabela.tBodies[0].rows);
    const teto = limite(folha);
    const k = linhas.findIndex((tr) => tr.getBoundingClientRect().bottom > teto);
    if (k < 1) return null;
    const resto = tabela.cloneNode(false);
    if (tabela.tHead) resto.appendChild(tabela.tHead.cloneNode(true));
    const corpo = document.createElement('tbody');
    linhas.slice(k).forEach((tr) => corpo.appendChild(tr));
    resto.appendChild(corpo);
    tabela.after(resto);
    return resto;
  }

  function paginar() {
    for (let i = 0; i < folhas().length; i++) {
      const folha = folhas()[i];
      if (!folha.querySelector('.rodape')) continue;
      let itens = conteudo(folha);
      let corte = itens.findIndex((el) => passou(el, folha));
      if (corte === -1) continue;

      if (itens[corte].matches('table.matriz')) {
        const resto = dividirTabela(itens[corte], folha);
        if (resto) { itens = conteudo(folha); corte = itens.indexOf(resto); }
      }

      // abertura de seção e conclusão vão junto com o que vem depois
      let k = corte;
      while (k > 0 && itens[k - 1].matches('.secao, .conclusao')) k--;
      if (k === 0) k = corte;
      if (k === 0) k = 1; // o primeiro item não cabe nem sozinho: o resto segue adiante
      const mover = itens.slice(k);
      if (!mover.length) continue;

      const nova = document.createElement('section');
      nova.className = 'folha';
      nova.appendChild(folha.querySelector('.cabecalho').cloneNode(true));
      mover.forEach((el) => nova.appendChild(el));
      nova.appendChild(folha.querySelector('.rodape').cloneNode(true));
      folha.after(nova);
    }
  }

  function numerar() {
    const todas = folhas();
    const paginaDaSecao = {};
    let nome = '';
    todas.forEach((folha, i) => {
      const itens = conteudo(folha);
      const pagina = folha.querySelector('.rodape > .pagina');
      if (pagina) pagina.textContent = (i + 1) + ' / ' + todas.length;

      if (i > 0) {
        if (itens[0] && itens[0].dataset.nome) nome = itens[0].dataset.nome;
        const direita = folha.querySelector('.cabecalho > div:last-child');
        if (direita && nome) direita.textContent = nome;
      }
      itens.forEach((el) => {
        if (el.dataset.nome) nome = el.dataset.nome;
        if (el.dataset.secao && !(el.dataset.secao in paginaDaSecao)) paginaDaSecao[el.dataset.secao] = i + 1;
      });
    });
    document.querySelectorAll('.sumario li[data-secao]').forEach((li) => {
      const pg = li.querySelector('.pg');
      const n = paginaDaSecao[li.dataset.secao];
      if (pg && n) pg.textContent = n;
    });
  }

  function marcar() {
    folhas().forEach((folha) => {
      if (!folha.querySelector('.rodape')) return;
      folha.classList.toggle('transborda', conteudo(folha).some((el) => passou(el, folha)));
    });
  }

  function ajustar() { paginar(); numerar(); marcar(); }

  window.addEventListener('load', () => document.fonts.ready.then(ajustar));
  window.addEventListener('beforeprint', ajustar);
})();
