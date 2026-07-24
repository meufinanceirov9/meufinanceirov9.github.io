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

const invalidIfood = C.defaultState();
invalidIfood.movements.push(C.normalizeMovement({id:'bad_ifood', type:'ifood_dinheiro', data:'2026-07-08', received:20, change:30}));
assert.strictEqual(C.validateState(invalidIfood).ok, false, 'troco maior que recebido deve ser sinalizado');

const invalidTransfer = C.defaultState();
invalidTransfer.movements.push(C.normalizeMovement({id:'bad_transfer', type:'transferencia', data:'2026-07-08', fromAccount:'giro', toAccount:'giro', value:10}));
assert.strictEqual(C.validateState(invalidTransfer).ok, false, 'transferência com mesma origem/destino deve ser sinalizada');

const backupV13 = {data:{settings:{goal:{target:100000,due:'2027-12-31'}}, patrimonio:[{data:'2026-07-08',futuro:'14.362,91',giro:'529,47',carteira:'4,00',faturaAberta:'901,36'}], movements:[]}};
const migratedBackup = C.migrateState(backupV13);
assert.strictEqual(migratedBackup.settings.appVersion, 'v13.07');
assert.strictEqual(migratedBackup.settings.goal.due, '2027-12-31');
approx(C.calculateBalances(migratedBackup,{asOfDate:'2026-07-09'}).liquido, 13995.02, 'backup v13 antigo deve migrar preservando liquido');

const snapshotYieldState = C.defaultState();
snapshotYieldState.patrimonio.push(C.normalizeSnapshot({data:'2026-07-01', rendimentoFuturo:7.54, rendimentoGiro:0.26}));
const snapshotYieldSummary = C.getMonthlySummary(snapshotYieldState, '2026-07-09');
approx(snapshotYieldSummary.snapshotYield, 7.80, 'rendimento informado em patrimônio deve entrar no resumo do mês');
approx(snapshotYieldSummary.yield, 7.80, 'yield mensal soma movimentos + rendimento informado nas bases');

const deltaState = C.defaultState();
deltaState.patrimonio.push(C.normalizeSnapshot({id:'p1',data:'2026-07-08',createdAt:'2026-07-08T10:00:00.000Z', futuro:100, giro:50, carteira:0, faturaAberta:0}));
deltaState.patrimonio.push(C.normalizeSnapshot({id:'p2',data:'2026-07-09',createdAt:'2026-07-09T10:00:00.000Z', futuro:107.54, giro:50.26, carteira:0, faturaAberta:0}));
const delta = C.snapshotDeltaDetails(deltaState);
approx(delta.delta, 7.80, 'auditoria deve calcular variação entre bases');
approx(delta.unexplained, 7.80, 'variação sem movimento deve ser sinalizada');
assert.strictEqual(delta.accountDeltas.length, 2, 'auditoria deve listar contas que variaram');


const yieldEstimateState = C.defaultState();
yieldEstimateState.patrimonio.push(C.normalizeSnapshot({id:'y1',data:'2026-07-08',createdAt:'2026-07-08T10:00:00.000Z', futuro:14362.91, giro:529.47, carteira:29, faturaAberta:901.36}));
yieldEstimateState.movements.push(C.normalizeMovement({id:'ym1', type:'entrada', data:'2026-07-09', createdAt:'2026-07-09T12:00:00.000Z', account:'giro', value:45, description:'Entregas'}));
const draftWithIncome = C.normalizeSnapshot({id:'y2',data:'2026-07-09',createdAt:'2026-07-09T18:00:00.000Z', futuro:14370.45, giro:574.73, carteira:29, faturaAberta:901.36});
const estimatedWithIncome = C.estimateSnapshotYields(yieldEstimateState, draftWithIncome, {excludeId:'y2', currentCreatedAt:draftWithIncome.createdAt});
approx(estimatedWithIncome.suggested.futuro, 7.54, 'rendimento Futuro deve ser calculado por diferença');
approx(estimatedWithIncome.suggested.giro, 0.26, 'entrada de 45 no Giro deve ser descontada antes de estimar CDI');
approx(estimatedWithIncome.suggested.total, 7.80, 'rendimento total sugerido deve ignorar entrada lançada');
assert.strictEqual(estimatedWithIncome.movements.length, 1, 'estimativa deve considerar movimento entre bases');

