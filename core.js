(function(global){
  'use strict';

  const APP_VERSION = 'v13.07';
  const BUILD_ID = '2026-07-24-v13-07-entregas-e-navegacao-movel';
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
  function dateToISO(date){
    const d = date instanceof Date && !Number.isNaN(date.getTime()) ? date : parseISODate(todayISO());
    return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
  }
  function addDaysISO(dateISO, amount){
    const d = parseISODate(dateISO || todayISO());
    d.setDate(d.getDate() + safeNumber(amount));
    return dateToISO(d);
  }
  function startOfWeekISO(dateISO){
    const d = parseISODate(dateISO || todayISO());
    const daysSinceMonday = (d.getDay() + 6) % 7;
    d.setDate(d.getDate() - daysSinceMonday);
    return dateToISO(d);
  }
  function endOfWeekISO(dateISO){ return addDaysISO(startOfWeekISO(dateISO), 6); }
  function id(prefix){ return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2,9)}`; }
  function safeNumber(value){
    const n = Number(value);
    return Number.isFinite(n) ? n : 0;
  }
  function round2(value){ return Math.round((safeNumber(value) + Number.EPSILON) * 100) / 100; }
  function clamp(n,min,max){ return Math.min(max, Math.max(min, n)); }

  function timestampMs(value){
    const time = Date.parse(String(value || ''));
    return Number.isFinite(time) ? time : 0;
  }
  function normalizeTimestamp(value, fallback){
    const time = timestampMs(value) || timestampMs(fallback) || Date.now();
    return new Date(time).toISOString();
  }

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
    const createdAt = normalizeTimestamp(p.createdAt, nowISO());
    const updatedAt = normalizeTimestamp(p.updatedAt, createdAt);
    const capturedAt = normalizeTimestamp(p.capturedAt || p.balanceCutoffAt, p.updatedAt || createdAt);
    return {
      id: p.id || id('pat'),
      data: isValidDate(p.data) ? p.data : todayISO(),
      createdAt,
      updatedAt,
      capturedAt,
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
    const createdAt = normalizeTimestamp(m.createdAt, nowISO());
    const competenceDate = m.competenceDate || m.referenceDate || m.dataReferencia || m.dataTrabalho;
    return {
      id: m.id || id('mov'),
      type,
      data: isValidDate(m.data) ? m.data : todayISO(),
      createdAt,
      updatedAt: normalizeTimestamp(m.updatedAt, createdAt),
      description: String(m.description || defaultMovementDescription(type)),
      category: String(m.category || ''),
      competenceDate: isValidDate(competenceDate) ? String(competenceDate) : '',
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
    base.patrimonio = dedupeSnapshotsByDate(snapshots.map(normalizeSnapshot));

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
    return recordTimestamp(a).localeCompare(recordTimestamp(b));
  }
  function sortDesc(a,b){
    const dateCmp = String(b.data||'').localeCompare(String(a.data||''));
    if(dateCmp) return dateCmp;
    return recordTimestamp(b).localeCompare(recordTimestamp(a));
  }
  function recordTimestamp(item){
    return String((item && (item.capturedAt || item.createdAt || item.updatedAt)) || '');
  }
  function snapshotCapturedAt(snapshot){
    const p = snapshot || {};
    return normalizeTimestamp(p.capturedAt || p.balanceCutoffAt, p.updatedAt || p.createdAt || nowISO());
  }
  function dedupeSnapshotsByDate(snapshots){
    const latestByDate = new Map();
    (Array.isArray(snapshots) ? snapshots : []).map(normalizeSnapshot).forEach(p => {
      const current = latestByDate.get(p.data);
      if(!current || timestampMs(snapshotCapturedAt(p)) >= timestampMs(snapshotCapturedAt(current))){
        latestByDate.set(p.data, p);
      }
    });
    return Array.from(latestByDate.values()).sort(sortByDateThenCreated);
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
    return timestampMs(movement.createdAt) > timestampMs(snapshotCapturedAt(snapshot));
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

  function emptyAccountDelta(){
    const assets = {};
    ASSET_ACCOUNTS.forEach(k => assets[k] = 0);
    return {assets, faturaAberta:0, outrasDividas:0};
  }

  function accountImpact(m){
    const x = normalizeMovement(m);
    const impact = emptyAccountDelta();
    if(x.type === 'entrada'){
      impact.assets[x.account] = round2(impact.assets[x.account] + x.value);
    } else if(x.type === 'saida'){
      impact.assets[x.account] = round2(impact.assets[x.account] - x.value);
    } else if(x.type === 'transferencia'){
      impact.assets[x.fromAccount] = round2(impact.assets[x.fromAccount] - x.value);
      impact.assets[x.toAccount] = round2(impact.assets[x.toAccount] + x.value);
    } else if(x.type === 'rendimento'){
      impact.assets[x.account] = round2(impact.assets[x.account] + x.value);
    } else if(x.type === 'ifood_dinheiro'){
      impact.assets.carteira = round2(impact.assets.carteira + x.received);
      impact.assets.giro = round2(impact.assets.giro - x.change);
    } else if(x.type === 'cartao'){
      impact.faturaAberta = round2(impact.faturaAberta + x.value);
    } else if(x.type === 'pagamento_cartao'){
      impact.assets[x.account] = round2(impact.assets[x.account] - x.value);
      impact.faturaAberta = round2(impact.faturaAberta - x.value);
    }
    return impact;
  }

  function addAccountImpact(total, impact){
    const acc = total || emptyAccountDelta();
    const inc = impact || emptyAccountDelta();
    ASSET_ACCOUNTS.forEach(k => acc.assets[k] = round2((acc.assets[k] || 0) + (inc.assets[k] || 0)));
    acc.faturaAberta = round2((acc.faturaAberta || 0) + (inc.faturaAberta || 0));
    acc.outrasDividas = round2((acc.outrasDividas || 0) + (inc.outrasDividas || 0));
    return acc;
  }

  function movementsBetweenSnapshots(state, previous, draftSnapshot){
    if(!previous || !draftSnapshot) return [];
    const current = normalizeSnapshot(draftSnapshot);
    const previousCutoff = timestampMs(snapshotCapturedAt(previous));
    const currentCutoff = timestampMs(snapshotCapturedAt(current));
    return (state && Array.isArray(state.movements) ? state.movements : [])
      .map(normalizeMovement)
      .filter(m => m.data >= previous.data && m.data <= current.data)
      .filter(m => {
        const recordedAt = timestampMs(m.createdAt);
        if(previous.data === current.data) return recordedAt > previousCutoff && recordedAt <= currentCutoff;
        if(m.data === previous.data && recordedAt <= previousCutoff) return false;
        if(m.data === current.data && recordedAt > currentCutoff) return false;
        return true;
      })
      .sort(sortByDateThenCreated);
  }

  function estimateSnapshotYields(state, draftSnapshot, options){
    const opts = options || {};
    const current = normalizeSnapshot(Object.assign({}, draftSnapshot || {}, {
      createdAt: (draftSnapshot && draftSnapshot.createdAt) || nowISO(),
      capturedAt: (draftSnapshot && draftSnapshot.capturedAt) || opts.currentCapturedAt || opts.currentCreatedAt || nowISO()
    }));
    const excludeId = opts.excludeId || current.id || '';
    const previous = (state && Array.isArray(state.patrimonio) ? state.patrimonio : [])
      .map(normalizeSnapshot)
      .filter(p => p.id !== excludeId)
      .filter(p => p.data < current.data)
      .sort(sortDesc)[0] || null;

    if(!previous){
      return {ok:false, reason:'Sem base anterior para comparar.', previous:null, current, expected:null, movements:[], movementDelta:emptyAccountDelta(), assetDiffs:[], suggested:{futuro:0,giro:0,total:0}, liabilities:{faturaAberta:0,outrasDividas:0}, unexplainedTotal:0};
    }

    const prevSums = snapshotAssets(previous);
    const currentSums = snapshotAssets(current);
    const movements = movementsBetweenSnapshots(state, previous, current);
    const movementDelta = movements.reduce((total,m) => addAccountImpact(total, accountImpact(m)), emptyAccountDelta());
    const expectedAssets = {};
    ASSET_ACCOUNTS.forEach(k => expectedAssets[k] = round2((prevSums.assets[k] || 0) + (movementDelta.assets[k] || 0)));
    const expectedFaturaAberta = round2(Math.max(0, prevSums.faturaAberta + movementDelta.faturaAberta));
    const expectedOutrasDividas = round2(prevSums.outrasDividas + movementDelta.outrasDividas);

    const assetDiffs = ASSET_ACCOUNTS.map(k => {
      const actual = round2(currentSums.assets[k] || 0);
      const expected = round2(expectedAssets[k] || 0);
      return {account:k, label:ACCOUNT_LABELS[k], previous:round2(prevSums.assets[k] || 0), movementDelta:round2(movementDelta.assets[k] || 0), expected, actual, diff:round2(actual - expected)};
    });
    const suggestedFuturo = round2(Math.max(0, assetDiffs.find(x=>x.account==='futuro')?.diff || 0));
    const suggestedGiro = round2(Math.max(0, assetDiffs.find(x=>x.account==='giro')?.diff || 0));
    const liabilities = {
      faturaAberta: round2(currentSums.faturaAberta - expectedFaturaAberta),
      outrasDividas: round2(currentSums.outrasDividas - expectedOutrasDividas)
    };
    const unexplainedTotal = round2(assetDiffs.reduce((sum,x)=>sum+x.diff,0) - liabilities.faturaAberta - liabilities.outrasDividas);

    return {
      ok:true, previous, current,
      expected:{assets:expectedAssets, faturaAberta:expectedFaturaAberta, outrasDividas:expectedOutrasDividas},
      movements, movementDelta, assetDiffs,
      suggested:{futuro:suggestedFuturo, giro:suggestedGiro, total:round2(suggestedFuturo + suggestedGiro)},
      liabilities, unexplainedTotal
    };
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
    const snapshotYield = (state && Array.isArray(state.patrimonio) ? state.patrimonio : [])
      .map(normalizeSnapshot)
      .filter(p => String(p.data || '').startsWith(endPrefix))
      .reduce((sum,p) => round2(sum + p.rendimentoFuturo + p.rendimentoGiro), 0);
    const summary = {month:start, income:0, expense:0, yield:0, manualYield:0, snapshotYield, card:0, ifoodNet:0, transfers:0, count:items.length};
    items.forEach(x => {
      const impact = movementImpact(x);
      summary.income = round2(summary.income + impact.income);
      summary.expense = round2(summary.expense + impact.expense);
      summary.manualYield = round2(summary.manualYield + impact.yield);
      if(x.type === 'cartao') summary.card = round2(summary.card + x.value);
      if(x.type === 'ifood_dinheiro') summary.ifoodNet = round2(summary.ifoodNet + impact.income);
      if(x.type === 'transferencia') summary.transfers += 1;
    });
    summary.yield = round2(summary.manualYield + snapshotYield);
    summary.netWork = round2(summary.income - summary.expense);
    summary.netWithYield = round2(summary.netWork + summary.yield);
    return summary;
  }

  function getYieldSummary(state, monthISO){
    const start = startOfMonthISO(monthISO || todayISO());
    const prefix = start.slice(0,7);
    const byAccount = {};
    ASSET_ACCOUNTS.forEach(account => {
      byAccount[account] = {account, label:ACCOUNT_LABELS[account], manual:0, snapshot:0, total:0};
    });

    (state && Array.isArray(state.patrimonio) ? state.patrimonio : [])
      .map(normalizeSnapshot)
      .filter(p => p.data.startsWith(prefix))
      .forEach(p => {
        byAccount.futuro.snapshot = round2(byAccount.futuro.snapshot + p.rendimentoFuturo);
        byAccount.giro.snapshot = round2(byAccount.giro.snapshot + p.rendimentoGiro);
      });

    (state && Array.isArray(state.movements) ? state.movements : [])
      .map(normalizeMovement)
      .filter(m => m.type === 'rendimento' && m.data.startsWith(prefix))
      .forEach(m => {
        byAccount[m.account].manual = round2(byAccount[m.account].manual + m.value);
      });

    Object.values(byAccount).forEach(item => item.total = round2(item.manual + item.snapshot));
    const manual = round2(Object.values(byAccount).reduce((sum,item)=>sum+item.manual,0));
    const snapshot = round2(Object.values(byAccount).reduce((sum,item)=>sum+item.snapshot,0));
    return {
      month:start,
      byAccount,
      futuro:byAccount.futuro,
      giro:byAccount.giro,
      manual,
      snapshot,
      total:round2(manual + snapshot)
    };
  }

  function normalizeSearchText(value){
    return String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase().trim();
  }
  function movementReferenceDate(movement){
    const m = normalizeMovement(movement);
    return isValidDate(m.competenceDate) ? m.competenceDate : m.data;
  }
  function isDeliveryMovement(movement){
    const m = normalizeMovement(movement);
    if(m.type === 'ifood_dinheiro') return true;
    if(m.type !== 'entrada') return false;
    const marker = normalizeSearchText(m.category || m.description);
    return ['entrega','ifood','delivery','mercado livre','shopee','transportadora'].some(term => marker.includes(term));
  }
  function getDeliveryWeeklySummary(state, referenceDate){
    const reference = isValidDate(referenceDate) ? referenceDate : todayISO();
    const start = startOfWeekISO(reference);
    const end = endOfWeekISO(reference);
    const items = (state && Array.isArray(state.movements) ? state.movements : [])
      .map(normalizeMovement)
      .filter(isDeliveryMovement)
      .filter(m => {
        const date = movementReferenceDate(m);
        return date >= start && date <= end;
      })
      .sort(sortByDateThenCreated);
    const days = new Set();
    const summary = {
      reference,
      start,
      end,
      payoutDate:addDaysISO(end, 3),
      total:0,
      deposited:0,
      cash:0,
      cashReceived:0,
      change:0,
      days:0,
      averagePerDay:0,
      count:items.length,
      items
    };
    items.forEach(m => {
      const income = movementImpact(m).income;
      const date = movementReferenceDate(m);
      days.add(date);
      summary.total = round2(summary.total + income);
      if(m.type === 'ifood_dinheiro'){
        summary.cash = round2(summary.cash + income);
        summary.cashReceived = round2(summary.cashReceived + m.received);
        summary.change = round2(summary.change + m.change);
      } else {
        summary.deposited = round2(summary.deposited + income);
      }
    });
    summary.days = days.size;
    summary.averagePerDay = summary.days > 0 ? round2(summary.total / summary.days) : 0;
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
    const movements = movementsBetweenSnapshots(state, previous, current);
    const explained = round2(movements.reduce((sum,m)=>sum+movementImpact(m).net,0));
    const unexplained = round2(delta - explained);
    return {previous, current, delta, explained, unexplained, movements};
  }

  function snapshotDeltaDetails(state){
    const list = (state && Array.isArray(state.patrimonio) ? state.patrimonio : []).map(normalizeSnapshot).sort(sortDesc);
    if(list.length < 2) return null;
    const current = list[0];
    const previous = list[1];
    const prev = snapshotAssets(previous);
    const curr = snapshotAssets(current);
    const diff = explainSnapshotDifference(state);
    const accountDeltas = ASSET_ACCOUNTS.map(k => ({
      account: k,
      label: ACCOUNT_LABELS[k],
      delta: round2((curr.assets[k] || 0) - (prev.assets[k] || 0))
    })).filter(x => Math.abs(x.delta) >= 0.01);
    const yieldEstimate = estimateSnapshotYields(state, current, {excludeId: current.id, currentCapturedAt: current.capturedAt});
    return {
      previous, current,
      delta: diff ? diff.delta : round2(curr.liquido - prev.liquido),
      explained: diff ? diff.explained : 0,
      unexplained: diff ? diff.unexplained : round2(curr.liquido - prev.liquido),
      movements: diff ? diff.movements : [],
      accountDeltas,
      faturaDelta: round2(curr.faturaAberta - prev.faturaAberta),
      outrasDividasDelta: round2(curr.outrasDividas - prev.outrasDividas),
      snapshotYield: round2(current.rendimentoFuturo + current.rendimentoGiro),
      yieldEstimate,
      suggestedYield: yieldEstimate && yieldEstimate.ok ? yieldEstimate.suggested : {futuro:0,giro:0,total:0},
      previousLiquid: prev.liquido,
      currentLiquid: curr.liquido
    };
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
      if(m.type === 'transferencia' && m.fromAccount === m.toAccount) problems.push(`Transferência ${m.id} com origem e destino iguais.`);
      if(m.type === 'ifood_dinheiro'){
        if(m.received <= 0) problems.push(`iFood ${m.id} sem valor recebido.`);
        if(m.change > m.received) problems.push(`iFood ${m.id} com troco maior que o recebido.`);
      }
    });
    return {ok: problems.length === 0, problems};
  }

  const api = {
    APP_VERSION, BUILD_ID, STORAGE_KEY, BACKUP_PREFIX,
    ACCOUNT_LABELS, ASSET_ACCOUNTS, LIABILITY_ACCOUNTS,
    nowISO, todayISO, startOfMonthISO, dateToISO, addDaysISO, startOfWeekISO, endOfWeekISO, id, safeNumber, round2, clamp,
    timestampMs, normalizeTimestamp, isValidDate, parseISODate, formatDateBR, daysBetween, monthsBetween,
    parseCurrencyBR, formatCurrencyBR, currencyInput, currencyInputFromCentsDigits, normalizeCurrencyInputDisplay,
    defaultState, migrateState, normalizeGoal, normalizeSnapshot, normalizeMovement,
    sortByDateThenCreated, sortDesc, snapshotCapturedAt, dedupeSnapshotsByDate, snapshotAssets, getLatestSnapshot, calculateBalances,
    movementImpact, accountImpact, estimateSnapshotYields, calculateGoal, getMonthlySummary, getYieldSummary,
    normalizeSearchText, movementReferenceDate, isDeliveryMovement, getDeliveryWeeklySummary,
    explainSnapshotDifference, snapshotDeltaDetails, validateState,
    defaultMovementDescription
  };

  if(typeof module !== 'undefined' && module.exports) module.exports = api;
  global.FinanceiroCore = api;
})(typeof window !== 'undefined' ? window : globalThis);
