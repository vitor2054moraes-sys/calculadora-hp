"use strict";
// Cifra — calculadora comum, científica e financeira (HP 12C), conversão de taxas e amortização.
// Segurança: a conta é lida por um analisador próprio (só números, + − × ÷ ^, parênteses, π e e). Antes era eval(),
// que rodaria como programa qualquer texto que chegasse ao visor — inclusive um histórico adulterado no navegador.
// A tela é montada pelo DOM (nada de innerHTML).

const $ = (id) => document.getElementById(id);
function el(tag, atributos = {}, ...filhos) {
    const no = document.createElement(tag);
    for (const [nome, valor] of Object.entries(atributos)) {
        if (valor === null || valor === undefined || valor === false) continue;
        if (nome.startsWith("on")) no.addEventListener(nome.slice(2), valor);
        else if (nome === "class") no.className = valor;
        else no.setAttribute(nome, valor);
    }
    no.append(...filhos.flat().filter((f) => f !== null && f !== undefined && f !== false));
    return no;
}
function ler(chave, padrao) {
    try { return JSON.parse(localStorage.getItem(chave)) ?? padrao; } catch { return padrao; }
}
function gravar(chave, valor) {
    try { localStorage.setItem(chave, JSON.stringify(valor)); } catch { /* sem armazenamento: só não lembra */ }
}

