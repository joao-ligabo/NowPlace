const $ = id => document.getElementById(id);
const video = $('video');
const canvas = $('canvas');
const ctx = canvas.getContext('2d');
const config = window.NOWPLACE_CONFIG;
const CHAVE = 'nowplace_ultima_publicacao';
const CHAVE_NOWS = 'nowplace_nows';
const UM_DIA = 24 * 60 * 60 * 1000;
let stream = null;
let fotoAmbiente = null;
let fotoSelfie = null;

function aviso(texto) { $('mensagem').textContent = texto; }
function apiPronta() { return !!(config.baseUrl && config.publicarPath); }
function urlApi(caminho) { return new URL(caminho, config.baseUrl.endsWith('/') ? config.baseUrl : config.baseUrl + '/'); }
function horario(data) { return new Date(data).toLocaleString('pt-BR'); }
function liberado() {
  const ultima = Number(localStorage.getItem(CHAVE));
  return ultima > 0 && Date.now() - ultima >= 0 && Date.now() - ultima < UM_DIA;
}
function atualizarRegra() {
  const ultima = Number(localStorage.getItem(CHAVE));
  $('regra').textContent = liberado()
    ? 'Feed liberado: você publicou um Now nas últimas 24 horas.'
    : 'Para consultar o feed, publique um Now. O acesso dura 24 horas.';
  $('buscar').disabled = !liberado();
}
async function ligarCamera() {
  if (!navigator.mediaDevices?.getUserMedia) { aviso('A câmera exige localhost ou HTTPS e um navegador compatível.'); return; }
  desligarCamera();
  try {
    stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: fotoAmbiente ? 'user' : 'environment' }, audio: false });
    video.srcObject = stream;
    await video.play();
    $('capturar').disabled = false;
    $('desligar').disabled = false;
    aviso('Câmera ligada.');
  } catch (erro) {
    aviso(erro.name === 'NotAllowedError' ? 'Permissão negada. Autorize a câmera no navegador.' : 'Não foi possível abrir a câmera: ' + erro.message);
    desligarCamera();
  }
}
function desligarCamera() {
  if (stream) stream.getTracks().forEach(track => track.stop());
  stream = null;
  video.srcObject = null;
  $('capturar').disabled = true;
  $('desligar').disabled = true;
}
function capturar() {
  if (!stream || !video.videoWidth) { aviso('Ligue a câmera antes de fotografar.'); return; }
  const escala = Math.min(1, 640 / video.videoWidth);
  canvas.width = Math.round(video.videoWidth * escala);
  canvas.height = Math.round(video.videoHeight * escala);
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const imagem = canvas.toDataURL('image/jpeg', .65);
  if (!fotoAmbiente) {
    fotoAmbiente = imagem;
    $('ambiente').src = imagem;
    $('ambiente').hidden = false;
    $('etapa').textContent = '2. Agora tire uma selfie.';
    $('capturar').textContent = 'Capturar selfie';
    // Troca para a câmera frontal, quando disponível.
    desligarCamera();
    ligarCamera();
  } else {
    fotoSelfie = imagem;
    $('selfie').src = imagem;
    $('selfie').hidden = false;
    $('etapa').textContent = '3. Confira as fotos e publique.';
    desligarCamera();
    $('publicar').disabled = false;
    aviso('As duas fotos foram capturadas.');
  }
}
function posicaoAtual() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('Geolocalização indisponível.')); return; }
    navigator.geolocation.getCurrentPosition(resolve, reject, { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 });
  });
}
async function requisicao(url, opcoes) {
  const resposta = await fetch(url, opcoes);
  if (!resposta.ok) throw new Error('API retornou HTTP ' + resposta.status);
  return resposta.json();
}
// IMPORTANTE: formato das requisições/respostas deve ser ajustado à API entregue em aula.
async function enderecoLegivel(latitude, longitude) {
  // JSONPlaceholder não possui endereços; usamos geocodificação reversa pública.
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.searchParams.set('lat', latitude);
  url.searchParams.set('lon', longitude);
  url.searchParams.set('format', 'json');
  url.searchParams.set('zoom', '16');
  url.searchParams.set('accept-language', 'pt-BR');
  const dados = await requisicao(url);
  if (!dados.display_name) throw new Error('Endereço não encontrado.');
  return dados.display_name;
}
function lerNows() {
  try { return JSON.parse(localStorage.getItem(CHAVE_NOWS) || '[]'); }
  catch { return []; }
}
async function publicar() {
  const usuario = $('usuario').value.trim();
  const descricao = $('descricao').value.trim();
  if (!usuario || !descricao || !fotoAmbiente || !fotoSelfie) { aviso('Informe nome, descrição e tire as duas fotos.'); return; }
  $('publicar').disabled = true;
  try {
    aviso('Obtendo sua localização...');
    const pos = await posicaoAtual();
    const latitude = pos.coords.latitude;
    const longitude = pos.coords.longitude;
    const endereco = await enderecoLegivel(latitude, longitude);
    $('local').textContent = 'Local: ' + endereco;
    const dados = { usuario, descricao, fotoAmbiente, fotoSelfie, latitude, longitude, endereco, dataHora: new Date().toISOString() };
    // A API de testes confirma a requisição, mas NÃO guarda publicações.
    await requisicao(urlApi(config.publicarPath), {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title: usuario, body: descricao, userId: 1 })
    });
    // Fotos reais ficam apenas neste navegador; não são enviadas à API pública.
    const nows = lerNows();
    nows.push(dados);
    try { localStorage.setItem(CHAVE_NOWS, JSON.stringify(nows)); }
    catch { throw new Error('Espaço insuficiente no Storage. Limpe publicações antigas do navegador.'); }
    localStorage.setItem(CHAVE, String(Date.now()));
    atualizarRegra();
    aviso('Now registrado neste navegador! A JSONPlaceholder não salva dados permanentemente.');
  } catch (erro) {
    aviso(erro.code === 1 ? 'Permissão de localização negada. Autorize nas configurações do navegador.' : 'Não foi possível publicar: ' + erro.message);
    $('publicar').disabled = false;
  }
}
function trocarPrincipal(area) {
  const imagens = area.querySelectorAll('img');
  imagens.forEach(img => { img.classList.toggle('principal'); img.classList.toggle('menor'); });
}
function criarCard(now) {
  const card = document.createElement('article'); card.className = 'card';
  const titulo = document.createElement('strong'); titulo.textContent = now.usuario ?? 'Usuário';
  const descricao = document.createElement('p'); descricao.textContent = now.descricao ?? '';
  const local = document.createElement('p'); local.textContent = '📍 ' + (now.endereco ?? 'Local não informado');
  const hora = document.createElement('small');
  const data = now.dataHora ?? now.criadoEm;
  hora.textContent = data && !isNaN(Date.parse(data)) ? horario(data) : 'Horário não disponível';
  const fotos = document.createElement('div'); fotos.className = 'fotos';
  for (const [i, src] of [now.fotoAmbiente, now.fotoSelfie].entries()) {
    if (typeof src !== 'string' || !src) continue;
    const img = document.createElement('img'); img.src = src;
    img.alt = i ? 'Selfie' : 'Ambiente';
    img.draggable = true; img.tabIndex = 0;
    img.className = i ? 'menor' : 'principal';
    img.addEventListener('dragstart', evento => evento.dataTransfer.setData('text/plain', 'trocar'));
    img.addEventListener('dragover', evento => evento.preventDefault());
    img.addEventListener('drop', evento => { evento.preventDefault(); trocarPrincipal(fotos); });
    img.addEventListener('keydown', evento => { if (evento.key === 'Enter' || evento.key === ' ') { evento.preventDefault(); trocarPrincipal(fotos); } });
    fotos.appendChild(img);
  }
  card.append(titulo, descricao, local, hora, fotos);
  return card;
}
function distanciaKm(lat1, lon1, lat2, lon2) {
  const rad = graus => graus * Math.PI / 180;
  const dLat = rad(lat2 - lat1), dLon = rad(lon2 - lon1);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(lat1)) * Math.cos(rad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 6371 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}
