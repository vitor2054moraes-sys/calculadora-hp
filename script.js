const visor = document.getElementById('visor');

/* ===================== HISTÓRICO ===================== */
let historico = JSON.parse(localStorage.getItem('historicoCalc')) || [];

function salvarNoHistorico(expressao, resultado) {
    historico.unshift({ expr: expressao, res: resultado });
    if (historico.length > 10) historico = historico.slice(0, 10);
    localStorage.setItem('historicoCalc', JSON.stringify(historico));
    renderizarHistorico();
}

function renderizarHistorico() {
    const lista = document.getElementById('lista-historico');
    if (historico.length === 0) {
        lista.innerHTML = '<li class="vazio">Nenhum cálculo ainda.</li>';
        return;
    }
    lista.innerHTML = historico.map((item, idx) => `
        <li onclick="usarHistorico(${idx})">
            <span class="expr">${item.expr} =</span>
            <span class="res">${item.res}</span>
        </li>
    `).join('');
}

function usarHistorico(idx) {
    visor.value = historico[idx].res;
}

function limparHistorico() {
    historico = [];
    localStorage.removeItem('historicoCalc');
    renderizarHistorico();
}
renderizarHistorico();

/* ===================== TEMA CLARO/ESCURO ===================== */
function alternarTema() {
    document.body.classList.toggle('tema-claro');
    const claro = document.body.classList.contains('tema-claro');
    document.getElementById('btn-tema').textContent = claro ? '☀️' : '🌙';
    localStorage.setItem('tema', claro ? 'claro' : 'escuro');
}

function carregarTema() {
    if (localStorage.getItem('tema') === 'claro') {
        document.body.classList.add('tema-claro');
        document.getElementById('btn-tema').textContent = '☀️';
    }
}
carregarTema();

/* ===================== MODO COMUM ===================== */
function adicionar(valor) { visor.value += valor; }
function limpar() { visor.value = ''; }
function apagar() { visor.value = visor.value.slice(0, -1); }

function porcentagem() {
    try {
        const r = eval(visor.value) / 100;
        visor.value = isFinite(r) ? r : 'Erro';
    } catch { visor.value = 'Erro'; }
}

function calcular() {
    const expressao = visor.value;
    if (expressao.trim() === '') return;
    try {
        const resultado = eval(expressao);
        if (!isFinite(resultado)) { visor.value = 'Erro'; return; }
        visor.value = resultado;
        salvarNoHistorico(expressao, resultado);
    } catch {
        visor.value = 'Erro';
    }
}

/* ===================== MODO CIENTÍFICO ===================== */
function cientifica(funcao) {
    try {
        let x = parseFloat(eval(visor.value));
        let r;
        let nomeFunc = funcao;
        switch (funcao) {
            case 'sin':  r = Math.sin(x * Math.PI / 180); break;
            case 'cos':  r = Math.cos(x * Math.PI / 180); break;
            case 'tan':  r = Math.tan(x * Math.PI / 180); break;
            case 'sqrt': r = Math.sqrt(x); nomeFunc = '√'; break;
            case 'log':  r = Math.log10(x); break;
            case 'ln':   r = Math.log(x); break;
            case 'fatorial':
                r = 1;
                for (let k = 2; k <= x; k++) r *= k;
                break;
        }
        if (!isFinite(r)) { visor.value = 'Erro'; return; }
        const resultado = parseFloat(r.toFixed(10));
        const expr = funcao === 'fatorial' ? `${x}!` : `${nomeFunc}(${x})`;
        visor.value = resultado;
        salvarNoHistorico(expr, resultado);
    } catch {
        visor.value = 'Erro';
    }
}

/* ===================== TROCA DE MODO ===================== */
function trocarModo(modo) {
    const modos = ['comum', 'cientifico', 'financeiro', 'taxas', 'amortizacao'];
    const titulos = {
        comum: 'Calculadora',
        cientifico: 'Calculadora Científica',
        financeiro: 'Financeira (HP 12C)',
        taxas: 'Conversão de Taxas',
        amortizacao: 'Tabela de Amortização'
    };

    modos.forEach(m => {
        document.getElementById('painel-' + m).classList.add('oculto');
        document.getElementById('m-' + m).classList.remove('ativo');
    });

    document.getElementById('painel-' + modo).classList.remove('oculto');
    document.getElementById('m-' + modo).classList.add('ativo');
    document.getElementById('titulo').textContent = titulos[modo];

    const ehBasico = (modo === 'comum' || modo === 'cientifico');
    visor.style.display = ehBasico ? 'block' : 'none';
    document.getElementById('historico').classList.toggle('oculto', !ehBasico);
}

/* ===================== MODO FINANCEIRO ===================== */
function lerValor(id) {
    const v = document.getElementById(id).value;
    return v === '' ? null : parseFloat(v);
}

