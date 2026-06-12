// Supabase Sync Configuration
const SUPABASE_URL = 'https://ryrbywaaxiwnjtvfennr.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJ5cmJ5d2FheGl3bmp0dmZlbm5yIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODEyMjQxMjEsImV4cCI6MjA5NjgwMDEyMX0.QbQ3E7-9TbTkJ0AaOsNxZQ1dCppoluBlqkx2YGB52Uc';

async function pushToCloud(key, value) {
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/sync_state?on_conflict=key`, {
      method: 'POST',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'resolution=merge-duplicates'
      },
      body: JSON.stringify({
        key: key,
        value: value,
        updated_at: new Date().toISOString()
      })
    });
    if (!response.ok) {
      console.error('Error pushing data to Supabase:', response.statusText);
    }
  } catch (error) {
    console.error('Network error syncing to Supabase:', error);
  }
}

let isSyncing = false;
async function pullFromCloud() {
  if (isSyncing) return;
  isSyncing = true;
  try {
    const response = await fetch(`${SUPABASE_URL}/rest/v1/sync_state`, {
      method: 'GET',
      headers: {
        'apikey': SUPABASE_KEY,
        'Authorization': `Bearer ${SUPABASE_KEY}`
      }
    });
    if (response.ok) {
      const data = await response.json();
      let hasChanges = false;
      
      data.forEach(row => {
        const localVal = localStorage.getItem(row.key);
        const incomingStr = typeof row.value === 'string' ? row.value : JSON.stringify(row.value);
        if (localVal !== incomingStr) {
          originalSetItem.call(localStorage, row.key, incomingStr);
          hasChanges = true;
        }
      });
      
      if (hasChanges) {
        console.log('Cloud updates pulled. Refreshing UI...');
        refreshUI();
      }
    }
  } catch (error) {
    console.error('Error pulling data from Supabase:', error);
  } finally {
    isSyncing = false;
  }
}

function refreshUI() {
  initAnnouncements();
  initTips();
  initChecklist();
  initGoals();
  initRecentCopies();
  initScratchpad();
  initWeeklyChart();
  initAlertsSystem();
  initRoadmap();
  renderFilterPills();
  renderGrid();
  renderTipsCarousel();
  renderChecklist();
}

// Intercept localStorage.setItem to sync to Supabase
const originalSetItem = localStorage.setItem;
localStorage.setItem = function(key, value) {
  originalSetItem.call(localStorage, key, value);
  if (key.startsWith('uppi_') && key !== 'uppi_auth_session') {
    try {
      let parsedValue;
      try {
        parsedValue = JSON.parse(value);
      } catch (e) {
        parsedValue = value;
      }
      pushToCloud(key, parsedValue);
    } catch (err) {
      console.error('Sync error:', err);
    }
  }
};

// State Management
let announcements = [];
let selectedCategory = 'all';
let searchQuery = '';
let activeDetailId = null;
let isCategoryManuallySelected = false;
let isReadabilityActive = false;

// Growth panel state variables
let growthTips = [];
let currentTipIndex = 0;
let checklistItems = [];

// Premium Features state variables
let recentCopies = [];
let dailyGoal = 200;
let dailyEarnings = 0;
let dailyExpenses = 0;
let expensesList = [];
let totalRides = 0;
let activeVariables = {};
let weeklyEarnings = { Seg: 0, Ter: 0, Qua: 0, Qui: 0, Sex: 0, Sáb: 0, Dom: 0 };
let activeAlerts = [];

const DEFAULT_TIPS = [
  { tag: "📢 Divulgação Local", text: "Adesive o vidro traseiro dos primeiros 15 motoristas para espalhar a marca do Uppi rapidamente no centro e bairros de Castanhal." },
  { tag: "🤝 Parcerias Comerciais", text: "Feche parcerias com bares e lanchonetes famosos da Praça do Estrela. Coloque o banner deles no app em troca de batatas fritas ou brindes para quem for de Uppi." },
  { tag: "💸 Modelo de Caixa Justo", text: "Taxa zero nas corridas em dinheiro ou Pix direto fideliza motoristas na hora. Cobre taxas ou assinaturas apenas nas corridas digitais." },
  { tag: "💎 Cadastro Fundador", text: "Venda o lote VIP \"50 Fundadores do Uppi\" por R$ 100 com 30 dias de taxa zero. Isso capitaliza o seu caixa logo no primeiro dia!" },
  { tag: "📍 Estratégia de Nicho", text: "Foque nos bairros onde as gigantes cancelam corridas (Jaderlândia, Ianetama, Apeú). O motorista que ganha bem não cancela e conquista o cliente." }
];

const DEFAULT_CHECKLIST = [
  { id: "check-1", text: "Adesivar primeiros 15 carros de Castanhal", completed: false },
  { id: "check-2", text: "Fazer parceria com 3 bares na Praça do Estrela", completed: false },
  { id: "check-3", text: "Criar grupo de suporte para motoristas fundadores", completed: false },
  { id: "check-4", text: "Panfletagem no semáforo da Barão do Rio Branco", completed: false },
  { id: "check-5", text: "Lançar cupom CASTANHAL5 para novos usuários", completed: false }
];

const NEIGHBORHOOD_STRATEGIES = {
  centro: "Foco total na captação ativa nos comércios da Alameda Barão do Rio Branco e Praça do Estrela. Coloque adesivos e banners nos principais comércios e ofereça cupons promocionais para novos passageiros da área comercial.",
  ianetama: "Bairro residencial muito forte. Excelente local para divulgar a Uppi em horários comerciais da manhã. Focar em parcerias com escolas locais e panfletagem nas principais vias residenciais.",
  jaderlandia: "É o bairro mais distante e com maior índice de cancelamentos de outros aplicativos. Foque na fidelização dos moradores de lá: mostre que os motoristas fundadores do Uppi são moradores locais e garantem as corridas. Excelente para campanha de panfletagem de rua e posts em grupos comunitários.",
  apeu: "Zona turística de lazer. Foque em campanhas durante sextas, sábados e domingos na Orla do Apeú e nos igarapés. Divulgue a Uppi para pessoas que saem dos balneários e restaurantes da vila do Apeú.",
  estrela: "Pólo gastronômico e boêmio de Castanhal (bares e lanchonetes). Crie parcerias de 'volta segura' com estabelecimentos famosos, oferecendo cupons Uppi no fechamento de contas em troca de divulgação nos cardápios digitais."
};

// DOM Elements
const cardsGrid = document.getElementById('cards-grid');
const emptyState = document.getElementById('empty-state');
const searchInput = document.getElementById('search-input');
const filterPills = document.querySelectorAll('.filter-pill');

// Quick Paste Elements
const quickPasteInput = document.getElementById('quick-paste-input');
const btnQuickPaste = document.getElementById('btn-quick-paste');

// Compose Modal Elements
const modalCompose = document.getElementById('modal-compose');
const btnOpenCompose = document.getElementById('btn-open-compose');
const btnCloseCompose = document.getElementById('btn-close-compose');
const btnCancelCompose = document.getElementById('btn-cancel-compose');
const composeForm = document.getElementById('compose-form');
const modalOrganizerInput = document.getElementById('modal-organizer-input');

// Detail Modal Elements
const modalDetail = document.getElementById('modal-detail');
const btnCloseDetail = document.getElementById('btn-close-detail');
const btnCopyDetail = document.getElementById('btn-copy-detail');
const btnCopyDetailText = document.getElementById('btn-copy-detail-text');
const btnDeleteDetail = document.getElementById('btn-delete-detail');
const detailBadge = document.getElementById('detail-badge');
const detailAuthor = document.getElementById('detail-author');
const detailDate = document.getElementById('detail-date');
const detailTitle = document.getElementById('detail-title');
const detailContent = document.getElementById('detail-content');

// Toast Notification
const toastMessage = document.getElementById('toast-message');

// Premium Features elements
const btnVoiceSearch = document.getElementById('btn-voice-search');
const btnExportBackup = document.getElementById('btn-export-backup');
const btnImportBackup = document.getElementById('btn-import-backup');
const importBackupFile = document.getElementById('import-backup-file');
const detailVariablesContainer = document.getElementById('detail-variables-container');
const recentCopiesList = document.getElementById('recent-copies-list');

// Default Announcements Data
const DEFAULT_ANNOUNCEMENTS = [
  {
    id: '1',
    title: 'Convite para Motoristas (WhatsApp)',
    content: 'Fala, parceiro! Beleza? 🚗\n\nTa sabendo da novidade? Acaba de chegar o Uppi, o novo aplicativo de mobilidade feito por quem é daqui de Castanhal!\n\nO app já tá 100% pronto e estamos cadastrando os primeiros motoristas da cidade com condições exclusivas de lançamento:\n\n📈 Taxa muito mais baixa que os apps tradicionais (sobra mais dinheiro no seu bolso).\n🤝 Suporte direto e humanizado, sem falar com robô.\n📍 Foco total na nossa região (Centro, Ianetama, Jaderlândia, Estrela, Apeú e bairros).\n\nQuer ser um dos pioneiros e faturar mais rodando na nossa cidade? Responde aqui com um QUERO que te mando o link para baixar o app e liberar seu cadastro agora mesmo! 🚀',
    category: 'recrutamento',
    author: 'Lançamento Uppi',
    date: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '2',
    title: 'Post de Anúncio no Instagram (Para Passageiros)',
    content: 'Cansado de viagens canceladas e preço dinâmico absurdo na cidade? 😤\n\nVá de Uppi! 🚗💨\n\nO novo aplicativo de mobilidade urbana feito sob medida para Castanhal. \n\n✅ Carro rápido e de confiança\n✅ Sem surpresas no preço (fim do preço dinâmico abusivo!)\n✅ Motoristas locais que conhecem a cidade do Apeú ao Jaderlândia.\n\nBaixe o app agora mesmo no link da nossa bio e experimente a evolução da mobilidade na Cidade Modelo! 💚✨\n\n#Castanhal #UppiMobilidade #VouDeUppi #CidadeModelo',
    category: 'lancamento',
    author: 'Marketing Uppi',
    date: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
  },
  {
    id: '3',
    title: 'Script de Proposta para Parcerias Comerciais',
    content: 'Olá, tudo bem? Sou o criador do Uppi, o novo aplicativo de viagens oficial de Castanhal! 🚗\n\nEstamos lançando a plataforma e gostaria de colocar a marca do seu estabelecimento em destaque para todos os nossos passageiros dentro do nosso mapa e aplicativo de graça.\n\nEm troca, tudo o que te peço é um benefício exclusivo (como 10% de desconto ou um brinde) para o cliente que vier de Uppi consumir aqui. \n\nVocê ganha novos clientes vindos de todas as partes da cidade, publicidade gratuita, e nós incentivamos o uso do transporte local. O que acha de fecharmos essa parceria para o lançamento?',
    category: 'mensagem',
    author: 'Comercial Uppi',
    date: new Date().toISOString()
  }
];

// Helper: Format Date
function formatDate(dateString) {
  const date = new Date(dateString);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  return `${day}/${month}/${year}`;
}

// Helper: Show Toast
function showToast(text) {
  toastMessage.textContent = text;
  toastMessage.classList.remove('hidden');
  toastMessage.style.opacity = '1';
  
  setTimeout(() => {
    toastMessage.style.opacity = '0';
    setTimeout(() => {
      toastMessage.classList.add('hidden');
    }, 300);
  }, 2000);
}

// Dynamic Category Registry
const DEFAULT_CATEGORY_KEYS = {
  lancamento: true,
  comunicado: true,
  recrutamento: true,
  mensagem: true,
  dicas: true,
  regras: true
};

let CATEGORY_REGISTRY = {
  lancamento: { badgeClass: 'badge-lancamento', label: '🚀 Lançamento' },
  comunicado: { badgeClass: 'badge-comunicado', label: '📢 Comunicado' },
  recrutamento: { badgeClass: 'badge-recrutamento', label: '💼 Recrutamento' },
  mensagem: { badgeClass: 'badge-mensagem', label: '✉️ Boas-vindas' },
  dicas: { badgeClass: 'badge-dicas', label: '💡 Dicas' },
  regras: { badgeClass: 'badge-regras', label: '⚙️ Regras' }
};

function addDynamicBadgeStyle(key) {
  const styleId = `style-badge-${key}`;
  if (document.getElementById(styleId)) return;
  
  let hash = 0;
  for (let i = 0; i < key.length; i++) {
    hash = key.charCodeAt(i) + ((hash << 5) - hash);
  }
  const h = Math.abs(hash % 360);
  const background = `hsla(${h}, 60%, 40%, 0.15)`;
  const color = `hsl(${h}, 90%, 75%)`;
  const border = `1px solid hsla(${h}, 60%, 55%, 0.25)`;

  const style = document.createElement('style');
  style.id = styleId;
  style.innerHTML = `
    .badge-custom-${key} {
      background-color: ${background} !important;
      color: ${color} !important;
      border: ${border} !important;
    }
  `;
  document.head.appendChild(style);
}

function registerCategory(name, key = null) {
  if (!name) return 'comunicado';
  
  const computedKey = key || name.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-z0-9]/g, "");
  if (!computedKey) return 'comunicado';
  
  if (!CATEGORY_REGISTRY[computedKey]) {
    let emoji = '📁';
    const lowerName = name.toLowerCase();
    if (lowerName.includes('taxa') || lowerName.includes('financ') || lowerName.includes('ganho') || lowerName.includes('dinheiro') || lowerName.includes('caixa')) {
      emoji = '💵';
    } else if (lowerName.includes('suporte') || lowerName.includes('ajuda') || lowerName.includes('sac') || lowerName.includes('contato')) {
      emoji = '💬';
    } else if (lowerName.includes('dica') || lowerName.includes('estrateg') || lowerName.includes('ideia') || lowerName.includes('marketing')) {
      emoji = '💡';
    } else if (lowerName.includes('motorista') || lowerName.includes('cadastro') || lowerName.includes('recrut')) {
      emoji = '💼';
    } else if (lowerName.includes('lanc') || lowerName.includes('novidade') || lowerName.includes('chegou')) {
      emoji = '🚀';
    } else if (lowerName.includes('comunic') || lowerName.includes('aviso') || lowerName.includes('oficial')) {
      emoji = '📢';
    } else if (lowerName.includes('mensagem') || lowerName.includes('boas') || lowerName.includes('sauda')) {
      emoji = '✉️';
    }

    CATEGORY_REGISTRY[computedKey] = {
      badgeClass: `badge-custom-${computedKey}`,
      label: `${emoji} ${name}`
    };

    addDynamicBadgeStyle(computedKey);
  }
  return computedKey;
}

function cleanTitle(title) {
  if (!title) return 'Estratégia Uppi';
  return title
    .replace(/[*_:#\-]/g, '')
    .replace(/^(?:copie,\s*cole\s*e\s*adapte\s*este\s*texto\s*para\s*enviar\s*nos\s*grupos\s*e\s*para\s*os\s*motoristas\s*da\s*cidade)/i, '')
    .replace(/^(?:copie,\s*cole\s*e\s*envie\s*este\s*texto)/i, '')
    .replace(/^(?:use\s*o\s*slogan)/i, '')
    .replace(/^(?:use\s*este\s*texto)/i, '')
    .replace(/^(?:biografia\s+do\s+instagram)/i, 'Bio Instagram')
    .replace(/^(?:ideias\s+de\s+postagens)/i, 'Post Instagram')
    .trim();
}

function formatTextForReadability(text) {
  if (!text) return '';
  const parts = text.split('\n');
  const formattedParts = parts.map(part => {
    let line = part.trim();
    if (!line) return '';
    
    // Space after emoji prefix
    line = line.replace(/^([^\w\s\d])(?!\s)/, '$1 ');
    
    // Space out dense sentences into distinct paragraphs
    line = line.replace(/([\.!\?])\s+(?=[A-ZÀ-ÿ🚗📱👥🤝💎📈✅💚✨📢💸📍🚀📩✉️📝🏁📖💥🔥])/g, '$1\n\n');
    return line;
  });
  
  return formattedParts.filter(p => p.length > 0).join('\n\n').replace(/\n{3,}/g, '\n\n');
}

function determineCategory(text) {
  const lines = text.split('\n');
  
  // 1. Look for explicit Categoria/Tag/Assunto/Tema: <Nome>
  for (let line of lines) {
    const cleanLine = line.trim();
    const match = cleanLine.match(/^(?:categoria|tag|assunto|tema|grupo)\s*:\s*(.+)$/i);
    if (match) {
      const categoryName = match[1].replace(/[*_]/g, '').trim();
      if (categoryName.length > 0 && categoryName.length < 30) {
        return registerCategory(categoryName);
      }
    }
  }

  // 2. Look for bracketed headings at the start: e.g. "[Financeiro] Taxas do app"
  for (let line of lines) {
    const cleanLine = line.trim();
    if (!cleanLine) continue;
    const matchBracket = cleanLine.match(/^\[([^\]]+)\]/);
    if (matchBracket) {
      const categoryName = matchBracket[1].trim();
      if (categoryName.length > 1 && categoryName.length < 20 && !/^\d+$/.test(categoryName)) {
        return registerCategory(categoryName);
      }
    }
    break; // Only check the first non-empty line
  }

  // 3. Look for hashtags: e.g. #financeiro
  const hashtags = text.match(/#([a-zA-ZáéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]{3,15})\b/);
  if (hashtags) {
    const tagWord = hashtags[1];
    const categoryName = tagWord.charAt(0).toUpperCase() + tagWord.slice(1).toLowerCase();
    return registerCategory(categoryName);
  }

  // 4. Fallback to keyword matching
  const lowercaseText = text.toLowerCase();
  
  // 4.1 Check for Launch keywords (higher priority)
  if (lowercaseText.includes('lançament') || lowercaseText.includes('novidade') || lowercaseText.includes('chegou o uppi') || lowercaseText.includes('estabilidade do preço') || lowercaseText.includes('vou de uppi') || lowercaseText.includes('pioneiro')) {
    return 'lancamento';
  }
  
  // 4.2 Check for Dicas (Marketing, posts, Instagram suggestions)
  if (lowercaseText.includes('biografia do instagram') || lowercaseText.includes('ideias de postagens') || lowercaseText.includes('slogan') || lowercaseText.includes('post instagram') || lowercaseText.includes('perfil do instagram') || lowercaseText.includes('redes sociais') || lowercaseText.includes('divulga') || lowercaseText.includes('panfletagem') || lowercaseText.includes('marketing') || lowercaseText.includes('copie, cole e adapte') || lowercaseText.includes('copie, cole e envie')) {
    return 'dicas';
  }

  // 4.3 Check for Regras (App functioning, ratings, rules)
  if (lowercaseText.includes('reputação') || lowercaseText.includes('pontos de confiança') || lowercaseText.includes('curte o') || lowercaseText.includes('curte a') || lowercaseText.includes('curta o') || lowercaseText.includes('curta a') || lowercaseText.includes('avaliação') || lowercaseText.includes('cancelamento') || lowercaseText.includes('taxas do app') || lowercaseText.includes('fidelidade') || lowercaseText.includes('regras de parceria') || lowercaseText.includes('funcionamento do app')) {
    return 'regras';
  }
  
  // 4.4 Check for Mensagem / Parcerias Comerciais (proposals, welcomes)
  if (lowercaseText.includes('olá, tudo bem? sou o criador') || lowercaseText.includes('fechar essa parceria') || lowercaseText.includes('parcerias comerciais') || lowercaseText.includes('estabelecimento') || lowercaseText.includes('cupom de desconto') || lowercaseText.includes('boas-vindas') || lowercaseText.includes('seja bem-vindo')) {
    return 'mensagem';
  }
  
  // 4.5 Check for Recrutamento / Cadastro (driver registration)
  if (lowercaseText.includes('seja um parceiro') || lowercaseText.includes('liberar seu cadastro') || lowercaseText.includes('cadastrar os primeiros') || lowercaseText.includes('venha ser um') || lowercaseText.includes('recrutamento') || lowercaseText.includes('ficha de cadastro') || lowercaseText.includes('cadastro de motorista')) {
    return 'recrutamento';
  }

  return 'comunicado';
}

function isHeading(line) {
  const clean = line.replace(/[*_]/g, '').trim();
  if (!clean || clean.length > 80) return false;

  const lower = clean.toLowerCase();

  // Custom heading starters
  if (lower.startsWith('biografia do instagram') || 
      lower.startsWith('ideias de postagens') ||
      lower.startsWith('próximos passos práticos') ||
      lower.startsWith('proximos passos praticos') ||
      lower.startsWith('sugestão de perfil') ||
      lower.startsWith('sugestao de perfil')
  ) {
    return true;
  }

  // Starts with emoji followed by space/number
  if (/^[^\w\s\d]\s*/.test(clean)) return true;

  // Numbered list headers or letters: e.g. "1. ", "Opção A: ", "A Regra: ", "Post 2 (Para o Passageiro):"
  if (/^(?:[\[\(\{\s]*\d+[\]\)\}\s]*[\.\:-]+)/i.test(clean)) return true;
  if (/^(?:modelo\s+\d+|opção\s+[a-z]|opcao\s+[a-z]|post\s+\d+|cupom\s+[a-z]+|cria\s+a\s+categoria|defina\s+a\s+sua|defina\s+o\s+preço|defina\s+o\s+preco)/i.test(clean)) return true;

  // Ends with colon
  if (clean.endsWith(':')) return true;

  // Fully uppercase short line
  const lettersOnly = clean.replace(/[^a-zA-ZáéíóúâêîôûãõçÁÉÍÓÚÂÊÎÔÛÃÕÇ]/g, '');
  if (lettersOnly.length > 3 && clean === clean.toUpperCase() && clean.length < 50) return true;

  return false;
}

function parseBlock(blockText) {
  const lines = blockText.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length === 0) return null;

  let title = 'Estratégia Uppi';
  let startIndex = 0;

  // If the first line is a heading, use it as title
  if (isHeading(lines[0])) {
    title = cleanTitle(lines[0]);
    startIndex = 1;
  } else {
    // If not a heading, make a short title from the first sentence or first line
    const firstLine = lines[0];
    title = firstLine.length > 40 ? firstLine.substring(0, 37) + '...' : firstLine;
  }

  const content = lines.slice(startIndex).join('\n');
  const category = determineCategory(blockText);

  // Check if content has a quoted template inside
  // Use non-greedy regex for quotes
  const quoteRegex = /["“”«»]([^"“”«»]{15,})["“”«»]/;
  const match = quoteRegex.exec(content);
  let copyContent = content;

  if (match) {
    copyContent = match[1].trim();
  }

  const catRegistryData = CATEGORY_REGISTRY[category];
  const categoryLabel = catRegistryData ? catRegistryData.label.replace(/^([^\w\s\d]+\s*)/, '') : 'Comunicado';

  return {
    title,
    content,
    copyContent,
    category,
    categoryLabel
  };
}

function shouldKeepBlock(block) {
  const cleanTitleStr = block.title.toLowerCase().replace(/\s+/g, ' ').normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
  const cleanContent = block.content.toLowerCase().replace(/\s+/g, ' ').normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();

  // If content is too short, skip
  if (cleanContent.length < 10) return false;

  // If it's search engine results or links page, discard
  if (cleanContent.includes('instagram.com') && cleanContent.includes('http')) return false;
  if (cleanContent.includes('owasp top ten') || cleanContent.includes('drunk elephant') || cleanContent.includes('vivo mais rapidos')) return false;
  if (cleanTitleStr.includes('1 site') || cleanTitleStr.includes('dev community') || cleanTitleStr.includes('wavy.com') || cleanTitleStr.includes('mashable') || cleanTitleStr.includes('the running mann') || cleanTitleStr.includes('the cycling podcast')) {
    return false;
  }

  // Discard user questions or prompt fragments
  const userPhrases = [
    'veja se organizou', 'na verdade eu quero', 'ta mas a questao', 'ta mas o que o', 'jesus quebrado dele',
    'mas oq eu vou', 'mas eu nao quero', 'ta mas e tipo', 'mas como a gente', 'mas ai tipo assim',
    'bora uppi', 'uppi esse nome', 'boa', 'sim me ajude com tudo', 'oqq', 'mas oq eu vou ganhar', 'vc nao ta derrubando',
    'mas oq eu'
  ];
  for (let phrase of userPhrases) {
    if (cleanTitleStr.startsWith(phrase) || cleanContent.startsWith(phrase)) {
      return false;
    }
  }

  // Strategic commentary paragraphs that are just chat banter or introductory remarks (without actual guidelines or templates)
  if (cleanContent.startsWith('parabens por tirar') || 
      cleanContent.startsWith('entendi!') || 
      cleanContent.startsWith('que sensacional!') ||
      cleanContent.startsWith('voce tem toda razao!') ||
      cleanContent.startsWith('rapaz, me desculpa!') ||
      cleanContent.startsWith('exatamente! o') ||
      cleanContent.startsWith('entendi perfeitamente agora!') ||
      cleanContent.startsWith('vamos estruturar')
  ) {
    // Keep it if it has list structure or is reasonably long, but discard if it's just introductory chat banter
    if (cleanContent.split('\n').length <= 2 && !cleanContent.includes('🚗') && !cleanContent.includes('📱')) {
      return false;
    }
  }

  return true;
}

function splitAndParseText(rawText) {
  if (!rawText || !rawText.trim()) return [];

  const normalized = rawText.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');
  
  const blocks = [];
  let currentBlock = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const prevLineIsEmpty = i > 0 && lines[i - 1].trim() === '';

    // Split on ANY line that is a heading, or when preceded by an empty line
    if (isHeading(line) || (prevLineIsEmpty && currentBlock.length > 0 && line.trim() !== '')) {
      if (currentBlock.length > 0) {
        blocks.push(currentBlock.join('\n').trim());
      }
      currentBlock = [line];
    } else {
      currentBlock.push(line);
    }
  }
  if (currentBlock.length > 0) {
    blocks.push(currentBlock.join('\n').trim());
  }

  const cards = [];
  for (let block of blocks) {
    const parsed = parseBlock(block);
    if (!parsed) continue;

    if (shouldKeepBlock(parsed)) {
      cards.push(parsed);
    }
  }

  return cards;
}

// Load and Clear storage key
function initAnnouncements() {
  // Free old key
  if (localStorage.getItem('uppi_announcements')) {
    localStorage.removeItem('uppi_announcements');
  }

  const stored = localStorage.getItem('uppi_announcements_v4');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        announcements = parsed;
        // Register any saved custom categories
        announcements.forEach(post => {
          if (post.category && !CATEGORY_REGISTRY[post.category]) {
            const label = post.categoryLabel || (post.category.charAt(0).toUpperCase() + post.category.slice(1));
            registerCategory(label, post.category);
          }
        });
      } else {
        announcements = [...DEFAULT_ANNOUNCEMENTS];
        saveAnnouncements();
      }
    } catch (e) {
      announcements = [...DEFAULT_ANNOUNCEMENTS];
      saveAnnouncements();
    }
  } else {
    announcements = [...DEFAULT_ANNOUNCEMENTS];
    saveAnnouncements();
  }
  reclassifyExistingAnnouncements();
}

function reclassifyExistingAnnouncements() {
  let changed = false;
  announcements.forEach(post => {
    const oldCat = post.category;
    const newCat = determineCategory(post.title + '\n' + post.content);
    if (oldCat !== newCat && ['recrutamento', 'comunicado', 'mensagem', 'lancamento', 'dicas', 'regras'].includes(oldCat)) {
      post.category = newCat;
      const catRegistryData = CATEGORY_REGISTRY[newCat];
      post.categoryLabel = catRegistryData ? catRegistryData.label.replace(/^([^\w\s\d]+\s*)/, '') : 'Comunicado';
      changed = true;
    }
  });
  if (changed) {
    saveAnnouncements();
    console.log('Announcements reclassified to resolve old categorization bug.');
  }
}

function saveAnnouncements() {
  localStorage.setItem('uppi_announcements_v4', JSON.stringify(announcements));
}

// Dynamic tips manager
function initTips() {
  const stored = localStorage.getItem('uppi_custom_tips_v1');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        growthTips = parsed;
        return;
      }
    } catch (e) {
      console.error('Error loading custom tips:', e);
    }
  }
  growthTips = [...DEFAULT_TIPS];
  saveTips();
}

function saveTips() {
  localStorage.setItem('uppi_custom_tips_v1', JSON.stringify(growthTips));
}

function renderTipsCarousel() {
  const carouselContainer = document.querySelector('.tips-carousel');
  if (!carouselContainer) return;
  
  carouselContainer.innerHTML = '';
  growthTips.forEach((tip, idx) => {
    const slide = document.createElement('div');
    slide.className = `tip-slide ${idx === currentTipIndex ? 'active' : ''}`;
    slide.innerHTML = `
      <span class="tip-tag">${escapeHtml(tip.tag)}</span>
      <p class="tip-text">${escapeHtml(tip.text)}</p>
    `;
    carouselContainer.appendChild(slide);
  });

  const indicator = document.getElementById('tips-indicator');
  if (indicator) {
    indicator.textContent = growthTips.length > 0 ? `${currentTipIndex + 1} / ${growthTips.length}` : '0 / 0';
  }
}

// Checklist Manager
function initChecklist() {
  const stored = localStorage.getItem('uppi_marketing_checklist_v1');
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        checklistItems = parsed;
        return;
      }
    } catch (e) {
      console.error('Error loading checklist:', e);
    }
  }
  checklistItems = [...DEFAULT_CHECKLIST];
  saveChecklist();
}

function saveChecklist() {
  localStorage.setItem('uppi_marketing_checklist_v1', JSON.stringify(checklistItems));
}

function renderChecklist() {
  const listElement = document.getElementById('checklist-items-list');
  if (!listElement) return;

  listElement.innerHTML = '';
  let completedCount = 0;

  checklistItems.forEach(item => {
    if (item.completed) completedCount++;

    const li = document.createElement('li');
    li.className = `checklist-item ${item.completed ? 'completed' : ''}`;
    li.dataset.id = item.id;
    li.innerHTML = `
      <div class="checklist-checkbox">
        <svg class="checklist-checkbox-icon" viewBox="0 0 24 24" fill="currentColor" style="width: 10px; height: 10px; color: #000000; display: ${item.completed ? 'block' : 'none'};">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17Z"/>
        </svg>
      </div>
      <span class="checklist-item-text">${escapeHtml(item.text)}</span>
    `;

    li.addEventListener('click', () => {
      item.completed = !item.completed;
      saveChecklist();
      renderChecklist();
    });

    listElement.appendChild(li);
  });

  const progressText = document.getElementById('checklist-progress-text');
  const progressFill = document.getElementById('checklist-progress-fill');
  const total = checklistItems.length;
  const percent = total > 0 ? Math.round((completedCount / total) * 100) : 0;

  if (progressText) {
    progressText.textContent = `Progresso: ${percent}% (${completedCount} de ${total})`;
  }
  if (progressFill) {
    progressFill.style.width = `${percent}%`;
  }

  // Update left-column permanent widget
  const leftCount = document.getElementById('left-checklist-count');
  const leftFill = document.getElementById('left-checklist-fill');
  if (leftCount) {
    leftCount.textContent = `${completedCount} / ${total}`;
  }
  if (leftFill) {
    leftFill.style.width = `${percent}%`;
  }
}

// Calculator Manager
function updateCalculator() {
  const calcRideValue = document.getElementById('calc-ride-value');
  const calcUppiEarning = document.getElementById('calc-uppi-earning');
  
  // Fuel calculator inputs & outputs
  const calcFuelDist = document.getElementById('calc-fuel-dist');
  const calcFuelCons = document.getElementById('calc-fuel-cons');
  const calcFuelPrice = document.getElementById('calc-fuel-price');
  
  const calcFuelCost = document.getElementById('calc-fuel-cost');
  const calcUppiNetProfit = document.getElementById('calc-uppi-net-profit');
  const calcOtherNetProfit = document.getElementById('calc-other-net-profit');
  const calcDiffEarning = document.getElementById('calc-diff-earning');

  if (!calcRideValue || !calcUppiEarning) return;
  const rawVal = parseFloat(calcRideValue.value) || 0;
  
  const dist = parseFloat(calcFuelDist ? calcFuelDist.value : 5) || 0;
  const cons = parseFloat(calcFuelCons ? calcFuelCons.value : 10) || 1;
  const price = parseFloat(calcFuelPrice ? calcFuelPrice.value : 5.50) || 0;

  const fuelCost = (dist / cons) * price;
  const uppiEarning = rawVal;
  const uppiNetProfit = Math.max(0, uppiEarning - fuelCost);
  const otherEarning = rawVal * 0.70;
  const otherNetProfit = Math.max(0, otherEarning - fuelCost);
  const diff = Math.max(0, uppiNetProfit - otherNetProfit);

  calcUppiEarning.textContent = `R$ ${uppiEarning.toFixed(2).replace('.', ',')}`;
  if (calcFuelCost) calcFuelCost.textContent = `R$ ${fuelCost.toFixed(2).replace('.', ',')}`;
  if (calcUppiNetProfit) calcUppiNetProfit.textContent = `R$ ${uppiNetProfit.toFixed(2).replace('.', ',')}`;
  if (calcOtherNetProfit) calcOtherNetProfit.textContent = `R$ ${otherNetProfit.toFixed(2).replace('.', ',')}`;
  if (calcDiffEarning) calcDiffEarning.textContent = `R$ ${diff.toFixed(2).replace('.', ',')}`;
}

// Filter Pills Manager
function renderFilterPills() {
  const container = document.getElementById('filter-pills-container');
  if (!container) return;

  container.innerHTML = '';

  // 1. Render "Todos" pill
  const allPill = document.createElement('button');
  allPill.className = `filter-pill ${selectedCategory === 'all' ? 'active' : ''}`;
  allPill.dataset.category = 'all';
  allPill.innerHTML = `
    <svg viewBox="0 0 24 24" fill="none" class="pill-icon"><rect x="3" y="3" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="2"/><rect x="14" y="3" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="2"/><rect x="3" y="14" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="2"/><rect x="14" y="14" width="7" height="7" rx="1.5" stroke="currentColor" stroke-width="2"/></svg>
    Todos
  `;
  allPill.addEventListener('click', () => handlePillClick(allPill, 'all'));
  container.appendChild(allPill);

  // 2. Render dynamic pills
  const categoriesInUse = new Set();
  Object.keys(DEFAULT_CATEGORY_KEYS).forEach(k => categoriesInUse.add(k));
  announcements.forEach(post => {
    if (post.category) categoriesInUse.add(post.category);
  });

  categoriesInUse.forEach(catKey => {
    const catData = CATEGORY_REGISTRY[catKey];
    if (!catData) return;

    const pill = document.createElement('button');
    pill.className = `filter-pill ${selectedCategory === catKey ? 'active' : ''}`;
    pill.dataset.category = catKey;
    
    const emojiMatch = catData.label.match(/^([^\w\s\d]+)/);
    const emoji = emojiMatch ? emojiMatch[1] : '📁';
    const cleanLabel = catData.label.replace(/^([^\w\s\d]+\s*)/, '');

    pill.innerHTML = `
      <span class="pill-emoji-icon" style="margin-right: 4px;">${emoji}</span>
      ${cleanLabel}
    `;
    pill.addEventListener('click', () => handlePillClick(pill, catKey));
    container.appendChild(pill);
  });
}

function handlePillClick(pillElement, categoryKey) {
  const container = document.getElementById('filter-pills-container');
  if (!container) return;
  container.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
  pillElement.classList.add('active');
  selectedCategory = categoryKey;
  renderGrid();
}

// Helper: increment copy count
function incrementCopyCount(id) {
  const post = announcements.find(item => item.id === id);
  if (post) {
    post.copyCount = (post.copyCount || 0) + 1;
    saveAnnouncements();
    setTimeout(renderGrid, 1000); // Delayed render so copy button feedback doesn't get interrupted
  }
}

function renderGrid() {
  cardsGrid.innerHTML = '';
  
  // Find maximum copy count for the "Most Copied" badge
  let maxCopyCount = 0;
  announcements.forEach(post => {
    if (post.copyCount && post.copyCount > maxCopyCount) {
      maxCopyCount = post.copyCount;
    }
  });

  const filtered = announcements.filter(post => {
    if (post.archived) return false; // Hide archived notes
    const matchesCat = selectedCategory === 'all' || post.category === selectedCategory;
    const matchesSearch = 
      post.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      post.author.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesSearch;
  });

  // Sort favorites first, then newest first
  const sorted = filtered.sort((a, b) => {
    const favA = a.isFavorite ? 1 : 0;
    const favB = b.isFavorite ? 1 : 0;
    if (favA !== favB) return favB - favA;
    return new Date(b.date) - new Date(a.date);
  });

  if (sorted.length === 0) {
    emptyState.classList.remove('hidden');
    cardsGrid.classList.add('hidden');
    return;
  }

  emptyState.classList.add('hidden');
  cardsGrid.classList.remove('hidden');

  // Group by category
  const grouped = {};
  sorted.forEach(post => {
    if (!grouped[post.category]) {
      grouped[post.category] = [];
    }
    grouped[post.category].push(post);
  });

  // Render grouped sections
  Object.keys(grouped).forEach(catKey => {
    const catData = CATEGORY_REGISTRY[catKey] || { badgeClass: 'badge-comunicado', label: '📁 Geral' };
    const postsInCat = grouped[catKey];
    
    // Create section element spanning full grid width
    const section = document.createElement('section');
    section.className = 'category-section';
    section.style.gridColumn = '1 / -1';
    section.style.display = 'flex';
    section.style.flexDirection = 'column';
    section.style.gap = '16px';
    section.style.marginBottom = '24px';
    section.style.width = '100%';
    
    // Section Header
    const header = document.createElement('div');
    header.className = 'category-section-header';
    header.style.display = 'flex';
    header.style.alignItems = 'center';
    header.style.gap = '8px';
    header.style.borderBottom = '1px solid var(--card-border)';
    header.style.paddingBottom = '8px';
    header.style.marginTop = '12px';
    
    header.innerHTML = `
      <h2 style="font-family: var(--font-title); font-size: 13px; font-weight: 800; color: var(--accent-green); letter-spacing: 0.5px; text-transform: uppercase; margin: 0;">
        ${catData.label}
      </h2>
      <span style="background: rgba(255,255,255,0.03); border: 1px solid var(--card-border); color: var(--text-secondary); font-size: 9px; font-weight: 700; padding: 2px 6px; border-radius: 10px; font-family: var(--font-body);">
        ${postsInCat.length} ${postsInCat.length === 1 ? 'modelo' : 'modelos'}
      </span>
    `;
    section.appendChild(header);
    
    // Inner Cards Grid for this category
    const subGrid = document.createElement('div');
    subGrid.style.display = 'grid';
    subGrid.style.gridTemplateColumns = 'repeat(auto-fill, minmax(320px, 1fr))';
    subGrid.style.gap = '16px';
    subGrid.style.width = '100%';
    
    postsInCat.forEach(post => {
      const card = document.createElement('article');
      card.className = `card ${post.isFavorite ? 'favorite' : ''}`;
      card.dataset.id = post.id;
      
      const isMostCopied = maxCopyCount > 0 && post.copyCount === maxCopyCount;
      const isFavoriteClass = post.isFavorite ? 'active' : '';
      
      card.innerHTML = `
        <div class="card-header">
          <span class="badge ${catData.badgeClass}">${catData.label}</span>
          <div style="display:flex;align-items:center;gap:6px;">
            <span class="card-date">${formatDate(post.date)}</span>
            <button class="btn-favorite ${isFavoriteClass}" data-id="${post.id}" title="Favoritar">
              <svg class="favorite-icon" viewBox="0 0 24 24" fill="currentColor">
                <path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/>
              </svg>
            </button>
          </div>
        </div>
        <h3 class="card-title">${escapeHtml(post.title)}</h3>
        <p class="card-excerpt">${escapeHtml(post.content)}</p>
        <div class="card-footer">
          ${isMostCopied ? `<span class="badge badge-most-copied" style="margin-right:auto;">🔥 ${post.copyCount}x</span>` : ''}
          <button class="btn-copy" data-id="${post.id}">
            <svg viewBox="0 0 24 24" fill="none" class="btn-copy-icon">
              <path d="M16 4H4V16H16V4ZM18 2H2V18H18V2ZM22 6H20V20H6V22H22V6Z" fill="currentColor"/>
            </svg>
            <span class="copy-text">Copiar</span>
          </button>
        </div>
      `;


      // Star Button click
      const btnFav = card.querySelector('.btn-favorite');
      btnFav.addEventListener('click', (e) => {
        e.stopPropagation();
        post.isFavorite = !post.isFavorite;
        saveAnnouncements();
        renderGrid();
      });

      // Click on Card opens details (unless copy or favorite clicked)
      card.addEventListener('click', (e) => {
        if (e.target.closest('.btn-copy') || e.target.closest('.btn-favorite')) return;
        openDetailModal(post);
      });


      // Wire Copy Button
      const btnCopy = card.querySelector('.btn-copy');
      btnCopy.addEventListener('click', (e) => {
        e.stopPropagation();
        incrementCopyCount(post.id);
        addToRecentCopies(post);
        copyTextToClipboard(post.copyContent || post.content, btnCopy);
      });

      subGrid.appendChild(card);
    });
    section.appendChild(subGrid);
    cardsGrid.appendChild(section);
  });
}

// Escape HTML utility
function escapeHtml(text) {
  if (!text) return '';
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Copy to Clipboard Core
function copyTextToClipboard(text, btnElement = null) {
  navigator.clipboard.writeText(text).then(() => {
    showToast('Copiado para a área de transferência!');
    
    if (btnElement) {
      btnElement.classList.add('copied');
      const textSpan = btnElement.querySelector('.copy-text') || btnElement.querySelector('span');
      const originalText = textSpan.textContent;
      
      // Update icon and text
      textSpan.textContent = 'Copiado';
      const originalSvg = btnElement.querySelector('svg').innerHTML;
      btnElement.querySelector('svg').innerHTML = '<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17Z" fill="currentColor"/>';

      setTimeout(() => {
        btnElement.classList.remove('copied');
        textSpan.textContent = originalText;
        btnElement.querySelector('svg').innerHTML = originalSvg;
      }, 2000);
    }
  }).catch(err => {
    console.error('Falha ao copiar:', err);
  });
}

// Detail Modal Opening
// Helper for card checklist parsing
function getOrCreateCardChecklist(post) {
  const key = `uppi_card_checklist_${post.id}`;
  const stored = localStorage.getItem(key);
  if (stored) {
    try {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed;
      }
    } catch (e) {}
  }
  
  const lines = post.content.split('\n');
  const items = [];
  let itemIdCounter = 0;
  
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed) return;
    
    // Check if bullet: starts with -, *, •, or numbers/letters list
    const isBullet = /^(?:[-*•]|\d+[\.\)]|[a-zA-Z][\.\)])\s+/.test(trimmed) || /^[^\w\s\d]\s+/.test(trimmed);
    if (isBullet) {
      const textOnly = trimmed
        .replace(/^(?:[-*•]|\d+[\.\)]|[a-zA-Z][\.\)]|[^\w\s\d])\s+/, '')
        .replace(/[*_]/g, '')
        .trim();
      if (textOnly && textOnly.length > 3) {
        items.push({
          id: `item-${itemIdCounter++}`,
          text: textOnly,
          completed: false
        });
      }
    }
  });
  
  return items;
}

function renderCardChecklist(post) {
  const container = document.getElementById('detail-checklist-container');
  if (!container) return;

  const items = getOrCreateCardChecklist(post);
  if (items.length === 0) {
    container.classList.add('hidden');
    return;
  }

  container.classList.remove('hidden');
  container.innerHTML = '<h3 style="font-family: var(--font-title); font-size: 10px; font-weight: 700; color: var(--text-secondary); letter-spacing: 0.5px; margin-bottom: 8px;">📋 TAREFAS DESTA ESTRATÉGIA</h3>';

  const listUl = document.createElement('ul');
  listUl.className = 'checklist-items';

  items.forEach(item => {
    const li = document.createElement('li');
    li.className = `checklist-item ${item.completed ? 'completed' : ''}`;
    li.dataset.id = item.id;
    li.innerHTML = `
      <div class="checklist-checkbox">
        <svg class="checklist-checkbox-icon" viewBox="0 0 24 24" fill="currentColor" style="width: 10px; height: 10px; color: #000000; display: ${item.completed ? 'block' : 'none'};">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17Z"/>
        </svg>
      </div>
      <span class="checklist-item-text">${escapeHtml(item.text)}</span>
    `;

    li.addEventListener('click', (e) => {
      e.stopPropagation();
      item.completed = !item.completed;
      const key = `uppi_card_checklist_${post.id}`;
      localStorage.setItem(key, JSON.stringify(items));
      renderCardChecklist(post);
    });

    listUl.appendChild(li);
  });

  container.appendChild(listUl);
}

// Detail Modal Opening
// Helper for template variables parsing
function setupVariablesInDetailModal(post) {
  if (!detailVariablesContainer) return;
  
  const regex = /\[([^\]]+)\]/g;
  const content = post.content;
  const matches = [...new Set([...content.matchAll(regex)].map(m => m[1]))];
  
  if (matches.length === 0) {
    detailVariablesContainer.classList.add('hidden');
    activeVariables = {};
    return;
  }
  
  detailVariablesContainer.classList.remove('hidden');
  detailVariablesContainer.innerHTML = '<h3 style="font-family: var(--font-title); font-size: 10px; font-weight: 700; color: var(--text-secondary); letter-spacing: 0.5px; margin-bottom: 8px;">✏️ CAMPOS DA MENSAGEM</h3>';
  
  activeVariables = {};
  
  matches.forEach(varName => {
    activeVariables[varName] = `[${varName}]`;
    
    const field = document.createElement('div');
    field.className = 'variable-field';
    field.innerHTML = `
      <label>${escapeHtml(varName)}</label>
      <input type="text" data-var="${escapeHtml(varName)}" placeholder="Preencher ${escapeHtml(varName)}...">
    `;
    
    const input = field.querySelector('input');
    input.addEventListener('input', (e) => {
      const val = e.target.value.trim();
      activeVariables[varName] = val || `[${varName}]`;
      updateDetailContentWithVariables(post);
    });
    
    detailVariablesContainer.appendChild(field);
  });
}

function updateDetailContentWithVariables(post) {
  let text = isReadabilityActive ? formatTextForReadability(post.content) : post.content;
  
  Object.keys(activeVariables).forEach(varName => {
    const escapedVar = varName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
    const regex = new RegExp('\\[' + escapedVar + '\\]', 'g');
    text = text.replace(regex, activeVariables[varName]);
  });
  
  detailContent.textContent = text;
}

// Detail Modal Opening
function openDetailModal(post) {
  activeDetailId = post.id;
  isReadabilityActive = false; // Reset to false on open
  
  const catData = CATEGORY_REGISTRY[post.category] || CATEGORY_REGISTRY.mensagem;

  detailBadge.textContent = catData.label;
  detailBadge.className = `detail-category-badge badge ${catData.badgeClass}`;
  detailAuthor.textContent = post.author;
  detailDate.textContent = formatDate(post.date);
  detailTitle.textContent = post.title;
  detailContent.textContent = post.content;

  // Reset readability button UI
  const btnReadability = document.getElementById('btn-toggle-readability');
  const btnReadabilityText = document.getElementById('btn-readability-text');
  if (btnReadability) {
    btnReadability.classList.remove('active');
  }
  if (btnReadabilityText) {
    btnReadabilityText.textContent = 'Melhorar Leitura 📖';
  }

  // Setup variable fields if brackets detected
  setupVariablesInDetailModal(post);

  // Render checklists inside detail modal if applicable
  renderCardChecklist(post);

  // Set up detail copy button texts and actions
  btnCopyDetail.classList.remove('copied');
  if (post.copyContent && post.copyContent !== post.content) {
    btnCopyDetailText.textContent = 'Copiar Mensagem Limpa ⚡';
  } else {
    btnCopyDetailText.textContent = 'Copiar Mensagem';
  }
  btnCopyDetail.querySelector('.copy-icon').innerHTML = '<path d="M16 4H4V16H16V4ZM18 2H2V18H18V2ZM22 6H20V20H6V22H22V6Z" fill="currentColor"/>';

  // Copy click handler
  btnCopyDetail.onclick = () => {
    incrementCopyCount(post.id);
    addToRecentCopies(post);
    
    let textToCopy = post.copyContent || post.content;
    Object.keys(activeVariables).forEach(varName => {
      const escapedVar = varName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp('\\[' + escapedVar + '\\]', 'g');
      textToCopy = textToCopy.replace(regex, activeVariables[varName]);
    });
    
    if (isReadabilityActive) {
      textToCopy = formatTextForReadability(textToCopy);
    }
    
    copyTextToClipboard(textToCopy, btnCopyDetail);
  };

  // WhatsApp click handler
  const btnWADetail = document.getElementById('btn-whatsapp-detail');
  btnWADetail.onclick = () => {
    incrementCopyCount(post.id);
    addToRecentCopies(post);
    
    let textToShare = post.copyContent || post.content;
    Object.keys(activeVariables).forEach(varName => {
      const escapedVar = varName.replace(/[-\/\\^$*+?.()|[\]{}]/g, '\\$&');
      const regex = new RegExp('\\[' + escapedVar + '\\]', 'g');
      textToShare = textToShare.replace(regex, activeVariables[varName]);
    });
    
    if (isReadabilityActive) {
      textToShare = formatTextForReadability(textToShare);
    }
    
    window.open(`https://api.whatsapp.com/send?text=${encodeURIComponent(textToShare)}`, '_blank');
  };

  // Readability Toggle click handler
  if (btnReadability) {
    btnReadability.onclick = () => {
      isReadabilityActive = !isReadabilityActive;
      if (isReadabilityActive) {
        btnReadability.classList.add('active');
        if (btnReadabilityText) {
          btnReadabilityText.textContent = 'Texto Original 📖';
        }
        updateDetailContentWithVariables(post);
      } else {
        btnReadability.classList.remove('active');
        if (btnReadabilityText) {
          btnReadabilityText.textContent = 'Melhorar Leitura 📖';
        }
        updateDetailContentWithVariables(post);
      }
    };
  }

  // ── Note Actions Bar ──────────────────────────────────────────────
  let currentFontSize = 16; // px

  // Populate move-category select
  const selectCat = document.getElementById('select-move-category');
  if (selectCat) {
    selectCat.innerHTML = '<option value="">📂 Mover para…</option>';
    Object.keys(CATEGORY_REGISTRY).forEach(key => {
      const opt = document.createElement('option');
      opt.value = key;
      opt.textContent = CATEGORY_REGISTRY[key].label;
      if (key === post.category) opt.selected = true;
      selectCat.appendChild(opt);
    });
    selectCat.onchange = () => {
      const newCat = selectCat.value;
      if (!newCat || newCat === post.category) return;
      post.category = newCat;
      const catData = CATEGORY_REGISTRY[newCat];
      post.categoryLabel = catData ? catData.label.replace(/^([^\w\s\d]+\s*)/, '') : 'Comunicado';
      saveAnnouncements();
      renderGrid();
      renderFilterPills();
      // Update badge in modal
      detailBadge.textContent = catData ? catData.label : 'Comunicado';
      detailBadge.className = `detail-category-badge badge ${catData ? catData.badgeClass : 'badge-comunicado'}`;
      showToast(`✅ Nota movida para ${catData ? catData.label : newCat}`);
    };
  }

  // Font size controls
  const btnFontSmaller = document.getElementById('btn-font-smaller');
  const btnFontLarger  = document.getElementById('btn-font-larger');
  currentFontSize = 16;
  if (detailContent) detailContent.style.fontSize = currentFontSize + 'px';

  if (btnFontSmaller) {
    btnFontSmaller.onclick = () => {
      currentFontSize = Math.max(11, currentFontSize - 2);
      detailContent.style.fontSize = currentFontSize + 'px';
    };
  }
  if (btnFontLarger) {
    btnFontLarger.onclick = () => {
      currentFontSize = Math.min(26, currentFontSize + 2);
      detailContent.style.fontSize = currentFontSize + 'px';
    };
  }

  // Rename title — swap h1 for an input field (works on all browsers/mobile)
  const btnEditTitle = document.getElementById('btn-edit-title');
  if (btnEditTitle) {
    btnEditTitle.onclick = () => {
      const isEditing = btnEditTitle.classList.contains('editing-active');
      if (!isEditing) {
        // Replace h1 with input
        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'detail-title-input';
        input.value = post.title;
        input.style.cssText = `
          width:100%; background:#2c2c2e; border:none; border-bottom:2px solid var(--accent-green);
          color:#fff; font-family:var(--font-title); font-size:22px; font-weight:800;
          padding:4px 0; outline:none; border-radius:0;
        `;
        detailTitle.style.display = 'none';
        detailTitle.parentNode.insertBefore(input, detailTitle);
        input.focus();
        input.select();
        btnEditTitle.classList.add('editing-active');
        btnEditTitle.innerHTML = `<svg viewBox="0 0 24 24" fill="none" style="width:13px;height:13px"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17Z" fill="currentColor"/></svg> Salvar`;
        input.onkeydown = (e) => { if (e.key === 'Enter') btnEditTitle.click(); };
      } else {
        // Save and swap back to h1
        const input = document.getElementById('detail-title-input');
        const newTitle = input ? input.value.trim() : post.title;
        if (input) input.parentNode.removeChild(input);
        detailTitle.style.display = '';
        detailTitle.textContent = newTitle || post.title;
        btnEditTitle.classList.remove('editing-active');
        btnEditTitle.innerHTML = `<svg viewBox="0 0 24 24" fill="none" style="width:13px;height:13px"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z" fill="currentColor"/></svg> Renomear`;
        if (newTitle && newTitle !== post.title) {
          post.title = newTitle;
          saveAnnouncements();
          renderGrid();
          showToast('✅ Título salvo!');
        }
      }
    };
  }


  // Edit content — toggle between display div and textarea
  const btnEditContent = document.getElementById('btn-edit-content');
  let contentTextarea = null;
  if (btnEditContent) {
    btnEditContent.onclick = () => {
      const isEditing = !!contentTextarea;
      if (!isEditing) {
        // Switch to textarea
        contentTextarea = document.createElement('textarea');
        contentTextarea.className = 'detail-content-editing';
        contentTextarea.style.fontSize = currentFontSize + 'px';
        contentTextarea.value = post.content;
        detailContent.style.display = 'none';
        detailContent.parentNode.insertBefore(contentTextarea, detailContent);
        contentTextarea.focus();
        btnEditContent.classList.add('editing-active');
        btnEditContent.innerHTML = `<svg viewBox="0 0 24 24" fill="none" style="width:13px;height:13px"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17Z" fill="currentColor"/></svg> Salvar`;
      } else {
        // Save and switch back to display div
        const newContent = contentTextarea.value.trim();
        contentTextarea.parentNode.removeChild(contentTextarea);
        contentTextarea = null;
        detailContent.style.display = '';
        btnEditContent.classList.remove('editing-active');
        btnEditContent.innerHTML = `<svg viewBox="0 0 24 24" fill="none" style="width:13px;height:13px"><path d="M14.06 9.02l.92.92L5.92 19H5v-.92l9.06-9.06zM17.66 3a1 1 0 0 0-.7.29l-1.83 1.83 3.75 3.75 1.83-1.83a1 1 0 0 0 0-1.41l-2.34-2.34a1 1 0 0 0-.71-.29zm-3.6 3.19L3 17.25V21h3.75L17.81 9.94l-3.75-3.75z" fill="currentColor"/></svg> Editar`;
        if (newContent && newContent !== post.content) {
          post.content = newContent;
          post.copyContent = newContent;
          // Re-detect category from new text
          const newCat = determineCategory(post.title + '\n' + newContent);
          post.category = newCat;
          const catData = CATEGORY_REGISTRY[newCat];
          post.categoryLabel = catData ? catData.label.replace(/^([^\w\s\d]+\s*)/, '') : 'Comunicado';
          saveAnnouncements();
          renderGrid();
          renderFilterPills();
          // Refresh modal display
          detailContent.textContent = newContent;
          detailBadge.textContent = catData ? catData.label : 'Comunicado';
          detailBadge.className = `detail-category-badge badge ${catData ? catData.badgeClass : 'badge-comunicado'}`;
          // Update category select
          const sc = document.getElementById('select-move-category');
          if (sc) Array.from(sc.options).forEach(o => o.selected = o.value === newCat);
          showToast('✅ Nota atualizada e categoria detectada!');
        }
      }
    };
  }

  // Archive note
  const btnArchive = document.getElementById('btn-archive-note');
  if (btnArchive) {
    const isArchived = !!post.archived;
    btnArchive.innerHTML = isArchived
      ? `<svg viewBox="0 0 24 24" fill="none" style="width:13px;height:13px"><path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 6.5L17.5 12H14v2h-4v-2H6.5L12 6.5zM5.12 5l.81-1h12l.94 1H5.12z" fill="currentColor"/></svg> Desarquivar`
      : `<svg viewBox="0 0 24 24" fill="none" style="width:13px;height:13px"><path d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5L6.5 12H10v-2h4v2h3.5L12 17.5zM5.12 5l.81-1h12l.94 1H5.12z" fill="currentColor"/></svg> Arquivar`;

    btnArchive.onclick = () => {
      post.archived = !post.archived;
      saveAnnouncements();
      renderGrid();
      closeDetailModal();
      showToast(post.archived ? '📁 Nota arquivada.' : '📂 Nota restaurada.');
    };
  }
  // ──────────────────────────────────────────────────────────────────

  modalDetail.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeDetailModal() {
  modalDetail.classList.add('hidden');
  document.body.style.overflow = '';
  activeDetailId = null;
  
  if (window.speechSynthesis && window.speechSynthesis.speaking) {
    window.speechSynthesis.cancel();
    const btnReadAudio = document.getElementById('btn-read-audio');
    if (btnReadAudio) {
      btnReadAudio.style.background = 'rgba(10, 132, 255, 0.1)';
      btnReadAudio.style.color = '#0a84ff';
    }
  }
}

