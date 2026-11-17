# Cifra — calculadora comum, científica e financeira

**Cifra** (antes "Calculadora HP Completa") é uma calculadora web com **5 modos**, inspirada na clássica HP 12C. O nome
junta os números (cifras) e o cifrão da parte financeira. Feita com HTML, CSS e JavaScript puro — sem dependências.

🔗 **Demo:** <https://vitor2054moraes-sys.github.io/calculadora-hp/>

## Modos

| Modo | O que faz |
|---|---|
| **Comum** | Soma, subtração, multiplicação, divisão e porcentagem |
| **Científica** | sin, cos, tan (em graus), raiz, log, ln, potência, fatorial, π e e |
| **Financeira (HP 12C)** | Calcula `n`, `i`, `PV`, `PMT` e `FV` com juros compostos (o que sai do bolso vai negativo) |
| **Taxas** | Converte taxas entre diária, mensal, trimestral, semestral e anual (ano de 360 dias) |
| **Amortização** | Tabela completa nos sistemas **Price** e **SAC** (até 600 parcelas) |

Mais: **histórico** dos últimos 10 cálculos (toque para reaproveitar), **tema claro/escuro** lembrado, **teclado** nos
modos Comum e Científica (números, `+ - * / ^ ( )`, Enter, Backspace, Esc, %) e layout feito para o celular.

## O que mudou nesta versão

- **Segurança:** a calculadora usava `eval()`, que roda como programa o que estiver no visor — e o histórico guardado no
  navegador voltava para o visor. Agora a conta é lida por um analisador próprio, que só aceita números, operações,
  parênteses, π e e; o histórico é conferido ao abrir; a tela é montada sem `innerHTML`; e a página só carrega
  arquivos dela mesma (Content-Security-Policy).
- **Contas certas:** 0,1 + 0,2 = 0,3 (sem o "0,30000000000000004"); fatorial só de inteiros de 0 a 170; tangente de 90°
  dá erro; a financeira diz qual campo falta e quando os sinais não fecham.
- **Sem travar:** a amortização aceita até 600 parcelas.
- **Visual:** cores lisas, "=" largo, o histórico abre com um toque (tela mais curta), modos numa linha que rola.
- O `file.md` (uma cópia antiga deste README, com links errados) saiu.

## Como usar

Abra o `index.html` no navegador ou a demo acima.

```bash
git clone https://github.com/vitor2054moraes-sys/calculadora-hp.git
```

## Arquivos

`index.html` (a página) · `style.css` (a aparência; cores dos dois temas no começo) · `script.js` (o analisador de
contas, os modos e o histórico) · `icone.svg` (o ícone).
