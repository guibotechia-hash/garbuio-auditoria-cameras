const checklistItems = [
  'Quantidade mínima de câmeras conforme exigência do contrato selecionado',
  'Posicionamento correto (frontal/lateral/interna-motorista/traseira-ré)',
  'Ausência de obstrução de lente',
  'Gravação vinculada à chave geral (não grava desligado)',
  'Integridade de 100% dos vídeos no período mínimo de coleta',
  'Metadados corretos (data/hora, placa, velocidade, coordenadas)',
  'Armazenamento mínimo cumprido',
  'Retenção estendida em acidente grave',
  'Proteção contra edição/exclusão não autorizada',
  'Monitoramento e transmissão ativos',
  'Análise/IA de vídeo aplicada quando exigido',
  'Termo de aceite/LGPD assinado',
  'Disponibilização de imagens dentro do prazo',
  'Ausência de ocorrência de obstrução/score de violação'
];
const references = {
  ICONIC: { title: 'ICONIC', items: ['Câmeras recomendadas, sem mínimo numérico fixo no manual.', 'Item crítico: não desabilitar ou alterar a posição da câmera (violação disciplinar/PAD).'] },
  PETROBRAS: { title: 'PETROBRAS', items: ['Mínimo 4 câmeras (frontal-via, cabine-motorista, lateral, traseira) para produtos perigosos.', 'Retenção mínima: 10 dias. Envio obrigatório de mídia à Torre de Controle.', 'Obstrução de câmera: ocorrência gravíssima = 10 pontos.', 'Score: 40% alerta transportadora · 60% alerta Petrobras · 100% motorista bloqueado.'] },
  IPIRANGA: { title: 'IPIRANGA (MOVER)', items: ['Mínimo 4 câmeras (2 laterais + 2 internas), câmera de fadiga e câmera de ré.', 'Coleta em até 7 dias com integridade 100%.', 'Armazenamento mínimo de 1 mês (5 anos se acidente grave).', 'Imagens em até 24h; avaliação mensal dos motoristas; não conformidades arquivadas por 2 anos.'] }
};
let vehicles = [];
let selectedVehicle = null;
const $ = (selector) => document.querySelector(selector);
const normalizeStatus = (status) => status === 'OFFLINE' ? 'NAO CONFORME' : (status || 'NUNCA AUDITADO');
const slug = (value) => normalizeStatus(value).toLowerCase().replaceAll(' ', '-');
function savedAudits() { return JSON.parse(localStorage.getItem('garbuio-auditorias') || '{}'); }
function currentRecord(vehicle) {
  const records = Object.values(savedAudits()).filter((audit) => audit.placa === vehicle.placa);
  return records.sort((a, b) => b.data.localeCompare(a.data))[0];
}
function displayStatus(vehicle) { return currentRecord(vehicle)?.resultado || normalizeStatus(vehicle.status_atual); }
function renderList() {
  const query = $('#search').value.toUpperCase();
  const status = $('#status-filter').value;
  const manufacturer = $('#manufacturer-filter').value;
  const filtered = vehicles.filter((vehicle) => `${vehicle.placa} ${vehicle.operacao}`.toUpperCase().includes(query) && (!status || displayStatus(vehicle) === status) && (!manufacturer || vehicle.fabricante === manufacturer));
  $('#result-count').textContent = `${filtered.length} veículo${filtered.length === 1 ? '' : 's'} encontrado${filtered.length === 1 ? '' : 's'}`;
  $('#empty-state').classList.toggle('hidden', filtered.length !== 0);
  $('#vehicle-list').innerHTML = filtered.map((vehicle) => `<button class="vehicle-card" data-plate="${vehicle.placa.replaceAll('"', '&quot;')}"><div class="card-top"><span class="plate">${vehicle.placa}</span><span class="status-badge status-${slug(displayStatus(vehicle))}">${displayStatus(vehicle)}</span></div><div class="operation">${vehicle.operacao || 'Operação não informada'}</div><div class="card-bottom"><span>${vehicle.fabricante || 'Fabricante não informado'}</span><span>${vehicle.ultima_verificacao || 'Sem verificação'}</span></div></button>`).join('');
  document.querySelectorAll('.vehicle-card').forEach((card) => card.addEventListener('click', () => openAudit(card.dataset.plate)));
}
function renderChecklist() {
  $('#checklist').innerHTML = checklistItems.map((item, index) => `<div class="check-item"><label><input type="checkbox" data-index="${index}"><span>${item}</span></label><label><span class="sr-only">Observação do item ${index + 1}</span><input class="item-note" data-note="${index}" placeholder="Observação opcional"></label></div>`).join('');
}
function renderReference() { const reference = references[$('#contract').value]; $('#reference-panel').innerHTML = `<p class="eyebrow">Painel de referência</p><h3>${reference.title}</h3><ul>${reference.items.map((item) => `<li>${item}</li>`).join('')}</ul>`; }
function openAudit(plate) {
  selectedVehicle = vehicles.find((vehicle) => vehicle.placa === plate); if (!selectedVehicle) return;
  $('#list-view').classList.add('hidden'); $('#audit-view').classList.remove('hidden'); $('#audit-title').textContent = selectedVehicle.placa; $('#audit-meta').textContent = `${selectedVehicle.operacao || 'Operação não informada'} · ${selectedVehicle.fabricante || 'Fabricante não informado'}`;
  $('#audit-status').textContent = displayStatus(selectedVehicle); $('#audit-status').className = `status-badge status-${slug(displayStatus(selectedVehicle))}`;
  $('#audit-date').value = new Date().toISOString().slice(0, 10); $('#days').value = Number.parseInt(selectedVehicle.dias_gravados, 10) || '';
  $('#general-notes').value = selectedVehicle.observacoes || ''; $('#contract').value = 'ICONIC'; renderChecklist(); renderReference(); window.scrollTo({ top: 0, behavior: 'smooth' });
}
function saveAudit(event) {
  event.preventDefault(); const data = { placa: selectedVehicle.placa, contrato: $('#contract').value, data: $('#audit-date').value, dias_gravados: $('#days').value, resultado: document.querySelector('input[name="result"]:checked').value, observacoes_gerais: $('#general-notes').value, itens: [...document.querySelectorAll('.check-item')].map((item, index) => ({ item: checklistItems[index], conforme: item.querySelector('input[type="checkbox"]').checked, observacao: item.querySelector('[data-note]').value })) };
  const audits = savedAudits(); audits[`${data.placa}-${data.data}`] = data; localStorage.setItem('garbuio-auditorias', JSON.stringify(audits)); $('#audit-view').classList.add('hidden'); $('#list-view').classList.remove('hidden'); renderList(); window.scrollTo({ top: 0, behavior: 'smooth' });
}
function exportCsv() {
  const audits = Object.values(savedAudits()); if (!audits.length) { alert('Nenhuma auditoria salva para exportar.'); return; }
  const headers = ['placa', 'contrato', 'data', 'dias_gravados', 'resultado', 'observacoes_gerais']; const csv = [headers, ...audits.map((audit) => headers.map((header) => audit[header] || ''))].map((row) => row.map((value) => `"${String(value).replaceAll('"', '""')}"`).join(';')).join('\n');
  const link = document.createElement('a'); link.href = URL.createObjectURL(new Blob([`\ufeff${csv}`], { type: 'text/csv;charset=utf-8' })); link.download = 'auditorias-garbuio.csv'; link.click(); URL.revokeObjectURL(link.href);
}
async function init() { try { vehicles = await fetch('vehicles.json').then((response) => response.json()); renderList(); } catch (error) { $('#result-count').textContent = 'Não foi possível carregar os veículos.'; console.error(error); } $('#year').textContent = new Date().getFullYear(); }
$('#search').addEventListener('input', renderList); $('#status-filter').addEventListener('change', renderList); $('#manufacturer-filter').addEventListener('change', renderList); $('#contract').addEventListener('change', renderReference); $('#audit-form').addEventListener('submit', saveAudit); $('#back-btn').addEventListener('click', () => { $('#audit-view').classList.add('hidden'); $('#list-view').classList.remove('hidden'); renderList(); }); $('#export-btn').addEventListener('click', exportCsv); init();