// Compose Modal Control
function openComposeModal() {
  composeForm.reset();
  modalOrganizerInput.value = '';
  isCategoryManuallySelected = false;
  modalCompose.classList.remove('hidden');
  document.body.style.overflow = 'hidden';
}

function closeComposeModal() {
  modalCompose.classList.add('hidden');
  document.body.style.overflow = '';
}

// Delete announcement
function deleteAnnouncement(id) {
  if (confirm('Tem certeza que deseja apagar este comunicado definitivamente?')) {
    announcements = announcements.filter(item => item.id !== id);
    saveAnnouncements();
    renderGrid();
    closeDetailModal();
    showToast('Comunicado excluído.');
  }
}

// Initial Wire-Up and Event Listeners
document.addEventListener('DOMContentLoaded', async () => {
  initAuth();
  initSettingsModal();
  
  // Try to load latest data from Supabase cloud database on startup
  await pullFromCloud();
  
  initAnnouncements();
  initTips();
  initChecklist();
  initGoals();
  initRecentCopies();
  initVoiceSearch();
  initBackupSystem();
  initScratchpad();
  initFuelCalculator();
  initWeeklyChart();
  initAlertsSystem();
  initRoadmap();
  renderFilterPills();
  renderGrid();

  // Poll cloud database for updates every 6 seconds to keep devices in sync
  setInterval(pullFromCloud, 6000);

  // Tips Carousel Logic (Dynamic)
  renderTipsCarousel();
  const btnPrev = document.getElementById('btn-prev-tip');
  const btnNext = document.getElementById('btn-next-tip');

  if (btnPrev && btnNext) {
    btnPrev.addEventListener('click', () => {
      currentTipIndex = (currentTipIndex - 1 + growthTips.length) % growthTips.length;
      renderTipsCarousel();
    });

    btnNext.addEventListener('click', () => {
      currentTipIndex = (currentTipIndex + 1) % growthTips.length;
      renderTipsCarousel();
    });

    // Auto rotate tips every 10 seconds
    setInterval(() => {
      if (growthTips.length > 0) {
        currentTipIndex = (currentTipIndex + 1) % growthTips.length;
        renderTipsCarousel();
      }
    }, 10000);
  }

  // Custom Dica Toggler & Save listener
  const btnToggleAddTip = document.getElementById('btn-toggle-add-tip');
  const addTipFormContainer = document.getElementById('add-tip-form-container');
  const btnSaveNewTip = document.getElementById('btn-save-new-tip');
  const btnCancelNewTip = document.getElementById('btn-cancel-new-tip');
  const newTipTag = document.getElementById('new-tip-tag');
  const newTipText = document.getElementById('new-tip-text');

  if (btnToggleAddTip && addTipFormContainer) {
    btnToggleAddTip.addEventListener('click', () => {
      addTipFormContainer.classList.toggle('hidden');
      if (!addTipFormContainer.classList.contains('hidden')) {
        newTipTag.value = '';
        newTipText.value = '';
        newTipTag.focus();
      }
    });
  }

  if (btnCancelNewTip && addTipFormContainer) {
    btnCancelNewTip.addEventListener('click', () => {
      addTipFormContainer.classList.add('hidden');
    });
  }

  if (btnSaveNewTip) {
    btnSaveNewTip.addEventListener('click', () => {
      const tag = newTipTag.value.trim();
      const text = newTipText.value.trim();
      if (!tag || !text) {
        alert('Por favor, preencha todos os campos da nova dica.');
        return;
      }

      growthTips.push({ tag, text });
      saveTips();
      addTipFormContainer.classList.add('hidden');
      
      currentTipIndex = growthTips.length - 1;
      renderTipsCarousel();
      showToast('Nova dica estratégica adicionada!');
    });
  }

  // Tab swapping logic
  const tabs = document.querySelectorAll('.growth-tab');
  const tabContents = document.querySelectorAll('.growth-tab-content');

  tabs.forEach(tab => {
    tab.addEventListener('click', () => {
      const targetTabId = tab.dataset.tab;
      
      tabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      tabContents.forEach(content => {
        if (content.id === targetTabId) {
          content.classList.add('active');
        } else {
          content.classList.remove('active');
        }
      });
    });
  });

  // Calculator setup
  const calcRideValue = document.getElementById('calc-ride-value');
  const calcFuelDist = document.getElementById('calc-fuel-dist');
  const calcFuelCons = document.getElementById('calc-fuel-cons');
  const calcFuelPrice = document.getElementById('calc-fuel-price');
  const btnCopyCalcProposal = document.getElementById('btn-copy-calc-proposal');
  
  if (calcRideValue) {
    calcRideValue.addEventListener('input', updateCalculator);
  }
  if (calcFuelDist) calcFuelDist.addEventListener('input', updateCalculator);
  if (calcFuelCons) calcFuelCons.addEventListener('input', updateCalculator);
  if (calcFuelPrice) calcFuelPrice.addEventListener('input', updateCalculator);
  
  updateCalculator(); // Initial calculation
  
  if (btnCopyCalcProposal) {
    btnCopyCalcProposal.addEventListener('click', () => {
      const rawVal = parseFloat(calcRideValue.value) || 0;
      const otherEarning = rawVal * 0.70;
      const diff = rawVal * 0.30;
      
      const proposalText = `Olha só parceiro! Rodando na Uppi, uma corrida de R$ ${rawVal.toFixed(2).replace('.', ',')} te deixa R$ ${rawVal.toFixed(2).replace('.', ',')} integral no bolso. No outro app, você só fica com R$ ${otherEarning.toFixed(2).replace('.', ',')} e perde R$ ${diff.toFixed(2).replace('.', ',')} de taxa! Bora valorizar seu trabalho e se cadastrar na Uppi? 🚀`;
      
      copyTextToClipboard(proposalText, btnCopyCalcProposal);
    });
  }

  // Neighborhood Strategies setup
  const selectNeighborhood = document.getElementById('select-neighborhood');
  const neighborhoodAdvice = document.getElementById('neighborhood-advice');

  function updateNeighborhoodAdvice() {
    if (!selectNeighborhood || !neighborhoodAdvice) return;
    const selected = selectNeighborhood.value;
    const advice = NEIGHBORHOOD_STRATEGIES[selected] || "Selecione um bairro para ver a estratégia.";
    neighborhoodAdvice.innerHTML = `<p class="neighborhood-advice-text">${escapeHtml(advice)}</p>`;
  }

  if (selectNeighborhood) {
    selectNeighborhood.addEventListener('change', updateNeighborhoodAdvice);
    updateNeighborhoodAdvice(); // Initial advice
  }

  // Checklist setup
  renderChecklist();

  // Search Input listener
  searchInput.addEventListener('input', (e) => {
    searchQuery = e.target.value;
    renderGrid();
  });

  // Home Screen Quick Paste Area Submit
  btnQuickPaste.addEventListener('click', () => {
    const rawText = quickPasteInput.value.trim();
    if (!rawText) return;

    const parsedCards = splitAndParseText(rawText);
    
    if (parsedCards.length > 0) {
      let addedCount = 0;
      let duplicateCount = 0;

      // Add each card to the beginning of the list (reverse order because unshift pushes to start)
      parsedCards.reverse().forEach((card, index) => {
        // Prevent duplicate content or title
        const isDuplicate = announcements.some(item => 
          item.content.trim() === card.content.trim() || 
          item.title.trim() === card.title.trim()
        );

        if (isDuplicate) {
          duplicateCount++;
          return;
        }

        const newPost = {
          id: String(Date.now() + index),
          title: card.title,
          content: card.content,
          copyContent: card.copyContent || card.content,
          category: card.category,
          categoryLabel: card.categoryLabel,
          author: 'Equipe Uppi',
          date: new Date().toISOString()
        };
        announcements.unshift(newPost);
        addedCount++;
      });

      if (addedCount > 0) {
        saveAnnouncements();
        renderFilterPills();
        renderGrid();
      }
      
      quickPasteInput.value = '';
      
      if (addedCount > 0) {
        if (addedCount > 1) {
          showToast(`${addedCount} novos modelos organizados! ${duplicateCount > 0 ? `(${duplicateCount} duplicados ignorados)` : ''}`);
        } else {
          showToast(`Modelo adicionado e organizado! ${duplicateCount > 0 ? `(Duplicado ignorado)` : ''}`);
        }
      } else if (duplicateCount > 0) {
        showToast('Mensagem repetida já existe e foi ignorada!');
      }
    }
  });

  // Compose Modal Toggle Buttons
  btnOpenCompose.addEventListener('click', openComposeModal);
  btnCloseCompose.addEventListener('click', closeComposeModal);
  btnCancelCompose.addEventListener('click', closeComposeModal);

  // Listen to changes on category radio buttons to toggle custom category name input visibility
  const categoryRadios = composeForm.querySelectorAll('input[name="category"]');
  const customCategoryGroup = document.getElementById('custom-category-group');
  
  categoryRadios.forEach(radio => {
    radio.addEventListener('change', (e) => {
      if (e.isTrusted) {
        isCategoryManuallySelected = true;
      }
      if (radio.value === 'custom') {
        customCategoryGroup.classList.remove('hidden');
        document.getElementById('form-custom-category').focus();
      } else {
        customCategoryGroup.classList.add('hidden');
      }
    });
  });

  const titleInput = document.getElementById('form-title');
  const contentInput = document.getElementById('form-content');

  function autoDetectCategory() {
    if (isCategoryManuallySelected) return;

    const titleText = titleInput.value.trim();
    const contentText = contentInput.value.trim();
    const combined = (titleText + '\n' + contentText).trim();

    if (!combined) return;

    const detectedCat = determineCategory(combined);

    // Update check status of the radio buttons
    const isDefault = DEFAULT_CATEGORY_KEYS[detectedCat];
    if (isDefault) {
      const targetRadio = composeForm.querySelector(`input[name="category"][value="${detectedCat}"]`);
      if (targetRadio) {
        targetRadio.checked = true;
      }
      customCategoryGroup.classList.add('hidden');
    } else {
      const targetRadio = composeForm.querySelector('input[name="category"][value="custom"]');
      if (targetRadio) {
        targetRadio.checked = true;
      }
      customCategoryGroup.classList.remove('hidden');
      const catRegistryData = CATEGORY_REGISTRY[detectedCat];
      document.getElementById('form-custom-category').value = catRegistryData ? catRegistryData.label.replace(/^([^\w\s\d]+\s*)/, '') : detectedCat;
    }
  }

  titleInput.addEventListener('input', autoDetectCategory);
  contentInput.addEventListener('input', autoDetectCategory);

  // Form Submit (Manual Create / Publish)
  composeForm.addEventListener('submit', (e) => {
    e.preventDefault();

    const categoryInput = composeForm.querySelector('input[name="category"]:checked');
    const titleVal = document.getElementById('form-title').value.trim();
    const authorVal = document.getElementById('form-author').value.trim();
    const contentVal = document.getElementById('form-content').value.trim();

    if (!titleVal || !authorVal || !contentVal) {
      alert('Por favor, preencha todos os campos obrigatórios.');
      return;
    }

    let categoryValue = categoryInput ? categoryInput.value : 'comunicado';
    let categoryLabelVal = 'Comunicado';

    if (categoryValue === 'custom') {
      const customCatName = document.getElementById('form-custom-category').value.trim();
      if (!customCatName) {
        alert('Por favor, insira o nome da categoria personalizada.');
        return;
      }
      categoryValue = registerCategory(customCatName);
      const catRegistryData = CATEGORY_REGISTRY[categoryValue];
      categoryLabelVal = catRegistryData ? catRegistryData.label.replace(/^([^\w\s\d]+\s*)/, '') : customCatName;
    } else {
      const catRegistryData = CATEGORY_REGISTRY[categoryValue];
      categoryLabelVal = catRegistryData ? catRegistryData.label.replace(/^([^\w\s\d]+\s*)/, '') : 'Comunicado';
    }

    const newPost = {
      id: String(Date.now()),
      title: titleVal,
      content: contentVal,
      category: categoryValue,
      categoryLabel: categoryLabelVal,
      author: authorVal,
      date: new Date().toISOString()
    };

    announcements.unshift(newPost);
    saveAnnouncements();
    renderFilterPills();
    renderGrid();
    closeComposeModal();
    showToast('Comunicado publicado!');
  });

  // Modal intelligent paste autofill
  modalOrganizerInput.addEventListener('input', (e) => {
    const rawText = e.target.value;
    if (!rawText.trim()) return;

    const parsed = parseBlock(rawText);
    if (!parsed) return;

    // Update compose form elements
    document.getElementById('form-title').value = parsed.title;
    document.getElementById('form-author').value = 'Equipe Uppi';
    document.getElementById('form-content').value = parsed.content;

    // Check correct radio button category
    const isDefaultCategory = DEFAULT_CATEGORY_KEYS[parsed.category];
    if (isDefaultCategory) {
      const targetRadio = composeForm.querySelector(`input[name="category"][value="${parsed.category}"]`);
      if (targetRadio) {
        targetRadio.checked = true;
      }
      customCategoryGroup.classList.add('hidden');
    } else {
      const targetRadio = composeForm.querySelector(`input[name="category"][value="custom"]`);
      if (targetRadio) {
        targetRadio.checked = true;
      }
      customCategoryGroup.classList.remove('hidden');
      document.getElementById('form-custom-category').value = parsed.categoryLabel;
    }
  });

  // Detail Modal Actions
  btnCloseDetail.addEventListener('click', closeDetailModal);

  btnDeleteDetail.addEventListener('click', () => {
    if (activeDetailId) {
      deleteAnnouncement(activeDetailId);
    }
  });

  // Close modals clicking outside card
  window.addEventListener('click', (e) => {
    if (e.target === modalCompose) {
      closeComposeModal();
    }
    if (e.target === modalDetail) {
      closeDetailModal();
    }
  });

  // Register PWA Service Worker
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then(reg => console.log('Service Worker registrado com sucesso!', reg))
      .catch(err => console.error('Erro ao registrar Service Worker:', err));
  }
});

