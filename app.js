(function(){
  'use strict';
  const C = window.FinanceiroCore;
  const $ = (sel, root=document) => root.querySelector(sel);
  const $$ = (sel, root=document) => Array.from(root.querySelectorAll(sel));

  let state = loadState();
  let currentView = 'dashboard';
  let toastTimer = null;

  function loadState(){
    try{
      const raw = localStorage.getItem(C.STORAGE_KEY);
      if(!raw) return C.defaultState();
      return C.migrateState(JSON.parse(raw));
    }catch(err){
      console.warn('Falha ao carregar estado local. Criando estado zerado.', err);
      return C.defaultState();
    }
  }
  function saveState(){
    state.updatedAt = C.nowISO();
    state.settings.appVersion = C.APP_VERSION;
    state.settings.buildId = C.BUILD_ID;
    localStorage.setItem(C.STORAGE_KEY, JSON.stringify(state));
  }
  function backupBefore(label){
    try{ localStorage.setItem(`${C.STORAGE_KEY}-backup-${label}-${Date.now()}`, JSON.stringify(state)); }catch(_){ }
  }
  function notify(message, type='info'){
    const el = $('#toast');
    if(!el) return;
    el.textContent = message;
    el.className = `toast show ${type}`;
    clearTimeout(toastTimer);
    toastTimer = setTimeout(()=> el.classList.remove('show'), 3600);
  }
  function escapeHtml(str){
    return String(str ?? '').replace(/[&<>"]/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[ch]));
  }
  function privateMoney(value){ return state.settings.hideBalances ? 'R$ •••••' : C.formatCurrencyBR(value); }
  function fieldValue(form, name){ return (form.elements[name] && form.elements[name].value) || ''; }
  function moneyValue(form, name){ return C.parseCurrencyBR(fieldValue(form,name)); }
  function accountOptions(selected){
    return C.ASSET_ACCOUNTS.map(k => `<option value="${k}" ${selected===k?'selected':''}>${C.ACCOUNT_LABELS[k]}</option>`).join('');
  }
  function movementTypeLabel(type){
    return ({
      entrada:'Entrada', saida:'Saída', transferencia:'Transferência', rendimento:'Rendimento',
      ifood_dinheiro:'iFood dinheiro', cartao:'Compra no cartão', pagamento_cartao:'Pagamento do cartão'
    })[type] || type;
  }
  function movementTone(type){
    return ({entrada:'good', rendimento:'good', ifood_dinheiro:'good', saida:'bad', cartao:'bad', transferencia:'neutral', pagamento_cartao:'neutral'})[type] || 'neutral';
  }
  function movementAmountText(m){
    const x = C.normalizeMovement(m);
    if(x.type === 'ifood_dinheiro') return privateMoney(x.received - x.change);
    if(x.type === 'transferencia') return privateMoney(x.value);
    if(x.type === 'pagamento_cartao') return privateMoney(x.value);
    return privateMoney(x.value);
  }
  function accountTitle(key){ return C.ACCOUNT_LABELS[key] || key; }

  function render(){
    const root = $('#app');
    if(!root) return;
    root.innerHTML = `
      <aside class="sidebar">
        <div class="brand-row">
          <button class="brand-icon" data-action="toggleDev" title="Alternar modo usuário/desenvolvedor">${state.settings.devMode?'🛠️':'◆'}</button>
          <div><strong>Financeiro CRM</strong><small>${C.APP_VERSION} • modo local</small></div>
        </div>
        <nav class="nav-list">
          ${navItem('dashboard','Início','🏠')}
          ${navItem('registrar','Registrar','➕')}
          ${navItem('historico','Histórico','📜')}
          ${navItem('rendimentos','Rendimentos','🌱')}
          ${navItem('perfil','Perfil','👤')}
        </nav>
        <div class="sidebar-footer">
          <span>Backup local ativo</span>
          <button class="link-btn" data-action="exportBackup">Baixar backup</button>
        </div>
      </aside>
      <main class="main">
        <header class="topbar">
          <button class="mobile-menu" data-action="toggleMenu">☰</button>
          <div><h1>${viewTitle()}</h1><p>${viewSubtitle()}</p></div>
          <div class="top-actions">
            <button class="ghost-btn" data-action="toggleBalances">${state.settings.hideBalances?'Mostrar':'Ocultar'} saldos</button>
            <button class="primary-btn compact" data-action="quickPatrimonio">+ Patrimônio</button>
          </div>
        </header>
        <section class="content">${renderView()}</section>
      </main>
      <div id="modal" class="modal" aria-hidden="true"></div>
      <div id="toast" class="toast"></div>
    `;
  }
  function navItem(view,label,icon){ return `<button class="nav-item ${currentView===view?'active':''}" data-view="${view}"><span>${icon}</span>${label}</button>`; }
  function viewTitle(){ return ({dashboard:'Dashboard', registrar:'Registrar', historico:'Histórico', rendimentos:'Rendimentos', perfil:'Perfil e backups'})[currentView] || 'Dashboard'; }
  function viewSubtitle(){
    return ({
      dashboard:'Patrimônio, objetivo, progresso e ritmo necessário.',
      registrar:'Cadastre patrimônio completo, entradas, saídas, cartão, rendimento e iFood em dinheiro.',
      historico:'Todos os registros locais, com edição e exclusão.',
      rendimentos:'Acompanhe CDI manual separado por Caixinha Futuro e Caixinha Giro.',
      perfil:'Modo local, backup, importação e configurações.'
    })[currentView] || '';
  }
  function renderView(){
    if(currentView === 'registrar') return renderRegistrar();
    if(currentView === 'historico') return renderHistorico();
    if(currentView === 'rendimentos') return renderRendimentos();
    if(currentView === 'perfil') return renderPerfil();
    return renderDashboard();
  }

  function renderDashboard(){
    const balances = C.calculateBalances(state);
    const goal = C.calculateGoal(state);
    const month = C.getMonthlySummary(state);
    const progressWidth = Math.min(100, Math.max(0, goal.progress));
    const snapText = balances.snapshot ? `Base: ${C.formatDateBR(balances.snapshot.data)}` : 'Sem patrimônio base ainda';
    const dueText = goal.overdue ? 'Prazo vencido' : goal.dueToday ? 'Prazo hoje' : `${goal.days} dia(s) restantes`;
    const composition = C.ASSET_ACCOUNTS.map(k => {
      const value = balances.assets[k] || 0;
      const pct = balances.bruto > 0 ? Math.max(0, value / balances.bruto * 100) : 0;
      return `<div class="composition-row"><div><b>${accountTitle(k)}</b><small>${privateMoney(value)}</small></div><div class="bar"><span style="width:${Math.min(100,pct)}%"></span></div><em>${pct.toFixed(1)}%</em></div>`;
    }).join('');
    return `
      <div class="hero-grid">
        <section class="card hero-card">
          <div class="card-title"><div><span class="eyebrow">Prioridade</span><h2>Patrimônio e objetivo</h2><p>Clique no valor da meta ou na data para editar direto no Dashboard.</p></div></div>
          <div class="metric-grid">
            <div class="metric big"><span>Patrimônio líquido</span><strong class="sensitive">${privateMoney(balances.liquido)}</strong><small>${snapText}</small></div>
            <div class="metric big"><span>Falta para <button class="inline-edit" data-action="editGoalTarget">${privateMoney(goal.goal.target)}</button></span><strong class="sensitive">${privateMoney(goal.falta)}</strong><small>Prazo: <button class="inline-edit" data-action="editGoalDue">${C.formatDateBR(goal.goal.due)}</button> • ${dueText}</small></div>
          </div>
          <div class="progress-wrap"><div class="progress-info"><b>${goal.progress.toFixed(2)}% concluído</b><span>Ritmo necessário: ${privateMoney(goal.monthlyRequired)} / mês</span></div><div class="progress-bar"><span style="width:${progressWidth}%"></span></div></div>
          <div class="quick-row"><button class="primary-btn" data-action="quickPatrimonio">Registrar patrimônio completo</button><button class="ghost-btn" data-view="registrar">Novo lançamento</button><button class="ghost-btn" data-action="exportBackup">Baixar backup</button></div>
        </section>
        <section class="card status-card">
          <div class="card-title"><div><span class="eyebrow">Mês atual</span><h2>Resumo de movimentos</h2></div></div>
          <div class="mini-stats">
            <div><span>Entradas</span><b class="positive">${privateMoney(month.income)}</b></div>
            <div><span>Saídas/cartão</span><b class="negative">${privateMoney(month.expense)}</b></div>
            <div><span>Rendimentos</span><b>${privateMoney(month.yield)}</b></div>
            <div><span>Saldo do trabalho</span><b>${privateMoney(month.netWork)}</b></div>
          </div>
          <div class="logic-note"><b>Regra:</b> rendimento aumenta patrimônio, mas não entra como faturamento de trabalho.</div>
        </section>
      </div>
      <div class="grid two">
        <section class="card"><div class="card-title"><div><span class="eyebrow">Composição</span><h2>Onde está o patrimônio</h2></div><button class="ghost-btn compact" data-action="quickPatrimonio">Atualizar base</button></div>${composition}<div class="debt-line"><span>Fatura aberta</span><b>${privateMoney(balances.faturaAberta)}</b></div><div class="debt-line"><span>Outras dívidas</span><b>${privateMoney(balances.outrasDividas)}</b></div></section>
        <section class="card"><div class="card-title"><div><span class="eyebrow">Últimos registros</span><h2>Histórico recente</h2></div><button class="ghost-btn compact" data-view="historico">Ver tudo</button></div>${renderRecentHistory()}</section>
      </div>
      ${state.settings.devMode ? renderDevPanel() : ''}
    `;
  }
  function renderRecentHistory(){
    const items = combinedHistory().slice(0,6);
    if(!items.length) return `<div class="empty">Nenhum registro ainda. Comece pelo patrimônio completo.</div>`;
    return `<div class="list">${items.map(renderHistoryItem).join('')}</div>`;
  }
  function renderDevPanel(){
    const validation = C.validateState(state);
    const diff = C.explainSnapshotDifference(state);
    return `<section class="card dev-card"><div class="card-title"><div><span class="eyebrow">Modo desenvolvedor</span><h2>Auditoria local</h2><p>Esse painel só aparece no modo dev.</p></div><span class="pill">${C.BUILD_ID}</span></div><div class="mini-stats"><div><span>Validação</span><b>${validation.ok?'OK':'Atenção'}</b></div><div><span>Patrimônios</span><b>${state.patrimonio.length}</b></div><div><span>Movimentos</span><b>${state.movements.length}</b></div><div><span>Storage</span><b>${C.STORAGE_KEY}</b></div></div>${validation.ok?'<div class="logic-note good">Nenhum problema estrutural encontrado.</div>':`<div class="logic-note warn">${validation.problems.map(escapeHtml).join('<br>')}</div>`}${diff?`<div class="logic-note"><b>Diferença entre últimos patrimônios:</b> ${privateMoney(diff.delta)} • explicado por movimentos: ${privateMoney(diff.explained)} • sem explicação: ${privateMoney(diff.unexplained)}</div>`:''}</section>`;
  }

  function renderRegistrar(){
    const balances = C.calculateBalances(state);
    return `
      <div class="grid two">
        <section class="card accent"><div class="card-title"><div><span class="eyebrow">Base real</span><h2>Patrimônio completo</h2><p>Use quando for conferir os saldos reais. Isso vira a nova base de cálculo do app.</p></div></div>${patrimonioForm()}</section>
        <section class="card"><div class="card-title"><div><span class="eyebrow">Movimento</span><h2>Novo lançamento</h2><p>Entradas, saídas, transferências, cartão, rendimento e iFood em dinheiro.</p></div></div>${movementForm()}</section>
      </div>
      <section class="card"><div class="card-title"><div><span class="eyebrow">Saldo vivo agora</span><h2>Antes de lançar</h2></div></div><div class="account-grid">${C.ASSET_ACCOUNTS.map(k=>`<div class="account-card"><span>${accountTitle(k)}</span><b>${privateMoney(balances.assets[k])}</b></div>`).join('')}<div class="account-card debt"><span>Fatura aberta</span><b>${privateMoney(balances.faturaAberta)}</b></div></div></section>
    `;
  }
  function patrimonioForm(item){
    const p = item ? C.normalizeSnapshot(item) : Object.assign({data:C.todayISO()}, C.calculateBalances(state).assets, {faturaAberta:C.calculateBalances(state).faturaAberta, outrasDividas:C.calculateBalances(state).outrasDividas, rendimentoFuturo:0, rendimentoGiro:0, observacoes:''});
    return `<form class="form" data-form="patrimonio" data-id="${item?escapeHtml(p.id):''}">
      <div class="form-grid">
        <label>Data<input type="date" name="data" value="${p.data}" required></label>
        <label>Caixinha Futuro<input class="money-field" name="futuro" inputmode="decimal" value="${C.currencyInput(p.futuro)}" placeholder="0,00"></label>
        <label>Caixinha Giro<input class="money-field" name="giro" inputmode="decimal" value="${C.currencyInput(p.giro)}" placeholder="0,00"></label>
        <label>Carteira / espécie<input class="money-field" name="carteira" inputmode="decimal" value="${C.currencyInput(p.carteira)}" placeholder="0,00"></label>
        <label>Banco / conta<input class="money-field" name="banco" inputmode="decimal" value="${C.currencyInput(p.banco)}" placeholder="0,00"></label>
        <label>Outros investimentos<input class="money-field" name="investimentos" inputmode="decimal" value="${C.currencyInput(p.investimentos)}" placeholder="0,00"></label>
        <label>Fatura aberta<input class="money-field" name="faturaAberta" inputmode="decimal" value="${C.currencyInput(p.faturaAberta)}" placeholder="0,00"></label>
        <label>Outras dívidas<input class="money-field" name="outrasDividas" inputmode="decimal" value="${C.currencyInput(p.outrasDividas)}" placeholder="0,00"></label>
        <label>Rendimento Futuro do dia<input class="money-field" name="rendimentoFuturo" inputmode="decimal" value="${C.currencyInput(p.rendimentoFuturo)}" placeholder="opcional"></label>
        <label>Rendimento Giro do dia<input class="money-field" name="rendimentoGiro" inputmode="decimal" value="${C.currencyInput(p.rendimentoGiro)}" placeholder="opcional"></label>
      </div>
      <label>Observação<input name="observacoes" value="${escapeHtml(p.observacoes)}" placeholder="Conferência do dia"></label>
      <div class="form-actions"><button class="primary-btn" type="submit">Salvar patrimônio</button>${item?'<button class="danger-btn" type="button" data-action="deleteSnapshot" data-id="'+escapeHtml(p.id)+'">Excluir</button>':''}</div>
    </form>`;
  }
  function movementForm(item){
    const m = item ? C.normalizeMovement(item) : {id:'', type:'entrada', data:C.todayISO(), description:'', category:'', account:'banco', fromAccount:'giro', toAccount:'carteira', value:0, received:0, change:0, notes:''};
    return `<form class="form" data-form="movement" data-id="${item?escapeHtml(m.id):''}">
      <div class="form-grid">
        <label>Tipo<select name="type" data-role="movement-type">
          ${['entrada','saida','transferencia','rendimento','ifood_dinheiro','cartao','pagamento_cartao'].map(t=>`<option value="${t}" ${m.type===t?'selected':''}>${movementTypeLabel(t)}</option>`).join('')}
        </select></label>
        <label>Data<input type="date" name="data" value="${m.data}" required></label>
        <label>Descrição<input name="description" value="${escapeHtml(m.description || '')}" placeholder="Ex.: salário, entrega, mercado"></label>
        <label>Categoria<input name="category" value="${escapeHtml(m.category || '')}" placeholder="opcional"></label>
      </div>
      <div class="movement-dynamic">${movementDynamicFields(m)}</div>
      <label>Observação<input name="notes" value="${escapeHtml(m.notes || '')}" placeholder="opcional"></label>
      <div class="form-actions"><button class="primary-btn" type="submit">Salvar lançamento</button>${item?'<button class="danger-btn" type="button" data-action="deleteMovement" data-id="'+escapeHtml(m.id)+'">Excluir</button>':''}</div>
    </form>`;
  }
  function movementDynamicFields(m){
    const type = m.type || 'entrada';
    if(type === 'transferencia'){
      return `<div class="form-grid"><label>Conta de origem<select name="fromAccount">${accountOptions(m.fromAccount)}</select></label><label>Conta de destino<select name="toAccount">${accountOptions(m.toAccount)}</select></label><label>Valor<input class="money-field" name="value" inputmode="decimal" value="${C.currencyInput(m.value)}" required></label></div><div class="logic-note">Transferência não conta como faturamento nem despesa. Só muda o dinheiro de lugar.</div>`;
    }
    if(type === 'ifood_dinheiro'){
      return `<div class="form-grid"><label>Recebido do cliente em dinheiro<input class="money-field" name="received" inputmode="decimal" value="${C.currencyInput(m.received)}" required></label><label>Troco usado da Caixinha Giro<input class="money-field" name="change" inputmode="decimal" value="${C.currencyInput(m.change)}"></label></div><div class="logic-note">Carteira aumenta pelo valor recebido. Giro diminui pelo troco. O patrimônio líquido sobe apenas pelo líquido da corrida.</div>`;
    }
    if(type === 'cartao'){
      return `<div class="form-grid"><label>Valor da compra<input class="money-field" name="value" inputmode="decimal" value="${C.currencyInput(m.value)}" required></label></div><div class="logic-note">Compra no cartão aumenta a fatura aberta e reduz o patrimônio líquido, mesmo sem sair dinheiro da conta agora.</div>`;
    }
    if(type === 'pagamento_cartao'){
      return `<div class="form-grid"><label>Conta usada para pagar<select name="account">${accountOptions(m.account)}</select></label><label>Valor pago<input class="money-field" name="value" inputmode="decimal" value="${C.currencyInput(m.value)}" required></label></div><div class="logic-note">Pagamento do cartão reduz uma conta e reduz a fatura. O líquido não deve mudar por isso.</div>`;
    }
    const label = type === 'rendimento' ? 'Conta que rendeu' : 'Conta afetada';
    const note = type === 'rendimento' ? 'Rendimento aumenta patrimônio, mas fica separado do faturamento.' : type === 'saida' ? 'Saída reduz diretamente a conta escolhida.' : 'Entrada aumenta a conta escolhida e entra como faturamento/receita.';
    return `<div class="form-grid"><label>${label}<select name="account">${accountOptions(m.account)}</select></label><label>Valor<input class="money-field" name="value" inputmode="decimal" value="${C.currencyInput(m.value)}" required></label></div><div class="logic-note">${note}</div>`;
  }

  function renderHistorico(){
    const items = combinedHistory();
    return `<section class="card"><div class="card-title"><div><span class="eyebrow">Registros locais</span><h2>Histórico completo</h2><p>Clique em editar para ajustar qualquer registro.</p></div><button class="ghost-btn" data-action="exportCSV">Exportar CSV</button></div>${items.length?`<div class="list history-list">${items.map(renderHistoryItem).join('')}</div>`:'<div class="empty">Nenhum registro ainda.</div>'}</section>`;
  }
  function combinedHistory(){
    const pats = state.patrimonio.map(p => ({kind:'snapshot', data:p.data, createdAt:p.createdAt, item:C.normalizeSnapshot(p)}));
    const movs = state.movements.map(m => ({kind:'movement', data:m.data, createdAt:m.createdAt, item:C.normalizeMovement(m)}));
    return pats.concat(movs).sort((a,b)=> C.sortDesc(a,b));
  }
  function renderHistoryItem(entry){
    if(entry.kind === 'snapshot'){
      const p = entry.item;
      const sums = C.snapshotAssets(p);
      return `<article class="list-item"><div class="item-main"><span class="tag neutral">Patrimônio</span><b>${C.formatDateBR(p.data)}</b><small>${escapeHtml(p.observacoes || 'Base diária completa')}</small></div><div class="item-side"><strong>${privateMoney(sums.liquido)}</strong><button class="link-btn" data-action="editSnapshot" data-id="${p.id}">Editar</button></div></article>`;
    }
    const m = entry.item;
    const impact = C.movementImpact(m);
    const subtitle = m.type === 'transferencia' ? `${accountTitle(m.fromAccount)} → ${accountTitle(m.toAccount)}` : m.type === 'ifood_dinheiro' ? `Recebido ${privateMoney(m.received)} • troco ${privateMoney(m.change)}` : m.type === 'cartao' ? 'Aumenta fatura aberta' : m.type === 'pagamento_cartao' ? `Pago por ${accountTitle(m.account)}` : accountTitle(m.account);
    return `<article class="list-item"><div class="item-main"><span class="tag ${movementTone(m.type)}">${movementTypeLabel(m.type)}</span><b>${escapeHtml(m.description || C.defaultMovementDescription(m.type))}</b><small>${C.formatDateBR(m.data)} • ${escapeHtml(subtitle)}</small></div><div class="item-side"><strong class="${impact.net<0?'negative':impact.net>0?'positive':''}">${movementAmountText(m)}</strong><button class="link-btn" data-action="editMovement" data-id="${m.id}">Editar</button></div></article>`;
  }

  function renderRendimentos(){
    const balances = C.calculateBalances(state);
    const month = C.getMonthlySummary(state);
    const yields = state.movements.filter(m => C.normalizeMovement(m).type === 'rendimento').map(C.normalizeMovement).sort(C.sortDesc);
    const snapshotYield = state.patrimonio.reduce((sum,p)=> sum + C.normalizeSnapshot(p).rendimentoFuturo + C.normalizeSnapshot(p).rendimentoGiro, 0);
    return `<div class="grid two"><section class="card"><div class="card-title"><div><span class="eyebrow">Rendimentos</span><h2>Caixinhas separadas</h2><p>Registre rendimento manualmente quando quiser separar CDI de faturamento.</p></div></div><div class="mini-stats"><div><span>Futuro agora</span><b>${privateMoney(balances.assets.futuro)}</b></div><div><span>Giro agora</span><b>${privateMoney(balances.assets.giro)}</b></div><div><span>Rendimento mês</span><b>${privateMoney(month.yield)}</b></div><div><span>Rendimento em bases</span><b>${privateMoney(snapshotYield)}</b></div></div><form class="form" data-form="quick-yield"><div class="form-grid"><label>Data<input type="date" name="data" value="${C.todayISO()}"></label><label>Caixinha<select name="account"><option value="futuro">Caixinha Futuro</option><option value="giro">Caixinha Giro</option></select></label><label>Valor<input class="money-field" name="value" inputmode="decimal" placeholder="0,00"></label></div><button class="primary-btn" type="submit">Salvar rendimento</button></form></section><section class="card"><div class="card-title"><div><span class="eyebrow">Histórico</span><h2>Rendimentos lançados</h2></div></div>${yields.length?`<div class="list">${yields.slice(0,12).map(m=>renderHistoryItem({kind:'movement', item:m, data:m.data, createdAt:m.createdAt})).join('')}</div>`:'<div class="empty">Nenhum rendimento manual lançado ainda.</div>'}</section></div>`;
  }

  function renderPerfil(){
    const lastBackup = state.settings.lastBackupAt ? new Date(state.settings.lastBackupAt).toLocaleString('pt-BR') : 'Nunca';
    return `<div class="grid two"><section class="card"><div class="card-title"><div><span class="eyebrow">Perfil</span><h2>Modo local estável</h2><p>Na linha v13 local, login e nuvem ficam bloqueados para proteger a base local.</p></div><span class="pill good">Local</span></div><form class="form" data-form="settings"><div class="form-grid"><label>Seu nome no app<input name="ownerName" value="${escapeHtml(state.settings.ownerName || '')}" placeholder="Renan"></label><label>Cartão fecha dia<input type="number" min="1" max="28" name="cardCloseDay" value="${state.settings.cardCloseDay}"></label><label>Cartão vence dia<input type="number" min="1" max="28" name="cardDueDay" value="${state.settings.cardDueDay}"></label></div><button class="primary-btn" type="submit">Salvar configurações</button></form><div class="logic-note"><b>Nuvem:</b> adiada para v13.10. O app não tenta login, não usa chave inválida e não bloqueia o uso local.</div></section><section class="card"><div class="card-title"><div><span class="eyebrow">Segurança</span><h2>Backup e restauração</h2><p>Último backup: ${escapeHtml(lastBackup)}</p></div></div><div class="quick-row stack"><button class="primary-btn" data-action="exportBackup">Baixar backup JSON</button><button class="ghost-btn" data-action="exportCSV">Exportar CSV</button><label class="file-btn">Importar backup JSON<input type="file" accept="application/json,.json" data-action="importBackupFile"></label><button class="danger-btn" data-action="resetApp">Zerar app local</button></div></section><section class="card full"><div class="card-title"><div><span class="eyebrow">Objetivo principal</span><h2>Meta e prazo</h2></div></div><form class="form" data-form="goal"><div class="form-grid"><label>Nome<input name="name" value="${escapeHtml(state.settings.goal.name)}"></label><label>Valor da meta<input class="money-field" name="target" inputmode="decimal" value="${C.currencyInput(state.settings.goal.target)}"></label><label>Data final<input type="date" name="due" value="${state.settings.goal.due}"></label></div><button class="primary-btn" type="submit">Salvar objetivo</button></form></section></div>`;
  }

  function openModal(html){
    const modal = $('#modal');
    modal.innerHTML = `<div class="modal-backdrop" data-action="closeModal"></div><div class="modal-card"><button class="modal-close" data-action="closeModal">×</button>${html}</div>`;
    modal.classList.add('show');
    modal.setAttribute('aria-hidden','false');
  }
  function closeModal(){ const modal=$('#modal'); if(modal){ modal.classList.remove('show'); modal.setAttribute('aria-hidden','true'); modal.innerHTML=''; } }

  function editGoalTarget(){
    const current = C.currencyInput(state.settings.goal.target) || '100.000,00';
    openModal(`<div class="card-title"><div><h2>Editar valor da meta</h2><p>Todos os campos de valor usam máscara igual: os centavos sobem enquanto você digita. Para R$ 100.000,00, digite 10000000 ou cole 100.000,00.</p></div></div><form class="form" data-form="goal-target"><label>Valor do objetivo<input class="money-field" name="target" inputmode="decimal" value="${escapeHtml(current)}" autofocus></label><button class="primary-btn" type="submit">Salvar</button></form>`);
    setTimeout(()=> $('[name="target"]', $('#modal'))?.focus(), 60);
  }
  function editGoalDue(){
    openModal(`<div class="card-title"><div><h2>Editar prazo da meta</h2><p>Ao mudar a data, o ritmo mensal necessário recalcula automaticamente.</p></div></div><form class="form" data-form="goal-due"><label>Data final<input type="date" name="due" value="${state.settings.goal.due}" autofocus></label><button class="primary-btn" type="submit">Salvar</button></form>`);
  }
  function quickPatrimonio(){ openModal(`<div class="card-title"><div><h2>Registrar patrimônio completo</h2><p>Essa base substitui os saldos estimados pelo saldo real do dia.</p></div></div>${patrimonioForm()}`); }
  function editSnapshot(id){ const item = state.patrimonio.find(p=>p.id===id); if(item) openModal(`<div class="card-title"><div><h2>Editar patrimônio</h2><p>Ajuste a base real salva.</p></div></div>${patrimonioForm(item)}`); }
  function editMovement(id){ const item = state.movements.find(m=>m.id===id); if(item) openModal(`<div class="card-title"><div><h2>Editar lançamento</h2><p>Ajuste o movimento salvo.</p></div></div>${movementForm(item)}`); }

  function savePatrimonioForm(form){
    const item = C.normalizeSnapshot({
      id: form.dataset.id || C.id('pat'),
      createdAt: form.dataset.id ? (state.patrimonio.find(p=>p.id===form.dataset.id)?.createdAt || C.nowISO()) : C.nowISO(),
      updatedAt: C.nowISO(),
      data: fieldValue(form,'data'),
      futuro: moneyValue(form,'futuro'), giro: moneyValue(form,'giro'), carteira: moneyValue(form,'carteira'), banco: moneyValue(form,'banco'), investimentos: moneyValue(form,'investimentos'),
      faturaAberta: moneyValue(form,'faturaAberta'), outrasDividas: moneyValue(form,'outrasDividas'), rendimentoFuturo: moneyValue(form,'rendimentoFuturo'), rendimentoGiro: moneyValue(form,'rendimentoGiro'),
      observacoes: fieldValue(form,'observacoes')
    });
    if(!C.isValidDate(item.data)) return notify('Informe uma data válida.', 'warn');
    backupBefore('salvar-patrimonio');
    const idx = state.patrimonio.findIndex(p=>p.id===item.id);
    if(idx >= 0) state.patrimonio[idx] = item; else state.patrimonio.push(item);
    state.patrimonio.sort(C.sortByDateThenCreated);
    saveState(); closeModal(); currentView='dashboard'; render(); notify('Patrimônio salvo e cálculos atualizados.', 'success');
  }
  function saveMovementForm(form){
    const type = fieldValue(form,'type') || 'entrada';
    const old = state.movements.find(m=>m.id===form.dataset.id);
    const item = C.normalizeMovement({
      id: form.dataset.id || C.id('mov'),
      createdAt: old?.createdAt || C.nowISO(),
      updatedAt: C.nowISO(),
      type,
      data: fieldValue(form,'data'),
      description: fieldValue(form,'description') || C.defaultMovementDescription(type),
      category: fieldValue(form,'category'),
      account: fieldValue(form,'account'),
      fromAccount: fieldValue(form,'fromAccount'),
      toAccount: fieldValue(form,'toAccount'),
      value: moneyValue(form,'value'),
      received: moneyValue(form,'received'),
      change: moneyValue(form,'change'),
      notes: fieldValue(form,'notes')
    });
    if(!C.isValidDate(item.data)) return notify('Informe uma data válida.', 'warn');
    if(type === 'ifood_dinheiro' && item.received <= 0) return notify('Informe o valor recebido em dinheiro.', 'warn');
    if(type !== 'ifood_dinheiro' && item.value <= 0) return notify('Informe um valor maior que zero.', 'warn');
    if(type === 'transferencia' && item.fromAccount === item.toAccount) return notify('Origem e destino precisam ser diferentes.', 'warn');
    backupBefore('salvar-movimento');
    const idx = state.movements.findIndex(m=>m.id===item.id);
    if(idx >= 0) state.movements[idx] = item; else state.movements.push(item);
    state.movements.sort(C.sortByDateThenCreated);
    saveState(); closeModal(); render(); notify('Lançamento salvo e saldos recalculados.', 'success');
  }
  function saveSettings(form){
    state.settings.ownerName = fieldValue(form,'ownerName').trim();
    state.settings.cardCloseDay = C.clamp(parseInt(fieldValue(form,'cardCloseDay'),10)||4,1,28);
    state.settings.cardDueDay = C.clamp(parseInt(fieldValue(form,'cardDueDay'),10)||11,1,28);
    saveState(); render(); notify('Configurações salvas.', 'success');
  }
  function saveGoal(form){
    const current = state.settings.goal || C.defaultState().settings.goal;
    const hasName = !!form.elements.name;
    const hasTarget = !!form.elements.target;
    const hasDue = !!form.elements.due;
    const goal = C.normalizeGoal({
      id: current.id || 'goal_main',
      name: hasName ? (fieldValue(form,'name') || current.name || 'Objetivo principal') : current.name,
      target: hasTarget ? moneyValue(form,'target') : current.target,
      due: hasDue ? fieldValue(form,'due') : current.due
    });
    if(goal.target <= 0) return notify('O valor do objetivo precisa ser maior que zero.', 'warn');
    if(!C.isValidDate(goal.due)) return notify('Informe uma data final válida.', 'warn');
    state.settings.goal = goal; saveState(); closeModal(); render(); notify('Objetivo atualizado. Cálculos recalculados.', 'success');
  }
  function saveQuickYield(form){
    const item = C.normalizeMovement({type:'rendimento', data: fieldValue(form,'data'), account: fieldValue(form,'account'), value: moneyValue(form,'value'), description: `Rendimento ${accountTitle(fieldValue(form,'account'))}`});
    if(item.value <= 0) return notify('Informe o rendimento.', 'warn');
    state.movements.push(item); state.movements.sort(C.sortByDateThenCreated); saveState(); render(); notify('Rendimento salvo separado do faturamento.', 'success');
  }
  function deleteSnapshot(id){
    if(!confirm('Excluir este patrimônio?')) return;
    backupBefore('excluir-patrimonio');
    state.patrimonio = state.patrimonio.filter(p=>p.id!==id); saveState(); closeModal(); render(); notify('Patrimônio excluído.', 'success');
  }
  function deleteMovement(id){
    if(!confirm('Excluir este lançamento?')) return;
    backupBefore('excluir-movimento');
    state.movements = state.movements.filter(m=>m.id!==id); saveState(); closeModal(); render(); notify('Lançamento excluído.', 'success');
  }
  function exportBackup(){
    state.settings.lastBackupAt = C.nowISO(); saveState();
    const payload = {exportedAt:C.nowISO(), appVersion:C.APP_VERSION, buildId:C.BUILD_ID, storageKey:C.STORAGE_KEY, data:state};
    downloadFile(JSON.stringify(payload,null,2), `${C.BACKUP_PREFIX}-${C.todayISO()}-${C.APP_VERSION}.json`, 'application/json');
    render(); notify('Backup JSON baixado.', 'success');
  }
  function exportCSV(){
    const rows = [['tipo','data','descricao','conta_origem','conta_destino','valor','recebido','troco','observacao']];
    state.patrimonio.forEach(p=>rows.push(['patrimonio',p.data,'Patrimônio líquido','','',C.snapshotAssets(p).liquido,'','',p.observacoes]));
    state.movements.forEach(m=>rows.push([movementTypeLabel(m.type),m.data,m.description,m.fromAccount||'',m.toAccount||m.account||'',m.value,m.received,m.change,m.notes]));
    const csv = rows.map(row => row.map(cell => `"${String(cell ?? '').replace(/"/g,'""')}"`).join(';')).join('\n');
    downloadFile(csv, `financeiro-crm-${C.todayISO()}-${C.APP_VERSION}.csv`, 'text/csv;charset=utf-8');
    notify('CSV exportado.', 'success');
  }
  function downloadFile(content, filename, type){
    const blob = new Blob([content], {type});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove(); URL.revokeObjectURL(url);
  }
  async function importBackupFile(file){
    if(!file) return;
    try{
      const text = await file.text();
      const parsed = JSON.parse(text);
      backupBefore('antes-importar');
      state = C.migrateState(parsed.data || parsed);
      saveState(); currentView='dashboard'; render(); notify('Backup importado com sucesso.', 'success');
    }catch(err){ console.error(err); notify('Não consegui importar esse JSON.', 'warn'); }
  }
  function resetApp(){
    if(!confirm('Zerar todos os dados locais?')) return;
    backupBefore('antes-zerar');
    state = C.defaultState(); saveState(); currentView='dashboard'; render(); notify('App zerado neste aparelho.', 'success');
  }

  document.addEventListener('click', (ev)=>{
    const viewBtn = ev.target.closest('[data-view]');
    if(viewBtn){ currentView = viewBtn.dataset.view; document.body.classList.remove('menu-open'); render(); return; }
    const btn = ev.target.closest('[data-action]');
    if(!btn) return;
    const action = btn.dataset.action;
    if(action === 'toggleMenu') document.body.classList.toggle('menu-open');
    if(action === 'toggleBalances'){ state.settings.hideBalances = !state.settings.hideBalances; saveState(); render(); }
    if(action === 'toggleDev'){ state.settings.devMode = !state.settings.devMode; saveState(); render(); notify(state.settings.devMode?'Modo desenvolvedor ativo.':'Modo usuário ativo.'); }
    if(action === 'quickPatrimonio') quickPatrimonio();
    if(action === 'editGoalTarget') editGoalTarget();
    if(action === 'editGoalDue') editGoalDue();
    if(action === 'closeModal') closeModal();
    if(action === 'editSnapshot') editSnapshot(btn.dataset.id);
    if(action === 'editMovement') editMovement(btn.dataset.id);
    if(action === 'deleteSnapshot') deleteSnapshot(btn.dataset.id);
    if(action === 'deleteMovement') deleteMovement(btn.dataset.id);
    if(action === 'exportBackup') exportBackup();
    if(action === 'exportCSV') exportCSV();
    if(action === 'resetApp') resetApp();
  });
  function applyMoneyMask(input){
    if(!input) return;
    input.value = C.currencyInputFromCentsDigits(input.value);
    try{ input.setSelectionRange(input.value.length, input.value.length); }catch(_){ }
  }
  function normalizeMoneyField(input){
    if(!input) return;
    input.value = C.normalizeCurrencyInputDisplay(input.value);
  }

  document.addEventListener('focusin', (ev)=>{
    const input = ev.target.closest('input.money-field');
    if(!input) return;
    setTimeout(()=>{ try{ input.select(); }catch(_){ } }, 0);
  });
  document.addEventListener('input', (ev)=>{
    const input = ev.target.closest('input.money-field');
    if(!input) return;
    applyMoneyMask(input);
  });
  document.addEventListener('focusout', (ev)=>{
    const input = ev.target.closest('input.money-field');
    if(!input) return;
    normalizeMoneyField(input);
  });

  document.addEventListener('submit', (ev)=>{
    const form = ev.target.closest('form[data-form]');
    if(!form) return;
    ev.preventDefault();
    const kind = form.dataset.form;
    if(kind === 'patrimonio') savePatrimonioForm(form);
    if(kind === 'movement') saveMovementForm(form);
    if(kind === 'settings') saveSettings(form);
    if(kind === 'goal' || kind === 'goal-target' || kind === 'goal-due') saveGoal(form);
    if(kind === 'quick-yield') saveQuickYield(form);
  });
  document.addEventListener('change', (ev)=>{
    const typeSelect = ev.target.closest('[data-role="movement-type"]');
    if(typeSelect){
      const form = typeSelect.closest('form');
      const dynamic = $('.movement-dynamic', form);
      const old = {
        type: typeSelect.value,
        account: fieldValue(form,'account') || 'banco',
        fromAccount: fieldValue(form,'fromAccount') || 'giro',
        toAccount: fieldValue(form,'toAccount') || 'carteira',
        value: moneyValue(form,'value'),
        received: moneyValue(form,'received'),
        change: moneyValue(form,'change')
      };
      dynamic.innerHTML = movementDynamicFields(old);
    }
    const file = ev.target.matches('[data-action="importBackupFile"]') ? ev.target.files[0] : null;
    if(file) importBackupFile(file);
  });
  document.addEventListener('keydown', (ev)=>{ if(ev.key === 'Escape') closeModal(); });

  window.addEventListener('load', ()=>{
    saveState();
    render();
    if('serviceWorker' in navigator){ navigator.serviceWorker.register('service-worker.js').catch(()=>{}); }
  });
})();