const estimatedNoPrevious = C.estimateSnapshotYields(C.defaultState(), draftWithIncome);
assert.strictEqual(estimatedNoPrevious.ok, false, 'sem base anterior não deve estimar rendimento');

// Atualizar a base do mesmo dia precisa avançar o corte e impedir soma dupla.
const sameDayCaptureState = C.defaultState();
sameDayCaptureState.patrimonio.push(C.normalizeSnapshot({
  id:'capture1', data:'2026-07-21', createdAt:'2026-07-21T08:00:00.000Z',
  updatedAt:'2026-07-21T10:00:00.000Z', capturedAt:'2026-07-21T10:00:00.000Z', futuro:100
}));
sameDayCaptureState.movements.push(C.normalizeMovement({
  id:'before_capture', type:'entrada', data:'2026-07-21', createdAt:'2026-07-21T09:00:00.000Z', account:'futuro', value:20
}));
sameDayCaptureState.movements.push(C.normalizeMovement({
  id:'after_capture', type:'entrada', data:'2026-07-21', createdAt:'2026-07-21T11:00:00.000Z', account:'futuro', value:5
}));
const sameDayBalances = C.calculateBalances(sameDayCaptureState, {asOfDate:'2026-07-21'});
approx(sameDayBalances.assets.futuro, 105, 'movimento já absorvido pela base atualizada não pode ser somado de novo');
assert.deepStrictEqual(sameDayBalances.applied.map(m=>m.id), ['after_capture']);

// Backups antigos com mais de uma base no mesmo dia conservam somente a conferência mais recente.
const duplicateDay = C.migrateState({settings:{goal:{target:100000,due:'2028-12-31'}}, patrimonio:[
  {id:'dup_old',data:'2026-07-20',createdAt:'2026-07-20T08:00:00.000Z',capturedAt:'2026-07-20T08:00:00.000Z',futuro:100},
  {id:'dup_new',data:'2026-07-20',createdAt:'2026-07-20T08:00:00.000Z',capturedAt:'2026-07-20T20:00:00.000Z',futuro:130}
], movements:[]});
assert.strictEqual(duplicateDay.patrimonio.length, 1, 'deve existir apenas uma base por dia');
assert.strictEqual(duplicateDay.patrimonio[0].id, 'dup_new', 'deve conservar a captura mais recente do dia');
approx(duplicateDay.patrimonio[0].futuro, 130);

// Lançamento retroativo de um dia intermediário deve explicar a diferença mesmo se foi digitado depois.
const retroactiveState = C.defaultState();
retroactiveState.patrimonio.push(C.normalizeSnapshot({id:'retro_prev',data:'2026-07-18',createdAt:'2026-07-18T20:00:00.000Z',capturedAt:'2026-07-18T20:00:00.000Z',futuro:100}));
retroactiveState.patrimonio.push(C.normalizeSnapshot({id:'retro_curr',data:'2026-07-20',createdAt:'2026-07-20T20:00:00.000Z',capturedAt:'2026-07-20T20:00:00.000Z',futuro:120}));
retroactiveState.movements.push(C.normalizeMovement({id:'retro_mov',type:'entrada',data:'2026-07-19',createdAt:'2026-07-21T09:00:00.000Z',account:'futuro',value:20}));
const retroDetails = C.snapshotDeltaDetails(retroactiveState);
approx(retroDetails.explained, 20, 'entrada retroativa deve explicar a variação entre bases');
approx(retroDetails.suggestedYield.total, 0, 'entrada retroativa não pode virar CDI');