// --------------------------------------------------------------------------
// Premium Features Helper Functions
// --------------------------------------------------------------------------

// Daily Goals Tracker Functions
function initGoals() {
  dailyGoal = parseFloat(localStorage.getItem('uppi_daily_goal') || '200');
  dailyEarnings = parseFloat(localStorage.getItem('uppi_daily_earnings') || '0');
  dailyExpenses = parseFloat(localStorage.getItem('uppi_daily_expenses') || '0');
  totalRides = parseInt(localStorage.getItem('uppi_total_rides') || '0');
  expensesList = JSON.parse(localStorage.getItem('uppi_expenses_list') || '[]');
  
  updateGoalsUI();
  renderExpensesList();
  
  const btnAddEarning = document.getElementById('btn-add-earning');
  const inputAddEarning = document.getElementById('input-add-earning');
  const inputDailyGoal = document.getElementById('input-daily-goal');
  const btnResetGoals = document.getElementById('btn-reset-goals');
  
  const btnAddExpense = document.getElementById('btn-add-expense');
  const inputExpenseDesc = document.getElementById('input-expense-desc');
  const inputExpenseVal = document.getElementById('input-expense-val');
  
  if (btnAddEarning && inputAddEarning) {
    btnAddEarning.onclick = () => {
      const val = parseFloat(inputAddEarning.value);
      if (val > 0) {
        dailyEarnings += val;
        totalRides++;
        localStorage.setItem('uppi_daily_earnings', String(dailyEarnings));
        localStorage.setItem('uppi_total_rides', String(totalRides));
        
        // Add to weekly chart
        addToWeeklyEarnings(val);
        
        inputAddEarning.value = '';
        updateGoalsUI();
        updateWeeklyChart();
        showToast('Ganho registrado! 🚀');
      } else {
        alert('Por favor, insira um valor válido de corrida.');
      }
    };
  }
  
  if (inputDailyGoal) {
    inputDailyGoal.value = dailyGoal;
    inputDailyGoal.onchange = () => {
      const val = parseFloat(inputDailyGoal.value);
      if (val > 0) {
        dailyGoal = val;
        localStorage.setItem('uppi_daily_goal', String(dailyGoal));
        updateGoalsUI();
        showToast('Meta diária atualizada!');
      }
    };
  }
  
  if (btnResetGoals) {
    btnResetGoals.onclick = () => {
      if (confirm('Tem certeza que deseja zerar os ganhos e despesas de hoje?')) {
        dailyEarnings = 0;
        dailyExpenses = 0;
        totalRides = 0;
        expensesList = [];
        localStorage.setItem('uppi_daily_earnings', '0');
        localStorage.setItem('uppi_daily_expenses', '0');
        localStorage.setItem('uppi_total_rides', '0');
        localStorage.setItem('uppi_expenses_list', '[]');
        updateGoalsUI();
        renderExpensesList();
        showToast('Ganhos e despesas zerados.');
      }
    };
  }

  if (btnAddExpense && inputExpenseDesc && inputExpenseVal) {
    btnAddExpense.onclick = () => {
      const desc = inputExpenseDesc.value.trim();
      const val = parseFloat(inputExpenseVal.value);
      if (desc && val > 0) {
        const newExpense = {
          id: String(Date.now()),
          desc: desc,
          val: val
        };
        expensesList.push(newExpense);
        dailyExpenses += val;
        
        localStorage.setItem('uppi_expenses_list', JSON.stringify(expensesList));
        localStorage.setItem('uppi_daily_expenses', String(dailyExpenses));
        
        inputExpenseDesc.value = '';
        inputExpenseVal.value = '';
        
        updateGoalsUI();
        renderExpensesList();
        showToast('Despesa registrada! 💸');
      } else {
        alert('Por favor, preencha a descrição e um valor de despesa válido.');
      }
    };
  }
}

