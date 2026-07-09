(function(global){
  'use strict';

  const APP_VERSION = 'v13.01';
  const BUILD_ID = '2026-07-08-v13-01-mascara-valores-padronizada';
  const STORAGE_KEY = 'financeiro-crm-v13-local';
  const BACKUP_PREFIX = 'backup-financeiro-crm';

  const ACCOUNT_LABELS = {
    futuro: 'Caixinha Futuro',
    giro: 'Caixinha Giro',
    carteira: 'Carteira / espécie',
    banco: 'Banco / conta',
    investimentos: 'Outros investimentos'
  };

  const ASSET_ACCOUNTS = Object.keys(ACCOUNT_LABELS);
  const LIABILITY_ACCOUNTS = ['faturaAberta','outrasDividas'];

  function nowISO(){ return new Date().toISOString(); }
  function todayISO(){
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth()+1).padStart(2,'0');
    const day = String(d.getDate()).padStart(2,'0');
    return `${y}-${m}-${day}`;
  }
  function startOfMonthISO(dateISO){
    const d = parseISODate(dateISO || todayISO());
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-01`;
  }
  function id(prefix){ return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,9)}`; }
  function safeNumber(value){
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  function round2(value){ return Math.round((safeNumber(value) + Number.EPSILON) * 100) / 100; }
  function clamp(n,min,max){ return Math.min(max, Math.max(min, n)); }

  function parseISODate(value){
    if(!isValidDate(value)) return new Date(todayISO() + 'T00:00:00');
    const [y,m,d] = String(value).split('-').map(Number);
    return new Date(y, m-1, d);
  }
  function isValidDate(value){
    if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value||''))) return false;
    const [y,m,d] = String(value).split('-').map(Number);
    const dt = new Date(y, m-1, d);
    return dt.getFullYear() === y && dt.getMonth() === m-1 && dt.getDate() === d;
  }
  function formatDateBR(value){
    if(!isValidDate(value)) return 'sem data';
    const [y,m,d] = String(value).split('-');
    return `${d}/${m}/${y}`;
  }
  function daysBetween(fromISO,toISO){
    const a = parseISODate(fromISO);
    const b = parseISODate(toISO);
    return Math.ceil((b.getTime() - a.getTime()) / 86400000);
  }
  function monthsBetween(fromISO,toISO){
    const days = daysBetween(fromISO,toISO);
    if(days <= 0) return 0;
    return days / 30.4375;
  }

  function parseCurrencyBR(input){
    if(typeof input === 'number') return round2(input);
    let raw = String(input ?? '').trim();
    if(!raw) return 0;
    raw = raw.replace(/R\$/gi,'').replace(/\s+/g,'').replace(/[^0-9,.-]/g,'');
    if(!raw || raw === '-' || raw === ',' || raw === '.') return 0;
    const negative = raw.startsWith('-');
    raw = raw.replace(/-/g,'');
    const lastComma = raw.lastIndexOf(',');
    const lastDot = raw.lastIndexOf('.');
    let normalized;

    if(lastComma >= 0 && lastDot >= 0){
      const decimalIndex = Math.max(lastComma,lastDot);
      const intPart = raw.slice(0, decimalIndex).replace(/[.,]/g,'') || '0';
      const decPart = raw.slice(decimalIndex+1).replace(/\D/g,'').padEnd(2,'0').slice(0,2);
      normalized = `${intPart}.${decPart}`;
    } else if(lastComma >= 0){
      const parts = raw.split(',');
      const intPart = parts.slice(0,-1).join('').replace(/\D/g,'') || parts[0].replace(/\D/g,'') || '0';
      const decRaw = parts[parts.length-1].replace(/\D/g,'');
      if(decRaw.length === 0){
        normalized = intPart;
      } else if(decRaw.length <= 2){
        normalized = `${intPart}.${decRaw.padEnd(2,'0')}`;
      } else {
        normalized = `${(intPart + decRaw).replace(/^0+(?=\d)/,'')}`;
      }
    } else if(lastDot >= 0){
      const parts = raw.split('.');
      const tail = parts[parts.length-1].replace(/\D/g,'');
      if(parts.length > 2 || tail.length === 3){
        normalized = raw.replace(/\D/g,'');
      } else if(tail.length > 0 && tail.length <= 2){
        const intPart = parts.slice(0,-1).join('').replace(/\D/g,'') || '0';
        normalized = `${intPart}.${tail.padEnd(2,'0')}`;
      } else {
        normalized = raw.replace(/\D/g,'');
      }
    } else {
      normalized = raw.replace(/\D/g,'');
    }

    let n = Number(normalized || 0);
    if(!Number.isFinite(n)) n = 0;
    return round2(negative ? -n : n);
  }
  function formatCurrencyBR(value){
    return safeNumber(value).toLocaleString('pt-BR', {style:'currency', currency:'BRL'});
  }
  function currencyInput(value){
    const n = round2(value);
    return n === 0 ? '' : n.toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
  }
  function currencyInputFromCentsDigits(input){
    const digits = String(input ?? '').replace(/\D/g,'');
    if(!digits) return '';
    const value = Number(digits) / 100;
    return round2(value).toLocaleString('pt-BR', {minimumFractionDigits:2, maximumFractionDigits:2});
  }
  function normalizeCurrencyInputDisplay(input){
    const value = parseCurrencyBR(input);
    return value === 0 ? '' : currencyInput(value);
  }

  function defaultState(){
    return {
      schemaVersion: 13,
      createdAt: nowISO(),
      updatedAt: nowISO(),
      settings: {
        appVersion: APP_VERSION,
        buildId: BUILD_ID,
        mode: 'local',
        devMode: false,
        hideBalances: false,
        ownerName: '',
        cardCloseDay: 4,
        cardDueDay: 11,
        goal: {
          id: 'goal_main',
          name: 'Objetivo principal',
          target: 100000,
          due: '2028-12-31'
        },
        lastBackupAt: ''
      },
      patrimonio: [],
      movements: [],
      notes: []
    };
  }

  function normalizeGoal(goal){
    const g = goal || {};
    return {
      id: g.id || 'goal_main',
      name: String(g.name || 'Objetivo principal'),
      target: Math.max(0, parseCurrencyBR(g.target ?? 100000)),
      due: isValidDate(g.due) ? g.due : '2028-12-31'
    };
  }

  function normalizeSnapshot(item){
    const p = item || {};
    return {
      id: p.id || id('pat'),
      data: isValidDate(p.data) ? p.data : todayISO(),
      createdAt: p.createdAt || nowISO(),
      updatedAt: p.updatedAt || p.createdAt || nowISO(),
      futuro: parseCurrencyBR(p.futuro),
      giro: parseCurrencyBR(p.giro),
      carteira: parseCurrencyBR(p.carteira),
      banco: parseCurrencyBR(p.banco),
      investimentos: parseCurrencyBR(p.investimentos),
      faturaAberta: parseCurrencyBR(p.faturaAberta),
      outrasDividas: parseCurrencyBR(p.outrasDividas),
      rendimentoFuturo: parseCurrencyBR(p.rendimentoFuturo),
      rendimentoGiro: parseCurrencyBR(p.rendimentoGiro),
      observacoes: String(p.observacoes || '')
    };
  }

  function normalizeMovement(item){
    const m = item || {};
    const type = ['entrada','saida','transferencia','rendimento','ifood_dinheiro','cartao','pagamento_cartao'].includes(m.type) ? m.type : 'entrada';
    const account = ACCOUNT_LABELS[m.account] ? m.account : 'banco';
    const fromAccount = ACCOUNT_LABELS[m.fromAccount] ? m.fromAccount : 'giro';
    const toAccount = ACCOUNT_LABELS[m.toAccount] ? m.toAccount : 'carteira';
    return {
      id: m.id || id('mov'),
      type,
      data: isValidDate(m.data) ? m.data : todayISO(),
      createdAt: m.createdAt || nowISO(),
      updatedAt: m.updatedAt || m.createdAt || nowISO(),
      description: String(m.description || defaultMovementDescription(type)),
      category: String(m.category || ''),
      account,
      fromAccount,
      toAccount,
      value: Math.max(0, parseCurrencyBR(m.value)),
      received: Math.max(0, parseCurrencyBR(m.received)),
      change: Math.max(0, parseCurrencyBR(m.change)),
      notes: String(m.notes || '')
    };
  }

  function defaultMovementDescription(type){
    return ({
      entrada: 'Entrada',
      saida: 'Saída',
      transferencia: 'Transferência',
      rendimento: 'Rendimento',
      ifood_dinheiro: 'iFood em dinheiro',
      cartao: 'Compra no cartão',
      pagamento_cartao: 'Pagamento do cartão'
    })[type] || 'Movimento';
  }

  function migrateState(raw){
    const base = defaultState();
    const data = raw && typeof raw === 'object' ? (raw.data && raw.data.settings ? raw.data : raw) : {};
    base.createdAt = data.createdAt || base.createdAt;
    base.updatedAt = data.updatedAt || nowISO();
    base.settings = Object.assign({}, base.settings, data.settings || {});
    base.settings.appVersion = APP_VERSION;
    base.settings.buildId = BUILD_ID;
    base.settings.mode = 'local';
    base.settings.goal = normalizeGoal((data.settings && (data.settings.goal || (Array.isArray(data.settings.goals) && data.settings.goals[0]))) || base.settings.goal);
    base.settings.cardCloseDay = clamp(parseInt(base.settings.cardCloseDay,10)||4,1,28);
    base.settings.cardDueDay = clamp(parseInt(base.settings.cardDueDay,10)||11,1,28);

    const snapshots = Array.isArray(data.patrimonio) ? data.patrimonio : [];
    base.patrimonio = snapshots.map(normalizeSnapshot).sort(sortByDateThenCreated);

    let movements = Array.isArray(data.movements) ? data.movements : [];
    if(!movements.length && Array.isArray(data.lancamentos)){
      movements = data.lancamentos.map(l => {
        const tipo = String(l.tipo || '').toLowerCase();
        const type = tipo.includes('sa') || tipo.includes('despesa') ? 'saida' : (tipo.includes('rendimento') ? 'rendimento' : 'entrada');
        return {
          id: l.id,
          type,
          data: l.data,
          createdAt: l.createdAt,
          updatedAt: l.updatedAt,
          description: l.descricao || l.description,
          category: l.categoria || l.category,
          account: l.conta || l.account,
          value: l.valor || l.value,
          notes: l.observacoes || l.notes
        };
      });
      if(Array.isArray(data.ifoodCash)){
        data.ifoodCash.forEach(x => movements.push({
          id: x.id, type:'ifood_dinheiro', data:x.data, createdAt:x.createdAt, updatedAt:x.updatedAt,
          description:'iFood em dinheiro', account:'carteira', fromAccount:'giro', toAccount:'carteira',
          received:x.recebido, change:x.troco, value: round2(parseCurrencyBR(x.recebido) - parseCurrencyBR(x.troco)), notes:x.observacoes
        }));
      }
      if(Array.isArray(data.cartao)){
        data.cartao.forEach(x => movements.push({
          id: x.id, type:'cartao', data:x.data, createdAt:x.createdAt, updatedAt:x.updatedAt,
          description:x.descricao || 'Compra no cartão', value:x.valor, category:x.categoria, notes:x.observacoes
        }));
      }
    }
    base.movements = movements.map(normalizeMovement).sort(sortByDateThenCreated);
    base.notes = Array.isArray(data.notes) ? data.notes : [];
    return base;
  }

  function sortByDateThenCreated(a,b){
    const dateCmp = String(a.data||'').localeCompare(String(b.data||''));
    if(dateCmp) return dateCmp;
    return String(a.createdAt||'').localeCompare(String(b.createdAt||''));
  }
  function sortDesc(a,b){
    const dateCmp = String(b.data||'').localeCompare(String(a.data||''));
    if(dateCmp) return dateCmp;
    return String(b.createdAt||'').localeCompare(String(a.createdAt||''));
  }

  function snapshotAssets(snapshot){
    const p = normalizeSnapshot(snapshot || {});
    const assets = {};
    ASSET_ACCOUNTS.forEach(k => assets[k] = round2(p[k]));
    const bruto = round2(ASSET_ACCOUNTS.reduce((sum,k)=>sum+assets[k],0));
    const faturaAberta = round2(p.faturaAberta);
    const outrasDividas = round2(p.outrasDividas);
    const liquido = round2(bruto - faturaAberta - outrasDividas);
    return {assets, faturaAberta, outrasDividas, bruto, liquido};
  }

  function getLatestSnapshot(state, asOfDate){
    const date = asOfDate && isValidDate(asOfDate) ? asOfDate : todayISO();
    const list = (state && Array.isArray(state.patrimonio) ? state.patrimonio : [])
      .map(normalizeSnapshot)
      .filter(p => p.data <= date)
      .sort(sortDesc);
    return list[0] || null;
  }

  function shouldApplyAfterSnapshot(movement, snapshot){
    if(!snapshot) return true;
    if(movement.data < snapshot.data) return false;
    if(movement.data > snapshot.data) return true;
    return String(movement.createdAt || '') > String(snapshot.createdAt || '');
  }

  function calculateBalances(state, options){
    const asOfDate = (options && isValidDate(options.asOfDate)) ? options.asOfDate : todayISO();
    const snapshot = getLatestSnapshot(state, asOfDate);
    const base = snapshot ? snapshotAssets(snapshot) : snapshotAssets({});
    const assets = Object.assign({}, base.assets);
    let faturaAberta = base.faturaAberta;
    let outrasDividas = base.outrasDividas;
    const applied = [];
    const ignored = [];

    const movements = (state && Array.isArray(state.movements) ? state.movements : [])
      .map(normalizeMovement)
      .filter(m => m.data <= asOfDate)
      .sort(sortByDateThenCreated);

    movements.forEach(m => {
      if(!shouldApplyAfterSnapshot(m, snapshot)){ ignored.push(m); return; }
      applied.push(m);
      if(m.type === 'entrada'){
        assets[m.account] = round2((assets[m.account]||0) + m.value);
      } else if(m.type === 'saida'){
        assets[m.account] = round2((assets[m.account]||0) - m.value);
      } else if(m.type === 'transferencia'){
        assets[m.fromAccount] = round2((assets[m.fromAccount]||0) - m.value);
        assets[m.toAccount] = round2((assets[m.toAccount]||0) + m.value);
      } else if(m.type === 'rendimento'){
        assets[m.account] = round2((assets[m.account]||0) + m.value);
      } else if(m.type === 'ifood_dinheiro'){
        assets.carteira = round2((assets.carteira||0) + m.received);
        assets.giro = round2((assets.giro||0) - m.change);
      } else if(m.type === 'cartao'){
        faturaAberta = round2(faturaAberta + m.value);
      } else if(m.type === 'pagamento_cartao'){
        assets[m.account] = round2((assets[m.account]||0) - m.value);
        faturaAberta = round2(Math.max(0, faturaAberta - m.value));
      }
    });

    const bruto = round2(ASSET_ACCOUNTS.reduce((sum,k)=>sum + (assets[k]||0), 0));
    const liquido = round2(bruto - faturaAberta - outrasDividas);
    return {asOfDate, snapshot, assets, faturaAberta, outrasDividas, bruto, liquido, applied, ignored};
  }

  function movementImpact(m){
    const x = normalizeMovement(m);
    if(x.type === 'entrada') return {income:x.value, expense:0, yield:0, net:x.value};
    if(x.type === 'saida') return {income:0, expense:x.value, yield:0, net:-x.value};
    if(x.type === 'transferencia') return {income:0, expense:0, yield:0, net:0};
    if(x.type === 'rendimento') return {income:0, expense:0, yield:x.value, net:x.value};
    if(x.type === 'ifood_dinheiro') return {income:round2(x.received-x.change), expense:0, yield:0, net:round2(x.received-x.change)};
    if(x.type === 'cartao') return {income:0, expense:x.value, yield:0, net:-x.value};
    if(x.type === 'pagamento_cartao') return {income:0, expense:0, yield:0, net:0};
    return {income:0, expense:0, yield:0, net:0};
  }

  function calculateGoal(state, asOfDate){
    const goal = normalizeGoal(state && state.settings && state.settings.goal);
    const balances = calculateBalances(state, {asOfDate: asOfDate || todayISO()});
    const falta = round2(Math.max(0, goal.target - balances.liquido));
    const progress = goal.target > 0 ? clamp((balances.liquido / goal.target) * 100, 0, 9999) : 0;
    const months = monthsBetween(asOfDate || todayISO(), goal.due);
    const monthlyRequired = months > 0 ? round2(falta / months) : falta;
    const days = daysBetween(asOfDate || todayISO(), goal.due);
    return {goal, patrimonioLiquido: balances.liquido, falta, progress, months, days, monthlyRequired, overdue: days < 0, dueToday: days === 0};
  }

  function getMonthlySummary(state, monthISO){
    const start = startOfMonthISO(monthISO || todayISO());
    const [y,m] = start.split('-');
    const endPrefix = `${y}-${m}`;
    const items = (state && Array.isArray(state.movements) ? state.movements : [])
      .map(normalizeMovement)
      .filter(x => String(x.data || '').startsWith(endPrefix));
    const summary = {month:start, income:0, expense:0, yield:0, card:0, ifoodNet:0, transfers:0, count:items.length};
    items.forEach(x => {
      const impact = movementImpact(x);
      summary.income = round2(summary.income + impact.income);
      summary.expense = round2(summary.expense + impact.expense);
      summary.yield = round2(summary.yield + impact.yield);
      if(x.type === 'cartao') summary.card = round2(summary.card + x.value);
      if(x.type === 'ifood_dinheiro') summary.ifoodNet = round2(summary.ifoodNet + impact.income);
      if(x.type === 'transferencia') summary.transfers += 1;
    });
    summary.netWork = round2(summary.income - summary.expense);
    summary.netWithYield = round2(summary.netWork + summary.yield);
    return summary;
  }

  function explainSnapshotDifference(state){
    const list = (state && Array.isArray(state.patrimonio) ? state.patrimonio : []).map(normalizeSnapshot).sort(sortDesc);
    if(list.length < 2) return null;
    const current = list[0];
    const previous = list[1];
    const previousLiquid = snapshotAssets(previous).liquido;
    const currentLiquid = snapshotAssets(current).liquido;
    const delta = round2(currentLiquid - previousLiquid);
    const movements = (state.movements||[]).map(normalizeMovement)
      .filter(m => m.data >= previous.data && m.data <= current.data)
      .filter(m => String(m.createdAt||'') > String(previous.createdAt||'') && String(m.createdAt||'') <= String(current.createdAt||''));
    const explained = round2(movements.reduce((sum,m)=>sum+movementImpact(m).net,0));
    const unexplained = round2(delta - explained);
    return {previous, current, delta, explained, unexplained, movements};
  }

  function validateState(state){
    const problems = [];
    if(!state || typeof state !== 'object') problems.push('Estado vazio ou inválido.');
    const s = migrateState(state || {});
    if(!s.settings.goal || s.settings.goal.target <= 0) problems.push('Objetivo principal sem valor válido.');
    if(!isValidDate(s.settings.goal.due)) problems.push('Data do objetivo inválida.');
    s.patrimonio.forEach(p => {
      if(!isValidDate(p.data)) problems.push(`Patrimônio ${p.id} sem data válida.`);
    });
    s.movements.forEach(m => {
      if(!isValidDate(m.data)) problems.push(`Movimento ${m.id} sem data válida.`);
      if(['entrada','saida','rendimento','cartao','pagamento_cartao','transferencia'].includes(m.type) && m.value <= 0) problems.push(`Movimento ${m.id} sem valor positivo.`);
      if(m.type === 'ifood_dinheiro' && m.received <= 0) problems.push(`iFood ${m.id} sem valor recebido.`);
    });
    return {ok: problems.length === 0, problems};
  }

  const api = {
    APP_VERSION, BUILD_ID, STORAGE_KEY, BACKUP_PREFIX,
    ACCOUNT_LABELS, ASSET_ACCOUNTS, LIABILITY_ACCOUNTS,
    nowISO, todayISO, startOfMonthISO, id, safeNumber, round2, clamp,
    isValidDate, parseISODate, formatDateBR, daysBetween, monthsBetween,
    parseCurrencyBR, formatCurrencyBR, currencyInput, currencyInputFromCentsDigits, normalizeCurrencyInputDisplay,
    defaultState, migrateState, normalizeGoal, normalizeSnapshot, normalizeMovement,
    sortByDateThenCreated, sortDesc, snapshotAssets, getLatestSnapshot, calculateBalances,
    movementImpact, calculateGoal, getMonthlySummary, explainSnapshotDifference, validateState,
    defaultMovementDescription
  };

  if(typeof module !== 'undefined' && module.exports) module.exports = api;
  global.FinanceiroCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