// Rendimentos precisam ficar separados por caixinha e por origem automática/manual.
const splitYieldState = C.defaultState();
splitYieldState.patrimonio.push(C.normalizeSnapshot({data:'2026-07-20',rendimentoFuturo:7.54,rendimentoGiro:0.26}));
splitYieldState.movements.push(C.normalizeMovement({type:'rendimento',data:'2026-07-21',account:'futuro',value:1.50}));
splitYieldState.movements.push(C.normalizeMovement({type:'rendimento',data:'2026-07-21',account:'giro',value:0.50}));
const splitYield = C.getYieldSummary(splitYieldState, '2026-07-21');
approx(splitYield.futuro.total, 9.04, 'Futuro separado');
approx(splitYield.giro.total, 0.76, 'Giro separado');
approx(splitYield.manual, 2.00, 'rendimento manual separado');
approx(splitYield.snapshot, 7.80, 'rendimento automático separado');
approx(splitYield.total, 9.80, 'total de rendimentos do mês');

// Semana de entregas fecha de segunda a domingo e pode usar data de competência diferente do Pix.
assert.strictEqual(C.startOfWeekISO('2026-07-20'), '2026-07-20', 'segunda inicia a própria semana');
assert.strictEqual(C.startOfWeekISO('2026-07-26'), '2026-07-20', 'domingo pertence à semana iniciada na segunda');
assert.strictEqual(C.endOfWeekISO('2026-07-24'), '2026-07-26', 'semana termina no domingo');
const deliveryState = C.defaultState();
deliveryState.movements.push(C.normalizeMovement({id:'delivery_previous',type:'entrada',data:'2026-07-22',competenceDate:'2026-07-19',category:'Entrega',account:'giro',value:300}));
deliveryState.movements.push(C.normalizeMovement({id:'delivery_current',type:'entrada',data:'2026-07-22',competenceDate:'2026-07-21',category:'Entrega',account:'giro',value:70}));
deliveryState.movements.push(C.normalizeMovement({id:'delivery_cash',type:'ifood_dinheiro',data:'2026-07-24',received:50,change:17.28}));
deliveryState.movements.push(C.normalizeMovement({id:'delivery_description',type:'entrada',data:'2026-07-24',competenceDate:'2026-07-20',description:'Repasse iFood',account:'giro',value:100}));
deliveryState.movements.push(C.normalizeMovement({id:'not_delivery',type:'entrada',data:'2026-07-24',category:'Barman',account:'giro',value:200}));
const currentDeliveryWeek = C.getDeliveryWeeklySummary(deliveryState, '2026-07-24');
approx(currentDeliveryWeek.total, 202.72, 'semana soma Pix de entregas e dinheiro líquido');
approx(currentDeliveryWeek.deposited, 170, 'Pix/depósito separado');
approx(currentDeliveryWeek.cash, 32.72, 'dinheiro considera recebido menos troco');
approx(currentDeliveryWeek.cashReceived, 50, 'valor bruto em espécie preservado');
approx(currentDeliveryWeek.change, 17.28, 'troco separado');
approx(currentDeliveryWeek.averagePerDay, 67.57, 'média pelos dias com registro');
assert.strictEqual(currentDeliveryWeek.days, 3);
assert.strictEqual(currentDeliveryWeek.count, 3);
assert.strictEqual(currentDeliveryWeek.payoutDate, '2026-07-29');
const previousDeliveryWeek = C.getDeliveryWeeklySummary(deliveryState, '2026-07-19');
approx(previousDeliveryWeek.total, 300, 'repasse de quarta deve voltar para a semana trabalhada anterior');
assert.strictEqual(C.movementReferenceDate(deliveryState.movements[0]), '2026-07-19');
assert.strictEqual(
  C.normalizeMovement({type:'entrada', data:'2026-07-22', dataReferencia:'2026-07-19'}).competenceDate,
  '2026-07-19',
  'backup antigo em português deve preservar a data da semana trabalhada'
);

console.log('Todos os testes do core v13.07 passaram.');