function renderExpensesList() {
  const container = document.getElementById('expenses-list-container');
  if (!container) return;
  
  if (expensesList.length === 0) {
    container.innerHTML = '<li style="color: var(--text-secondary); font-size: 10px; text-align: center; margin-top: 4px;">Nenhuma despesa registrada hoje.</li>';
    return;
  }
  
  container.innerHTML = '';
  expensesList.forEach(expense => {
    const li = document.createElement('li');
    li.className = 'expense-item';
    li.innerHTML = `
      <span class="expense-item-desc">${escapeHtml(expense.desc)}</span>
      <div style="display: flex; align-items: center; gap: 8px;">
        <span class="expense-item-val">R$ ${expense.val.toFixed(2).replace('.', ',')}</span>
        <button class="btn-delete-expense" data-id="${expense.id}" style="background: none; border: none; color: var(--text-secondary); cursor: pointer;" title="Excluir despesa">✕</button>
      </div>
    `;
    
    li.querySelector('button').onclick = (e) => {
      e.stopPropagation();
      expensesList = expensesList.filter(item => item.id !== expense.id);
      dailyExpenses = expensesList.reduce((sum, item) => sum + item.val, 0);
      
      localStorage.setItem('uppi_expenses_list', JSON.stringify(expensesList));
      localStorage.setItem('uppi_daily_expenses', String(dailyExpenses));
      
      updateGoalsUI();
      renderExpensesList();
      showToast('Despesa removida.');
    };
    
    container.appendChild(li);
  });
}

