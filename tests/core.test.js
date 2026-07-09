const assert = require('assert');
const C = require('../core.js');

function approx(actual, expected, msg){
  assert.strictEqual(Number(actual.toFixed(2)), Number(expected.toFixed(2)), msg || `${actual} !== ${expected}`);
}

// Parser BR: meta grande não pode virar centavos.
approx(C.parseCurrencyBR('100000'), 100000, '100000 deve ser 100.000,00');
approx(C.parseCurrencyBR('100000,00'), 100000, '100000,00 deve ser 100.000,00');
approx(C.parseCurrencyBR('100.000,00'), 100000, '100.000,00 deve ser 100.000,00');
approx(C.parseCurrencyBR('R$ 100.000,99'), 100000.99, 'R$ 100.000,99 deve ser 100000.99');
approx(C.parseCurrencyBR('1.234,56'), 1234.56, '1.234,56 deve ser 1234.56');
approx(C.parseCurrencyBR('1234.56'), 1234.56, '1234.56 deve ser 1234.56');

// Máscara visual única dos campos monetários: centavos sobem ao digitar.
assert.strictEqual(C.currencyInputFromCentsDigits('1'), '0,01');
assert.strictEqual(C.currencyInputFromCentsDigits('12'), '0,12');
assert.strictEqual(C.currencyInputFromCentsDigits('123'), '1,23');
assert.strictEqual(C.currencyInputFromCentsDigits('1234'), '12,34');
assert.strictEqual(C.currencyInputFromCentsDigits('123456'), '1.234,56');
assert.strictEqual(C.currencyInputFromCentsDigits('R$ 1.234,56'), '1.234,56');
assert.strictEqual(C.normalizeCurrencyInputDisplay('100.000,00'), '100.000,00');

let state = C.defaultState();
state.settings.goal.target = 100000;
state.settings.goal.due = '2028-12-31';
state.patrimonio.push(C.normalizeSnapshot({
  id:'pat1', data:'2026-07-08', createdAt:'2026-07-08T08:00:00.000Z',
  futuro:1000, giro:500, carteira:100, banco:400, investimentos:0,
  faturaAberta:300, outrasDividas:0
}));

let b = C.calculateBalances(state, {asOfDate:'2026-07-08'});
approx(b.bruto, 2000, 'bruto inicial');
approx(b.liquido, 1700, 'liquido inicial');

state.movements.push(C.normalizeMovement({
  id:'mov1', type:'entrada', data:'2026-07-08', createdAt:'2026-07-08T09:00:00.000Z',
  account:'banco', value:200, description:'Entrada teste'
}));
state.movements.push(C.normalizeMovement({
  id:'mov2', type:'cartao', data:'2026-07-08', createdAt:'2026-07-08T10:00:00.000Z',
  value:100, description:'Mercado cartão'
}));
state.movements.push(C.normalizeMovement({
  id:'mov3', type:'pagamento_cartao', data:'2026-07-08', createdAt:'2026-07-08T11:00:00.000Z',
  account:'banco', value:150, description:'Pagamento parcial'
}));
state.movements.push(C.normalizeMovement({
  id:'mov4', type:'ifood_dinheiro', data:'2026-07-08', createdAt:'2026-07-08T12:00:00.000Z',
  received:50, change:17.28, description:'iFood dinheiro'
}));
state.movements.push(C.normalizeMovement({
  id:'mov5', type:'rendimento', data:'2026-07-08', createdAt:'2026-07-08T13:00:00.000Z',
  account:'futuro', value:3.50, description:'CDI Futuro'
}));
state.movements.push(C.normalizeMovement({
  id:'mov6', type:'transferencia', data:'2026-07-08', createdAt:'2026-07-08T14:00:00.000Z',
  fromAccount:'banco', toAccount:'giro', value:100, description:'Banco para Giro'
}));

b = C.calculateBalances(state, {asOfDate:'2026-07-08'});
approx(b.assets.banco, 350, 'banco depois entrada, pagamento e transferência');
approx(b.assets.giro, 582.72, 'giro depois troco e transferência');
approx(b.assets.carteira, 150, 'carteira depois iFood');
approx(b.assets.futuro, 1003.50, 'futuro depois rendimento');
approx(b.faturaAberta, 250, 'fatura depois compra e pagamento');
approx(b.bruto, 2086.22, 'bruto depois movimentos');
approx(b.liquido, 1836.22, 'liquido depois movimentos');

const summary = C.getMonthlySummary(state, '2026-07-08');
approx(summary.income, 232.72, 'entrada + iFood líquido');
approx(summary.expense, 100, 'cartão como despesa do mês');
approx(summary.yield, 3.50, 'rendimento separado');
approx(summary.netWork, 132.72, 'saldo do trabalho sem rendimento');

const g1 = C.calculateGoal(state, '2026-07-08');
state.settings.goal.due = '2026-08-08';
const g2 = C.calculateGoal(state, '2026-07-08');
assert.ok(g2.monthlyRequired > g1.monthlyRequired, 'prazo mais curto deve aumentar ritmo mensal');

const validation = C.validateState(state);
assert.strictEqual(validation.ok, true, validation.problems.join('\n'));

const exported = {data: state};
const migrated = C.migrateState(exported);
assert.strictEqual(migrated.settings.goal.target, 100000);
assert.strictEqual(migrated.movements.length, 6);

console.log('Todos os testes do core v13.01 passaram.');