function calcularFinanceiro(alvo) {
    let n   = lerValor('n');
    let i   = lerValor('i');
    let pv  = lerValor('pv');
    let pmt = lerValor('pmt');
    let fv  = lerValor('fv');

    if (alvo !== 'i' && (i === null || i === 0)) {
        document.getElementById('resultado-fin').textContent = 'Informe uma taxa (i) maior que zero.';
        return;
    }

    const taxa = i !== null ? i / 100 : null;
    let resultado;

    try {
        switch (alvo) {
            case 'fv':
                resultado = -(pv * Math.pow(1 + taxa, n) +
                    (pmt || 0) * ((Math.pow(1 + taxa, n) - 1) / taxa));
                document.getElementById('fv').value = resultado.toFixed(2);
                break;
            case 'pv':
                resultado = -((fv || 0) / Math.pow(1 + taxa, n) +
                    (pmt || 0) * ((1 - Math.pow(1 + taxa, -n)) / taxa));
                document.getElementById('pv').value = resultado.toFixed(2);
                break;
            case 'pmt':
                resultado = -((pv * Math.pow(1 + taxa, n) + (fv || 0)) /
                    ((Math.pow(1 + taxa, n) - 1) / taxa));
                document.getElementById('pmt').value = resultado.toFixed(2);
                break;
            case 'n':
                resultado = Math.log(((pmt || 0) - (fv || 0) * taxa) /
                    ((pmt || 0) + pv * taxa)) / Math.log(1 + taxa);
                document.getElementById('n').value = resultado.toFixed(2);
                break;
            case 'i':
                resultado = calcularTaxa(n, pv, pmt || 0, fv || 0);
                document.getElementById('i').value = resultado.toFixed(4);
                break;
        }
        if (!isFinite(resultado)) throw new Error();
        const valor = document.getElementById(alvo).value;
        document.getElementById('resultado-fin').textContent = `${alvo.toUpperCase()} = ${valor}`;
    } catch {
        document.getElementById('resultado-fin').textContent = 'Verifique os dados informados.';
    }
}

function calcularTaxa(n, pv, pmt, fv) {
    let taxa = 0.01;
    for (let k = 0; k < 1000; k++) {
        const f = pv * Math.pow(1 + taxa, n) +
            pmt * ((Math.pow(1 + taxa, n) - 1) / taxa) + fv;
        const df = (pv * n * Math.pow(1 + taxa, n - 1)) +
            pmt * ((n * Math.pow(1 + taxa, n - 1) * taxa -
            (Math.pow(1 + taxa, n) - 1)) / (taxa * taxa));
        const nova = taxa - f / df;
        if (Math.abs(nova - taxa) < 1e-8) break;
        taxa = nova;
    }
    return taxa * 100;
}

function limparFinanceiro() {
    ['n', 'i', 'pv', 'pmt', 'fv'].forEach(id => document.getElementById(id).value = '');
    document.getElementById('resultado-fin').textContent = '';
}

/* ===================== CONVERSÃO DE TAXAS ===================== */
function converterTaxa() {
    const valor = lerValor('taxa-valor');
    const de    = parseFloat(document.getElementById('taxa-de').value);
    const para  = parseFloat(document.getElementById('taxa-para').value);

    if (valor === null) {
        document.getElementById('resultado-taxa').textContent = 'Informe a taxa.';
        return;
    }

    const i = valor / 100;
    const equivalente = (Math.pow(1 + i, para / de) - 1) * 100;

    document.getElementById('resultado-taxa').innerHTML =
        `Taxa equivalente: <strong>${equivalente.toFixed(6)}%</strong>`;
}

/* ===================== TABELA DE AMORTIZAÇÃO ===================== */
function gerarAmortizacao() {
    const pv = lerValor('am-pv');
    const i  = lerValor('am-i') / 100;
    const n  = lerValor('am-n');
    const sistema = document.getElementById('am-sistema').value;
    const div = document.getElementById('resultado-am');

    if (!pv || !i || !n) {
        div.innerHTML = '<p class="dica">Preencha todos os campos.</p>';
        return;
    }

    let linhas = '';
    let saldo = pv;
    let totalJuros = 0, totalAmort = 0, totalParcela = 0;

    if (sistema === 'price') {
        const pmt = pv * (i * Math.pow(1 + i, n)) / (Math.pow(1 + i, n) - 1);
        for (let k = 1; k <= n; k++) {
            const juros = saldo * i;
            const amort = pmt - juros;
            saldo -= amort;
            totalJuros += juros; totalAmort += amort; totalParcela += pmt;
            linhas += linha(k, pmt, juros, amort, Math.abs(saldo) < 0.01 ? 0 : saldo);
        }
    } else {
        const amort = pv / n;
        for (let k = 1; k <= n; k++) {
            const juros = saldo * i;
            const parcela = amort + juros;
            saldo -= amort;
            totalJuros += juros; totalAmort += amort; totalParcela += parcela;
            linhas += linha(k, parcela, juros, amort, Math.abs(saldo) < 0.01 ? 0 : saldo);
        }
    }

    div.innerHTML = `
        <table>
            <thead>
                <tr><th>#</th><th>Parcela</th><th>Juros</th><th>Amort.</th><th>Saldo</th></tr>
            </thead>
            <tbody>
                ${linhas}
                <tr class="total">
                    <td>Σ</td>
                    <td>${fmt(totalParcela)}</td>
                    <td>${fmt(totalJuros)}</td>
                    <td>${fmt(totalAmort)}</td>
                    <td>—</td>
                </tr>
            </tbody>
        </table>`;
}

function linha(k, parcela, juros, amort, saldo) {
    return `<tr>
        <td>${k}</td>
        <td>${fmt(parcela)}</td>
        <td>${fmt(juros)}</td>
        <td>${fmt(amort)}</td>
        <td>${fmt(saldo)}</td>
    </tr>`;
}

function fmt(v) {
    return v.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

/* ===================== TECLADO ===================== */
document.addEventListener('keydown', (e) => {
    const comumVisivel = !document.getElementById('painel-comum').classList.contains('oculto');
    const sciVisivel = !document.getElementById('painel-cientifico').classList.contains('oculto');
    if (!comumVisivel && !sciVisivel) return;

    if (/[0-9+\-*/.()]/.test(e.key)) adicionar(e.key);
    if (e.key === 'Enter') { e.preventDefault(); calcular(); }
    if (e.key === 'Backspace') apagar();
    if (e.key === 'Escape') limpar();
});