function updateGoalsUI() {
  const goalsRingFill = document.getElementById('goals-ring-fill');
  const goalsRingPercent = document.getElementById('goals-ring-percent');
  const goalsTodayValue = document.getElementById('goals-today-value');
  const goalsExpensesValue = document.getElementById('goals-expenses-value');
  const goalsNetValue = document.getElementById('goals-net-value');
  
  if (!goalsTodayValue) return;
  
  goalsTodayValue.textContent = `R$ ${dailyEarnings.toFixed(2).replace('.', ',')}`;
  if (goalsExpensesValue) {
    goalsExpensesValue.textContent = `R$ ${dailyExpenses.toFixed(2).replace('.', ',')}`;
  }
  
  const net = dailyEarnings - dailyExpenses;
  if (goalsNetValue) {
    goalsNetValue.textContent = `R$ ${net.toFixed(2).replace('.', ',')}`;
    if (net < 0) {
      goalsNetValue.style.color = 'var(--accent-red)';
    } else if (net > 0) {
      goalsNetValue.style.color = 'var(--accent-green)';
    } else {
      goalsNetValue.style.color = '#ffffff';
    }
  }
  
  const percent = dailyGoal > 0 ? Math.min(100, Math.round((dailyEarnings / dailyGoal) * 100)) : 0;
  if (goalsRingPercent) {
    goalsRingPercent.textContent = `${percent}%`;
  }
  
  if (goalsRingFill) {
    const circumference = 251.2; // 2 * Math.PI * r (r=40)
    const offset = circumference - (percent / 100) * circumference;
    goalsRingFill.style.strokeDashoffset = offset;
  }
}