/* ===================== ANALISADOR DE CONTAS (no lugar do eval) ===================== */
// Gramática:  soma := produto (('+'|'−') produto)*     produto := sinal (('×'|'÷') sinal | sinal implícito)*
//             sinal := ('−'|'+') sinal | potencia       potencia := atomo ('^' sinal)?
//             atomo := número | π | e | '(' soma ')'
// "2π" e "3(4+1)" multiplicam sozinhos; −2^2 = −4, como na matemática.
function calcularExpressao(texto) {
    const fichas = texto.replace(/\s+/g, "").replace(/\*\*/g, "^").replace(/\*/g, "×").replace(/\//g, "÷").replace(/-/g, "−")
        .match(/\d+\.?\d*|\.\d+|[+−×÷^()πe]|./g) || [];
    let pos = 0;
    const olhar = () => fichas[pos];
    const pegar = (esperado) => {
        if (esperado !== undefined && fichas[pos] !== esperado) throw new Error("conta incompleta");
        return fichas[pos++];
    };
    const comecaAtomo = (f) => f !== undefined && (/^[\d.]/.test(f) || f === "π" || f === "e" || f === "(");

    function soma() {
        let v = produto();
        while (olhar() === "+" || olhar() === "−") v = pegar() === "+" ? v + produto() : v - produto();
        return v;
    }
    function produto() {
        let v = sinal();
        for (;;) {
            if (olhar() === "×") { pegar(); v *= sinal(); }
            else if (olhar() === "÷") { pegar(); v /= sinal(); }
            else if (comecaAtomo(olhar())) v *= sinal();   // multiplicação implícita: 2π, 3(4)
            else return v;
        }
    }
    function sinal() {
        if (olhar() === "−") { pegar(); return -sinal(); }
        if (olhar() === "+") { pegar(); return sinal(); }
        return potencia();
    }
    function potencia() {
        const base = atomo();
        if (olhar() === "^") { pegar(); return base ** sinal(); }
        return base;
    }
    function atomo() {
        const f = pegar();
        if (f === undefined) throw new Error("conta incompleta");
        if (f === "π") return Math.PI;
        if (f === "e") return Math.E;
        if (f === "(") { const v = soma(); pegar(")"); return v; }
        if (/^(\d+\.?\d*|\.\d+)$/.test(f)) return Number(f);
        throw new Error(`não entendi "${f}"`);
    }

    const v = soma();
    if (pos < fichas.length) throw new Error(`não entendi "${fichas[pos]}"`);
    if (!Number.isFinite(v)) throw new Error("resultado indefinido");
    return v;
}

// Tira o "lixo" da conta com vírgula do computador (0.1 + 0.2 = 0.30000000000000004 → 0.3).
const arredondar = (v) => Number(v.toPrecision(12));

/* ===================== VISOR ===================== */
let entrada = "";          // o que foi digitado
let mostrandoResultado = false;

function mostrar(texto = entrada, conta = "") {
    $("visor").textContent = texto || "0";
    $("conta").textContent = conta;
}

function teclar(valor) {
    const operador = /^[+−×÷^]/.test(valor);
    if (mostrandoResultado && !operador) entrada = "";   // número novo depois de um resultado: começa outra conta
    mostrandoResultado = false;
    if (entrada.length < 80) entrada += valor;
    mostrar();
}
function limpar() { entrada = ""; mostrandoResultado = false; mostrar(); }
function apagar() { entrada = entrada.slice(0, -1); mostrandoResultado = false; mostrar(); }
function erro(texto = "Erro") { mostrar(texto, entrada); entrada = ""; mostrandoResultado = false; }

function calcular() {
    if (!entrada.trim()) return;
    try {
        const resultado = arredondar(calcularExpressao(entrada));
        salvarNoHistorico(entrada, resultado);
        mostrar(String(resultado), `${entrada} =`);
        entrada = String(resultado);
        mostrandoResultado = true;
    } catch {
        erro();
    }
}

function porcentagem() {
    try {
        const r = arredondar(calcularExpressao(entrada || "0") / 100);
        mostrar(String(r), `${entrada} %`);
        entrada = String(r);
        mostrandoResultado = true;
    } catch {
        erro();
    }
}

/* ===================== CIENTÍFICA ===================== */
const FUNCOES = {
    sin: [(x) => Math.sin(x * Math.PI / 180), "sin"],   // graus
    cos: [(x) => Math.cos(x * Math.PI / 180), "cos"],
    tan: [(x) => (Math.abs(x % 180) === 90 ? NaN : Math.tan(x * Math.PI / 180)), "tan"],
    sqrt: [Math.sqrt, "√"],
    log: [Math.log10, "log"],
    ln: [Math.log, "ln"],
    fatorial: [(x) => {
        if (!Number.isInteger(x) || x < 0 || x > 170) return NaN;   // só inteiros de 0 a 170
        let r = 1;
        for (let k = 2; k <= x; k++) r *= k;
        return r;
    }, "!"],
};

function cientifica(nome) {
    try {
        const x = arredondar(calcularExpressao(entrada || "0"));
        const [funcao, simbolo] = FUNCOES[nome];
        const r = funcao(x);
        if (!Number.isFinite(r)) throw new Error();
        const resultado = arredondar(r);
        const expr = nome === "fatorial" ? `${x}!` : `${simbolo}(${x})`;
        salvarNoHistorico(expr, resultado);
        mostrar(String(resultado), `${expr} =`);
        entrada = String(resultado);
        mostrandoResultado = true;
    } catch {
        erro();
    }
}

/* ===================== HISTÓRICO ===================== */
// Lido do navegador e conferido: só textos curtos e números (um histórico mexido não entra).
let historico = (() => {
    const h = ler("historicoCalc", []);
    return Array.isArray(h) ? h.filter((x) => x && typeof x.expr === "string" && x.expr.length <= 120 && Number.isFinite(Number(x.res)))
        .slice(0, 10) : [];
})();

function salvarNoHistorico(expr, res) {
    historico = [{ expr, res }, ...historico].slice(0, 10);
    gravar("historicoCalc", historico);
    desenharHistorico();
}

function desenharHistorico() {
    const lista = $("lista-historico");
    if (!historico.length) { lista.replaceChildren(el("li", { class: "vazio" }, "Nenhum cálculo ainda.")); return; }
    lista.replaceChildren(...historico.map((item) => el("li", {},
        el("button", { type: "button", "aria-label": `Usar ${item.res}`, onclick: () => {
            entrada = String(Number(item.res)); mostrandoResultado = true; mostrar(entrada, `${item.expr} =`);
        } }, el("span", { class: "expr" }, `${item.expr} =`), el("span", { class: "res" }, String(item.res))))));
}

$("limpar-historico").addEventListener("click", () => { historico = []; gravar("historicoCalc", []); desenharHistorico(); });

/* ===================== TEMA ===================== */
function aplicarTema(claro) {
    document.body.classList.toggle("tema-claro", claro);
    const botao = $("btn-tema");
    botao.textContent = claro ? "Escuro" : "Claro";
    botao.setAttribute("aria-label", claro ? "Tema escuro" : "Tema claro");
}
$("btn-tema").addEventListener("click", () => {
    const claro = !document.body.classList.contains("tema-claro");
    aplicarTema(claro);
    try { localStorage.setItem("tema", claro ? "claro" : "escuro"); } catch { /* só não lembra */ }
});
aplicarTema(localStorage.getItem("tema") === "claro");

/* ===================== MODOS ===================== */
const TITULOS = { comum: "Calculadora", cientifico: "Científica", financeiro: "Financeira (HP 12C)", taxas: "Conversão de taxas",
    amortizacao: "Tabela de amortização" };
let modo = "comum";

function trocarModo(novo) {
    modo = novo;
    for (const b of document.querySelectorAll('[role="tab"]')) b.setAttribute("aria-selected", String(b.dataset.modo === novo));
    for (const m of Object.keys(TITULOS)) $(`painel-${m}`).classList.toggle("oculto", m !== novo);
    $("titulo").textContent = TITULOS[novo];
    const basico = novo === "comum" || novo === "cientifico";
    $("area-visor").classList.toggle("oculto", !basico);
    $("historico").classList.toggle("oculto", !basico);
}
for (const b of document.querySelectorAll('[role="tab"]')) b.addEventListener("click", () => trocarModo(b.dataset.modo));

// Teclas da calculadora (um ouvinte para todos os botões).
const ACOES = { limpar, apagar, porcentagem, calcular };
document.querySelector(".calculadora").addEventListener("click", (e) => {
    const b = e.target.closest("button");
    if (!b) return;
    if (b.dataset.tecla) teclar(b.dataset.tecla);
    else if (b.dataset.acao) ACOES[b.dataset.acao]();
    else if (b.dataset.funcao) cientifica(b.dataset.funcao);
});

/* ===================== FINANCEIRA (HP 12C) ===================== */
function lerValor(id) {
    const v = $(id).value;
    return v === "" ? null : Number(v);
}
const resultadoFin = (texto) => { $("resultado-fin").textContent = texto; };
const FALTA = { n: ["i", "pv"], i: ["n", "pv"], pv: ["n", "i"], pmt: ["n", "i", "pv"], fv: ["n", "i", "pv"] };

function calcularFinanceiro(alvo) {
    const v = { n: lerValor("n"), i: lerValor("i"), pv: lerValor("pv"), pmt: lerValor("pmt"), fv: lerValor("fv") };
    const faltando = FALTA[alvo].filter((k) => v[k] === null);
    if (faltando.length) { resultadoFin(`Para calcular ${alvo.toUpperCase()}, preencha: ${faltando.map((k) => k.toUpperCase()).join(", ")}.`); return; }
    if (alvo !== "i" && v.i === 0) { resultadoFin("Informe uma taxa (i) diferente de zero."); return; }
    const taxa = v.i / 100, pmt = v.pmt || 0, fv = v.fv || 0, pv = v.pv || 0, n = v.n;
    const fator = (1 + taxa) ** n;
    let resultado;
    if (alvo === "fv") resultado = -(pv * fator + pmt * ((fator - 1) / taxa));
    else if (alvo === "pv") resultado = -(fv / fator + pmt * ((1 - (1 + taxa) ** -n) / taxa));
    else if (alvo === "pmt") resultado = -((pv * fator + fv) / ((fator - 1) / taxa));
    else if (alvo === "n") resultado = Math.log((pmt - fv * taxa) / (pmt + pv * taxa)) / Math.log(1 + taxa);
    else resultado = calcularTaxa(n, pv, pmt, fv);
    if (!Number.isFinite(resultado)) { resultadoFin("Com esses valores não há resposta. Confira os sinais (o que sai do bolso é negativo)."); return; }
    const casas = alvo === "i" ? 4 : 2;
    $(alvo).value = resultado.toFixed(casas);
    resultadoFin(`${alvo.toUpperCase()} = ${resultado.toLocaleString("pt-BR", { minimumFractionDigits: casas, maximumFractionDigits: casas })}`);
}

// Taxa pelo método de Newton (a mesma conta da HP 12C).
function calcularTaxa(n, pv, pmt, fv) {
    let taxa = 0.01;
    for (let k = 0; k < 1000; k++) {
        const f = pv * (1 + taxa) ** n + pmt * (((1 + taxa) ** n - 1) / taxa) + fv;
        const df = pv * n * (1 + taxa) ** (n - 1) + pmt * ((n * (1 + taxa) ** (n - 1) * taxa - ((1 + taxa) ** n - 1)) / (taxa * taxa));
        const nova = taxa - f / df;
        if (!Number.isFinite(nova)) return NaN;
        if (Math.abs(nova - taxa) < 1e-10) return nova * 100;
        taxa = nova;
    }
    return NaN;   // não chegou a uma resposta
}

for (const b of document.querySelectorAll("[data-alvo]")) b.addEventListener("click", () => calcularFinanceiro(b.dataset.alvo));
$("limpar-financeiro").addEventListener("click", () => {
    for (const id of ["n", "i", "pv", "pmt", "fv"]) $(id).value = "";
    resultadoFin("");
});

/* ===================== CONVERSÃO DE TAXAS ===================== */
$("converter").addEventListener("click", () => {
    const valor = lerValor("taxa-valor");
    const saida = $("resultado-taxa");
    if (valor === null) { saida.textContent = "Informe a taxa."; return; }
    const de = Number($("taxa-de").value), para = Number($("taxa-para").value);
    const equivalente = ((1 + valor / 100) ** (para / de) - 1) * 100;
    saida.replaceChildren("Taxa equivalente: ", el("strong", {}, `${equivalente.toLocaleString("pt-BR", { maximumFractionDigits: 6 })}%`));
});

/* ===================== AMORTIZAÇÃO ===================== */
const fmt = (v) => v.toLocaleString("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 });

$("gerar-tabela").addEventListener("click", () => {
    const pv = lerValor("am-pv"), i = (lerValor("am-i") ?? 0) / 100, n = lerValor("am-n");
    const div = $("resultado-am");
    if (!pv || pv <= 0 || !i || i <= 0 || !Number.isInteger(n) || n < 1 || n > 600) {
        div.replaceChildren(el("p", { class: "dica" }, "Preencha o valor, a taxa (maior que zero) e o número de parcelas (inteiro, de 1 a 600)."));
        return;
    }
    const sistema = $("am-sistema").value, linhas = [];
    let saldo = pv, totalJuros = 0, totalAmort = 0, totalParcela = 0;
    const pmtPrice = pv * (i * (1 + i) ** n) / ((1 + i) ** n - 1);
    for (let k = 1; k <= n; k++) {
        const juros = saldo * i;
        const amort = sistema === "price" ? pmtPrice - juros : pv / n;
        const parcela = sistema === "price" ? pmtPrice : amort + juros;
        saldo -= amort;
        totalJuros += juros; totalAmort += amort; totalParcela += parcela;
        linhas.push(el("tr", {}, ...[k, fmt(parcela), fmt(juros), fmt(amort), fmt(Math.abs(saldo) < 0.01 ? 0 : saldo)].map((c) => el("td", {}, String(c)))));
    }
    div.replaceChildren(el("table", {},
        el("thead", {}, el("tr", {}, ...["#", "Parcela", "Juros", "Amort.", "Saldo"].map((t) => el("th", { scope: "col" }, t)))),
        el("tbody", {}, ...linhas,
            el("tr", { class: "total" }, ...["Total", fmt(totalParcela), fmt(totalJuros), fmt(totalAmort), "—"].map((c) => el("td", {}, c))))));
});

/* ===================== TECLADO (Comum e Científica) ===================== */
document.addEventListener("keydown", (e) => {
    if (modo !== "comum" && modo !== "cientifico") return;
    if (e.target.matches("input, select, textarea") || e.ctrlKey || e.metaKey || e.altKey) return;
    const mapa = { "*": "×", "/": "÷", "-": "−", "+": "+", "^": "^", "(": "(", ")": ")", ".": ".", ",": "." };
    if (/^[0-9]$/.test(e.key)) teclar(e.key);
    else if (mapa[e.key]) { e.preventDefault(); teclar(mapa[e.key]); }
    else if (e.key === "Enter" || e.key === "=") { e.preventDefault(); calcular(); }
    else if (e.key === "Backspace") apagar();
    else if (e.key === "Escape") limpar();
    else if (e.key === "%") porcentagem();
});

desenharHistorico();
mostrar();