async function buscar() {
  atualizarRegra();
  if (!liberado()) { aviso('Publique um Now para liberar o feed durante 24 horas.'); return; }
  const raio = Number($('raio').value);
  if (!Number.isFinite(raio) || raio < 1 || raio > 100) { aviso('Informe um raio entre 1 e 100 km.'); return; }
  $('buscar').disabled = true;
  try {
    const pos = await posicaoAtual();
    const nows = lerNows().filter(now =>
      distanciaKm(pos.coords.latitude, pos.coords.longitude, now.latitude, now.longitude) <= raio
    );
    $('feed').replaceChildren();
    if (!nows.length) { $('feed').textContent = 'Não há Nows registrados neste navegador dentro do raio.'; return; }
    nows.reverse().forEach(now => $('feed').appendChild(criarCard(now)));
    aviso(nows.length + ' Now(s) local(is) encontrado(s). Arraste uma foto sobre a outra para trocar a principal.');
  } catch (erro) {
    aviso(erro.code === 1 ? 'Autorize a localização para buscar Nows.' : 'Erro ao consultar Nows: ' + erro.message);
  } finally { atualizarRegra(); }
}
function novaPublicacao() {
  desligarCamera(); fotoAmbiente = null; fotoSelfie = null;
  $('ambiente').removeAttribute('src'); $('selfie').removeAttribute('src');
  $('ambiente').hidden = true; $('selfie').hidden = true;
  $('capturar').textContent = 'Capturar ambiente';
  $('etapa').textContent = '1. Ligue a câmera e fotografe o ambiente.';
  $('local').textContent = 'Localização obtida ao publicar.';
  $('publicar').disabled = true;
  aviso('Pronto para uma nova publicação.');
}
$('ligar').addEventListener('click', ligarCamera);
$('desligar').addEventListener('click', () => { desligarCamera(); aviso('Câmera desligada corretamente.'); });
$('capturar').addEventListener('click', capturar);
$('publicar').addEventListener('click', publicar);
$('reiniciar').addEventListener('click', novaPublicacao);
$('buscar').addEventListener('click', buscar);
window.addEventListener('pagehide', desligarCamera);
atualizarRegra();