// Recent Copies History Functions
function initRecentCopies() {
  recentCopies = JSON.parse(localStorage.getItem('uppi_recent_copies') || '[]');
  renderRecentCopies();
}

function addToRecentCopies(post) {
  recentCopies = recentCopies.filter(item => item.id !== post.id);
  recentCopies.unshift({
    id: post.id,
    title: post.title,
    time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })
  });
  
  if (recentCopies.length > 5) {
    recentCopies.pop();
  }
  
  localStorage.setItem('uppi_recent_copies', JSON.stringify(recentCopies));
  renderRecentCopies();
}

function renderRecentCopies() {
  if (!recentCopiesList) return;
  
  if (recentCopies.length === 0) {
    recentCopiesList.innerHTML = '<li class="recent-copy-empty">Nenhuma cópia recente.</li>';
    return;
  }
  
  recentCopiesList.innerHTML = '';
  recentCopies.forEach(item => {
    const li = document.createElement('li');
    li.className = 'recent-copy-item';
    li.innerHTML = `
      <span class="recent-copy-title">${escapeHtml(item.title)}</span>
      <span class="recent-copy-time">${item.time}</span>
    `;
    
    li.onclick = () => {
      const post = announcements.find(p => p.id === item.id);
      if (post) {
        openDetailModal(post);
      } else {
        showToast('Modelo original não encontrado.');
      }
    };
    
    recentCopiesList.appendChild(li);
  });
}

// Voice Search Recognition Functions
function initVoiceSearch() {
  if (!btnVoiceSearch || !searchInput) return;
  
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    btnVoiceSearch.style.display = 'none';
    return;
  }
  
  const recognition = new SpeechRecognition();
  recognition.lang = 'pt-BR';
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;
  
  let isRecording = false;
  
  btnVoiceSearch.onclick = (e) => {
    e.preventDefault();
    if (isRecording) {
      recognition.stop();
    } else {
      recognition.start();
    }
  };
  
  recognition.onstart = () => {
    isRecording = true;
    btnVoiceSearch.classList.add('recording');
    searchInput.placeholder = "Ouvindo...";
  };
  
  recognition.onend = () => {
    isRecording = false;
    btnVoiceSearch.classList.remove('recording');
    searchInput.placeholder = "Pesquisar notícias ou mensagens...";
  };
  
  recognition.onresult = (event) => {
    const spokenText = event.results[0][0].transcript;
    searchInput.value = spokenText;
    searchQuery = spokenText;
    renderGrid();
  };
  
  recognition.onerror = (event) => {
    console.error('Erro no reconhecimento de voz:', event.error);
    showToast('Erro ao escutar. Tente novamente.');
  };
}

// Export/Import JSON Backup System
function initBackupSystem() {
  const btnExp = btnExportBackup || document.getElementById('btn-export-backup');
  const btnImp = btnImportBackup || document.getElementById('btn-import-backup');
  const fileImp = importBackupFile || document.getElementById('import-backup-file');
  
  if (btnExp) {
    btnExp.onclick = () => {
      const backupData = {
        announcements: JSON.parse(localStorage.getItem('uppi_announcements') || '[]'),
        categoryRegistry: JSON.parse(localStorage.getItem('uppi_category_registry') || '{}'),
        checklist: JSON.parse(localStorage.getItem('uppi_checklist') || '[]'),
        growthTips: JSON.parse(localStorage.getItem('uppi_growth_tips') || '[]'),
        dailyGoal: localStorage.getItem('uppi_daily_goal') || '200',
        dailyEarnings: localStorage.getItem('uppi_daily_earnings') || '0',
        dailyExpenses: localStorage.getItem('uppi_daily_expenses') || '0',
        expensesList: JSON.parse(localStorage.getItem('uppi_expenses_list') || '[]'),
        totalRides: localStorage.getItem('uppi_total_rides') || '0',
        weeklyEarnings: JSON.parse(localStorage.getItem('uppi_weekly_earnings') || '{}'),
        activeAlerts: JSON.parse(localStorage.getItem('uppi_active_alerts') || '[]'),
        scratchpad: localStorage.getItem('uppi_scratchpad') || ''
      };
      
      const cardChecklists = {};
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && key.startsWith('uppi_card_checklist_')) {
          cardChecklists[key] = localStorage.getItem(key);
        }
      }
      backupData.cardChecklists = cardChecklists;
      
      const jsonStr = JSON.stringify(backupData, null, 2);
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = url;
      a.download = `uppi-notas-backup-${new Date().toISOString().split('T')[0]}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      showToast('Backup exportado com sucesso! 💾');
    };
  }
  
  if (btnImp && fileImp) {
    btnImp.onclick = () => fileImp.click();
    fileImp.onchange = (e) => {
      const file = e.target.files[0];
      if (!file) return;
      
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const imported = JSON.parse(event.target.result);
          
          if (confirm('Importar este backup irá mesclar com seus dados atuais. Deseja continuar?')) {
            if (Array.isArray(imported.announcements)) {
              const currentAnnouncements = JSON.parse(localStorage.getItem('uppi_announcements') || '[]');
              const currentIds = new Set(currentAnnouncements.map(item => item.id));
              
              imported.announcements.forEach(item => {
                if (!currentIds.has(item.id)) {
                  currentAnnouncements.push(item);
                }
              });
              localStorage.setItem('uppi_announcements', JSON.stringify(currentAnnouncements));
            }
            
            if (imported.categoryRegistry) {
              const currentRegistry = JSON.parse(localStorage.getItem('uppi_category_registry') || '{}');
              Object.assign(currentRegistry, imported.categoryRegistry);
              localStorage.setItem('uppi_category_registry', JSON.stringify(currentRegistry));
            }
            
            if (Array.isArray(imported.checklist)) {
              const currentChecklist = JSON.parse(localStorage.getItem('uppi_checklist') || '[]');
              const currentTexts = new Set(currentChecklist.map(item => item.text));
              
              imported.checklist.forEach(item => {
                if (!currentTexts.has(item.text)) {
                  currentChecklist.push(item);
                }
              });
              localStorage.setItem('uppi_checklist', JSON.stringify(currentChecklist));
            }
            
            if (Array.isArray(imported.growthTips)) {
              const currentTips = JSON.parse(localStorage.getItem('uppi_growth_tips') || '[]');
              const currentTexts = new Set(currentTips.map(item => item.text));
              
              imported.growthTips.forEach(item => {
                if (!currentTexts.has(item.text)) {
                  currentTips.push(item);
                }
              });
              localStorage.setItem('uppi_growth_tips', JSON.stringify(currentTips));
            }
            
            if (imported.cardChecklists) {
              Object.keys(imported.cardChecklists).forEach(key => {
                localStorage.setItem(key, imported.cardChecklists[key]);
              });
            }
            
            if (imported.dailyGoal) localStorage.setItem('uppi_daily_goal', imported.dailyGoal);
            if (imported.dailyEarnings) localStorage.setItem('uppi_daily_earnings', imported.dailyEarnings);
            if (imported.dailyExpenses) localStorage.setItem('uppi_daily_expenses', imported.dailyExpenses);
            if (imported.expensesList) localStorage.setItem('uppi_expenses_list', JSON.stringify(imported.expensesList));
            if (imported.totalRides) localStorage.setItem('uppi_total_rides', imported.totalRides);
            if (imported.weeklyEarnings) localStorage.setItem('uppi_weekly_earnings', JSON.stringify(imported.weeklyEarnings));
            if (imported.activeAlerts) localStorage.setItem('uppi_active_alerts', JSON.stringify(imported.activeAlerts));
            if (imported.scratchpad !== undefined) localStorage.setItem('uppi_scratchpad', imported.scratchpad);
            
            showToast('Importado com sucesso! Recarregando...');
            setTimeout(() => {
              window.location.reload();
            }, 1500);
          }
        } catch (err) {
          console.error(err);
          alert('Erro ao importar backup. Verifique se o arquivo JSON está no formato correto.');
        }
      };
      reader.readAsText(file);
      fileImp.value = '';
    };
  }
}

// Scratchpad Helper Functions
function initScratchpad() {
  const scratchpad = document.getElementById('sidebar-scratchpad');
  const btnClear = document.getElementById('btn-clear-scratchpad');
  const btnCopy = document.getElementById('btn-copy-scratchpad');
  
  if (!scratchpad) return;
  
  // Load saved text
  scratchpad.value = localStorage.getItem('uppi_scratchpad') || '';
  
  // Auto-save on type
  scratchpad.addEventListener('input', () => {
    localStorage.setItem('uppi_scratchpad', scratchpad.value);
  });
  
  if (btnClear) {
    btnClear.onclick = () => {
      scratchpad.value = '';
      localStorage.setItem('uppi_scratchpad', '');
      showToast('Rascunho limpo.');
    };
  }
  
  if (btnCopy) {
    btnCopy.onclick = () => {
      const text = scratchpad.value.trim();
      if (!text) {
        showToast('Rascunho vazio!');
        return;
      }
      copyTextToClipboard(text, btnCopy);
    };
  }
}

// Fuel Calculator Helper Functions
function initFuelCalculator() {
  const calcRideValue = document.getElementById('calc-ride-value');
  const calcFuelDist = document.getElementById('calc-fuel-dist');
  const calcFuelCons = document.getElementById('calc-fuel-cons');
  const calcFuelPrice = document.getElementById('calc-fuel-price');
  
  // Load saved config
  if (calcFuelCons) calcFuelCons.value = localStorage.getItem('uppi_calc_fuel_cons') || '10';
  if (calcFuelPrice) calcFuelPrice.value = localStorage.getItem('uppi_calc_fuel_price') || '5.50';
  
  const saveFuelConfig = () => {
    if (calcFuelCons) localStorage.setItem('uppi_calc_fuel_cons', calcFuelCons.value);
    if (calcFuelPrice) localStorage.setItem('uppi_calc_fuel_price', calcFuelPrice.value);
    updateCalculator();
  };
  
  if (calcFuelCons) calcFuelCons.addEventListener('change', saveFuelConfig);
  if (calcFuelPrice) calcFuelPrice.addEventListener('change', saveFuelConfig);
}

// Weekly Earnings Chart Helper Functions
function initWeeklyChart() {
  const stored = localStorage.getItem('uppi_weekly_earnings');
  if (stored) {
    try {
      weeklyEarnings = JSON.parse(stored);
    } catch (e) {
      console.error('Error loading weekly earnings:', e);
    }
  }
  updateWeeklyChart();
}

function addToWeeklyEarnings(val) {
  const daysMap = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const currentDayName = daysMap[new Date().getDay()];
  
  weeklyEarnings[currentDayName] = (weeklyEarnings[currentDayName] || 0) + val;
  localStorage.setItem('uppi_weekly_earnings', JSON.stringify(weeklyEarnings));
}

function updateWeeklyChart() {
  const chartContainer = document.getElementById('weekly-chart');
  const weeklyTotalVal = document.getElementById('weekly-total-value');
  if (!chartContainer) return;
  
  const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom'];
  const daysMap = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];
  const currentDayName = daysMap[new Date().getDay()];
  
  let maxEarning = 10; // Prevent division by zero
  let totalWeek = 0;
  
  days.forEach(day => {
    const val = weeklyEarnings[day] || 0;
    totalWeek += val;
    if (val > maxEarning) maxEarning = val;
  });
  
  if (weeklyTotalVal) {
    weeklyTotalVal.textContent = `R$ ${totalWeek.toFixed(2).replace('.', ',')}`;
  }
  
  chartContainer.innerHTML = '';
  days.forEach(day => {
    const val = weeklyEarnings[day] || 0;
    const heightPercent = Math.min(100, Math.max(5, (val / maxEarning) * 100)); // Minimum 5% height to be visible
    const isCurrent = day === currentDayName;
    
    const barContainer = document.createElement('div');
    barContainer.className = 'chart-bar-container';
    barContainer.innerHTML = `
      <div class="chart-bar ${isCurrent ? 'current-day' : ''}" style="height: ${heightPercent}%">
        <div class="chart-value-tooltip">R$ ${val.toFixed(0)}</div>
      </div>
      <span class="chart-label">${day}</span>
    `;
    chartContainer.appendChild(barContainer);
  });
}

// Alerts System Helper Functions
const DEFAULT_ALERTS = [
  { id: 'a1', type: '🚨 Blitz', text: 'Blitz ativa na rotatória do Apeú.', time: new Date(Date.now() - 10 * 60 * 1000).toISOString() },
  { id: 'a2', type: '⚠️ Trânsito', text: 'Alagamento na Alameda Barão do Rio Branco.', time: new Date(Date.now() - 15 * 60 * 1000).toISOString() },
  { id: 'a3', type: '💡 Demanda', text: 'Alta demanda de passageiros na Praça do Estrela.', time: new Date(Date.now() - 2 * 60 * 1000).toISOString() }
];

function initAlertsSystem() {
  const stored = localStorage.getItem('uppi_active_alerts');
  if (stored) {
    try {
      activeAlerts = JSON.parse(stored);
    } catch (e) {
      console.error(e);
      activeAlerts = [...DEFAULT_ALERTS];
    }
  } else {
    activeAlerts = [...DEFAULT_ALERTS];
    saveAlerts();
  }
  
  renderAlerts();
  
  // Wire up alert create form toggling
  const btnToggleForm = document.getElementById('btn-toggle-add-alert');
  const formContainer = document.getElementById('add-alert-form-container');
  const btnSave = document.getElementById('btn-save-new-alert');
  const selectType = document.getElementById('new-alert-type');
  const inputText = document.getElementById('new-alert-text');
  
  if (btnToggleForm && formContainer) {
    btnToggleForm.onclick = () => {
      formContainer.classList.toggle('hidden');
      if (!formContainer.classList.contains('hidden') && inputText) {
        inputText.value = '';
        inputText.focus();
      }
    };
  }
  
  if (btnSave && selectType && inputText) {
    btnSave.onclick = () => {
      const type = selectType.value;
      const text = inputText.value.trim();
      if (!text) {
        alert('Por favor, descreva o alerta.');
        return;
      }
      
      const newAlert = {
        id: String(Date.now()),
        type: type,
        text: text,
        time: new Date().toISOString()
      };
      
      activeAlerts.unshift(newAlert);
      saveAlerts();
      renderAlerts();
      
      formContainer.classList.add('hidden');
      inputText.value = '';
      showToast('Alerta enviado com sucesso! 📡');
    };
  }
}

function saveAlerts() {
  localStorage.setItem('uppi_active_alerts', JSON.stringify(activeAlerts));
}

function renderAlerts() {
  const container = document.getElementById('alerts-list');
  const banner = document.getElementById('alerts-banner-container');
  if (!container) return;
  
  // Auto-remove alerts older than 12 hours
  const twelveHoursAgo = Date.now() - 12 * 60 * 60 * 1000;
  activeAlerts = activeAlerts.filter(a => new Date(a.time).getTime() > twelveHoursAgo);
  saveAlerts();
  
  if (activeAlerts.length === 0) {
    if (banner) banner.style.display = 'none';
    return;
  }
  
  if (banner) banner.style.display = 'flex';
  
  container.innerHTML = '';
  activeAlerts.forEach(alertItem => {
    const elapsedMinutes = Math.max(0, Math.round((Date.now() - new Date(alertItem.time).getTime()) / (60 * 1000)));
    let timeText = '';
    if (elapsedMinutes < 1) {
      timeText = 'agora mesmo';
    } else if (elapsedMinutes < 60) {
      timeText = `${elapsedMinutes}m atrás`;
    } else {
      timeText = `${Math.round(elapsedMinutes / 60)}h atrás`;
    }
    
    const div = document.createElement('div');
    div.className = 'alert-item';
    div.innerHTML = `
      <div class="alert-item-content">
        <strong style="color: var(--accent-red); font-family: var(--font-title); font-size: 11px;">${escapeHtml(alertItem.type)}</strong>
        <span>${escapeHtml(alertItem.text)}</span>
        <span class="alert-item-time">(${timeText})</span>
      </div>
      <button class="alert-item-dismiss" title="Dispensar">✕</button>
    `;
    
    const dismissBtn = div.querySelector('.alert-item-dismiss');
    dismissBtn.onclick = () => {
      activeAlerts = activeAlerts.filter(a => a.id !== alertItem.id);
      saveAlerts();
      renderAlerts();
    };
    
    container.appendChild(div);
  });
}

// --------------------------------------------------------------------------
// Phase 3: Premium Authentication, Settings & Audio Reader Functions
// --------------------------------------------------------------------------

function initAuth() {
  const modalLogin = document.getElementById('modal-login');
  const loginForm = document.getElementById('login-form');
  const loginEmail = document.getElementById('login-email');
  const loginPassword = document.getElementById('login-password');
  const loginErrorMsg = document.getElementById('login-error-msg');
  
  function checkAuth() {
    if (localStorage.getItem('uppi_auth_session') === 'true') {
      modalLogin.classList.add('hidden');
    } else {
      modalLogin.classList.remove('hidden');
    }
  }

  // Check login status immediately
  checkAuth();

  if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const email = loginEmail.value.trim().toLowerCase();
      const password = loginPassword.value.trim();
      if (email === 'admin@uppi.com.br' && password === 'uppi') {
        localStorage.setItem('uppi_auth_session', 'true');
        loginErrorMsg.classList.add('hidden');
        modalLogin.classList.add('hidden');
        showToast('Acesso concedido! 🔑');
      } else {
        loginErrorMsg.classList.remove('hidden');
      }
    });
  }

  const btnLogout = document.getElementById('btn-logout');
  if (btnLogout) {
    btnLogout.addEventListener('click', () => {
      if (confirm('Deseja encerrar a sessão administrativa?')) {
        localStorage.removeItem('uppi_auth_session');
        checkAuth();
        const modalSettings = document.getElementById('modal-settings');
        if (modalSettings) {
          modalSettings.classList.add('hidden');
          document.body.style.overflow = '';
        }
        showToast('Sessão encerrada.');
      }
    });
  }
}

function initSettingsModal() {
  const btnOpenSettings = document.getElementById('btn-open-settings');
  const btnCloseSettings = document.getElementById('btn-close-settings');
  const modalSettings = document.getElementById('modal-settings');

  if (btnOpenSettings && modalSettings) {
    btnOpenSettings.onclick = () => {
      modalSettings.classList.remove('hidden');
      document.body.style.overflow = 'hidden';
    };
  }

  if (btnCloseSettings && modalSettings) {
    btnCloseSettings.onclick = () => {
      modalSettings.classList.add('hidden');
      document.body.style.overflow = '';
    };
  }

  window.addEventListener('click', (e) => {
    if (e.target === modalSettings) {
      modalSettings.classList.add('hidden');
      document.body.style.overflow = '';
    }
  });

  // Theme controls
  const themeBtns = document.querySelectorAll('.theme-btn');
  const currentTheme = localStorage.getItem('uppi_theme_color') || 'green';

  function applyTheme(theme) {
    document.body.classList.remove('theme-green', 'theme-blue', 'theme-amber', 'theme-red');
    document.body.classList.add(`theme-${theme}`);
    localStorage.setItem('uppi_theme_color', theme);
    themeBtns.forEach(btn => {
      if (btn.dataset.theme === theme) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });
  }

  applyTheme(currentTheme);

  themeBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      applyTheme(btn.dataset.theme);
      showToast(`Tema ${btn.textContent} ativado!`);
    });
  });

  // OLED battery saver control
  const toggleOledMode = document.getElementById('toggle-oled-mode');
  const isOledActive = localStorage.getItem('uppi_oled_mode') === 'true';

  function applyOledMode(active) {
    if (active) {
      document.body.classList.add('oled-mode');
    } else {
      document.body.classList.remove('oled-mode');
    }
    localStorage.setItem('uppi_oled_mode', active ? 'true' : 'false');
    if (toggleOledMode) {
      toggleOledMode.checked = active;
    }
  }

  applyOledMode(isOledActive);

  if (toggleOledMode) {
    toggleOledMode.addEventListener('change', (e) => {
      applyOledMode(e.target.checked);
      showToast(e.target.checked ? 'Modo OLED Ativado! 🔋' : 'Modo OLED Desativado.');
    });
  }
  
  // Audio TTS Button
  const btnReadAudio = document.getElementById('btn-read-audio');
  const detailContent = document.getElementById('detail-content');
  let synth = window.speechSynthesis;
  let currentUtterance = null;

  if (btnReadAudio && detailContent) {
    btnReadAudio.addEventListener('click', () => {
      if (!synth) {
        showToast('Leitura de voz não suportada neste navegador.');
        return;
      }
      if (synth.speaking) {
        synth.cancel();
        btnReadAudio.style.background = 'rgba(10, 132, 255, 0.1)';
        btnReadAudio.style.color = '#0a84ff';
        showToast('Áudio cancelado.');
        return;
      }

      const textToRead = detailContent.textContent;
      if (!textToRead.trim()) return;

      currentUtterance = new SpeechSynthesisUtterance(textToRead);
      currentUtterance.lang = 'pt-BR';

      currentUtterance.onstart = () => {
        btnReadAudio.style.background = 'var(--accent-red-bg)';
        btnReadAudio.style.color = 'var(--accent-red)';
        showToast('Lendo mensagem... 🗣️');
      };

      currentUtterance.onend = () => {
        btnReadAudio.style.background = 'rgba(10, 132, 255, 0.1)';
        btnReadAudio.style.color = '#0a84ff';
      };

      currentUtterance.onerror = () => {
        btnReadAudio.style.background = 'rgba(10, 132, 255, 0.1)';
        btnReadAudio.style.color = '#0a84ff';
      };

      synth.speak(currentUtterance);
    });
  }
}

// --------------------------------------------------------------------------
// Roadmap Functions (Launch Planning & Tracking)
// --------------------------------------------------------------------------

const DEFAULT_ROADMAP = [
  { id: 'rm-1', phase: 'Fase 1: Preparação', text: 'Cadastrar os primeiros 50 motoristas fundadores', completed: true },
  { id: 'rm-2', phase: 'Fase 1: Preparação', text: 'Campanha de adesivagem nos carros em Castanhal', completed: true },
  { id: 'rm-3', phase: 'Fase 2: Lançamento', text: 'Publicar o aplicativo de passageiros na Google Play', completed: false },
  { id: 'rm-4', phase: 'Fase 2: Lançamento', text: 'Parceria de cupom de desconto com bares da Praça do Estrela', completed: false },
  { id: 'rm-5', phase: 'Fase 3: Consolidação', text: 'Lançamento do aplicativo nativo de iOS (App Store)', completed: false },
  { id: 'rm-6', phase: 'Fase 3: Consolidação', text: 'Expansão da marca Uppi para a cidade de Apeú e distritos', completed: false }
];

let roadmapItems = [];

function initRoadmap() {
  const stored = localStorage.getItem('uppi_roadmap_items_v1');
  if (stored) {
    try {
      roadmapItems = JSON.parse(stored);
    } catch (e) {
      roadmapItems = [...DEFAULT_ROADMAP];
    }
  } else {
    roadmapItems = [...DEFAULT_ROADMAP];
    saveRoadmap();
  }
  
  renderRoadmap();
  
  const btnAddRoadmap = document.getElementById('btn-add-roadmap');
  const inputRoadmap = document.getElementById('input-roadmap-text');
  const selectPhase = document.getElementById('select-roadmap-phase');
  
  if (btnAddRoadmap && inputRoadmap && selectPhase) {
    btnAddRoadmap.onclick = () => {
      const text = inputRoadmap.value.trim();
      const phase = selectPhase.value;
      if (text) {
        const newItem = {
          id: String(Date.now()),
          phase: phase,
          text: text,
          completed: false
        };
        roadmapItems.push(newItem);
        saveRoadmap();
        renderRoadmap();
        inputRoadmap.value = '';
        showToast('Objetivo adicionado ao Roadmap! 🗺️');
      } else {
        alert('Por favor, descreva o objetivo.');
      }
    };
  }
}

function saveRoadmap() {
  localStorage.setItem('uppi_roadmap_items_v1', JSON.stringify(roadmapItems));
}

function renderRoadmap() {
  const container = document.getElementById('roadmap-phases-list');
  if (!container) return;
  
  container.innerHTML = '';
  
  // Group by phase
  const groups = {};
  roadmapItems.forEach(item => {
    if (!groups[item.phase]) {
      groups[item.phase] = [];
    }
    groups[item.phase].push(item);
  });
  
  // Sort phases
  const sortedPhases = Object.keys(groups).sort();
  
  if (sortedPhases.length === 0) {
    container.innerHTML = '<div style="color: var(--text-secondary); font-size: 11px; text-align: center; padding: 20px;">Nenhum objetivo no roadmap.</div>';
    return;
  }
  
  sortedPhases.forEach(phase => {
    const phaseSection = document.createElement('div');
    phaseSection.style.marginBottom = '12px';
    phaseSection.innerHTML = `
      <div style="font-family: var(--font-title); font-size: 10px; font-weight: 700; color: var(--accent-green); margin-bottom: 6px; letter-spacing: 0.5px;">${escapeHtml(phase)}</div>
      <ul style="list-style: none; padding: 0; margin: 0; display: flex; flex-direction: column; gap: 6px;"></ul>
    `;
    
    const ul = phaseSection.querySelector('ul');
    groups[phase].forEach(item => {
      const li = document.createElement('li');
      li.style.display = 'flex';
      li.style.alignItems = 'center';
      li.style.justifyContent = 'space-between';
      li.style.padding = '8px';
      li.style.background = 'rgba(255, 255, 255, 0.01)';
      li.style.border = '1px solid var(--card-border)';
      li.style.borderRadius = '6px';
      li.style.fontSize = '11px';
      li.style.cursor = 'pointer';
      li.style.transition = 'var(--transition-smooth)';
      
      const textDecoration = item.completed ? 'line-through' : 'none';
      const textColor = item.completed ? 'var(--text-secondary)' : '#ffffff';
      
      li.innerHTML = `
        <div style="display: flex; align-items: center; gap: 8px; flex: 1;">
          <div style="width: 14px; height: 14px; border-radius: 50%; border: 1.5px solid ${item.completed ? 'var(--accent-green)' : 'var(--text-secondary)'}; display: flex; align-items: center; justify-content: center; background: ${item.completed ? 'var(--accent-green)' : 'transparent'};">
            ${item.completed ? '<svg viewBox="0 0 24 24" fill="none" style="width: 8px; height: 8px; color: #000;"><path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17Z" stroke="#000" stroke-width="3" stroke-linecap="round"/></svg>' : ''}
          </div>
          <span style="text-decoration: ${textDecoration}; color: ${textColor};">${escapeHtml(item.text)}</span>
        </div>
        <button class="btn-delete-roadmap" data-id="${item.id}" style="background: none; border: none; color: var(--text-secondary); cursor: pointer; font-size: 10px; padding: 0 4px;" title="Remover item">✕</button>
      `;
      
      li.onclick = (e) => {
        if (e.target.classList.contains('btn-delete-roadmap') || e.target.closest('.btn-delete-roadmap')) return;
        item.completed = !item.completed;
        saveRoadmap();
        renderRoadmap();
      };
      
      li.querySelector('.btn-delete-roadmap').onclick = (e) => {
        e.stopPropagation();
        if (confirm('Deseja remover este item do roadmap?')) {
          roadmapItems = roadmapItems.filter(rm => rm.id !== item.id);
          saveRoadmap();
          renderRoadmap();
          showToast('Item removido.');
        }
      };
      
      ul.appendChild(li);
    });
    
    container.appendChild(phaseSection);
  });
}

