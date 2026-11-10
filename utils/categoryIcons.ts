/**
 * Mapeamento inteligente de ícones para subcategorias e categorias.
 * Permite que subcategorias específicas (ex: "Corrida de rua", "Ciclismo", "Beach Tennis")
 * exibam seus próprios emojis no mapa e nas listas em vez de herdar genericamente a bola de futebol ou o pin padrão.
 */

const SUBCATEGORY_ICON_MAP: Array<{ keywords: string[]; icon: string }> = [
  // --- CORRIDA & ATLETISMO ---
  { keywords: ['corrida', 'running', 'run', 'maratona', 'correr', 'jogging', 'meia maratona'], icon: '🏃‍♂️' },
  { keywords: ['trilha', 'trail', 'trekking', 'caminhada', 'hiking'], icon: '🥾' },

  // --- CICLISMO ---
  { keywords: ['ciclismo', 'bike', 'bicicleta', 'pedal', 'mountain bike', 'mtb', 'cicloturismo'], icon: '🚴‍♂️' },

  // --- ESPORTES COM BOLA / RAQUETE ---
  { keywords: ['futebol', 'futsal', 'society', 'pelada'], icon: '⚽' },
  { keywords: ['basquete', 'basketball', 'basquetebol'], icon: '🏀' },
  { keywords: ['volei', 'vôlei', 'volleyball', 'futevolei', 'futevôlei'], icon: '🏐' },
  { keywords: ['beach tennis', 'tennis', 'tênis', 'squash', 'padel', 'pickleball'], icon: '🎾' },
  { keywords: ['ping pong', 'tênis de mesa', 'tenis de mesa'], icon: '🏓' },
  { keywords: ['beisebol', 'baseball'], icon: '⚾' },
  { keywords: ['rugby', 'futebol americano'], icon: '🏈' },
  { keywords: ['golfe', 'golf'], icon: '⛳' },

  // --- ESPORTES AQUÁTICOS & PRAIA ---
  { keywords: ['surf', 'surfe', 'bodyboard'], icon: '🏄‍♂️' },
  { keywords: ['natacao', 'natação', 'swimming', 'nado'], icon: '🏊‍♂️' },
  { keywords: ['stand up', 'sup', 'remo', 'canoagem', 'caiaque'], icon: '🚣‍♂️' },
  { keywords: ['mergulho', 'scuba'], icon: '🤿' },
  { keywords: ['vela', 'iate', 'barco'], icon: '⛵' },

  // --- ACADEMIA, FORÇA & FITNESS ---
  { keywords: ['crossfit', 'academia', 'musculacao', 'musculação', 'funcional', 'treino', 'calistenia', 'fitness'], icon: '🏋️‍♂️' },
  { keywords: ['yoga', 'ioga', 'pilates', 'alongamento', 'meditacao', 'meditação'], icon: '🧘' },
  { keywords: ['boxe', 'boxing', 'muay thai', 'luta', 'artes marciais', 'jiu jitsu', 'bjj', 'judô', 'judo', 'karate', 'karatê'], icon: '🥊' },
  { keywords: ['skate', 'skateboard', 'patins', 'roller'], icon: '🛹' },
  { keywords: ['escalada', 'climbing', 'bouldering'], icon: '🧗' },
  { keywords: ['danca', 'dança', 'zumba', 'ritmos', 'ballet'], icon: '💃' },

  // --- CULTURA, MÚSICA & ARTE ---
  { keywords: ['musica', 'música', 'show', 'show ao vivo', 'rock', 'banda', 'violao', 'violão', 'acustico', 'acústico'], icon: '🎸' },
  { keywords: ['samba', 'pagode', 'roda de samba'], icon: '🪕' },
  { keywords: ['eletronica', 'eletrônica', 'dj', 'balada', 'rave', 'techno', 'house'], icon: '🎧' },
  { keywords: ['teatro', 'stand up comedy', 'comedia', 'comédia', 'cinema', 'filme'], icon: '🎭' },
  { keywords: ['arte', 'exposicao', 'exposição', 'museu', 'pintura'], icon: '🎨' },
  { keywords: ['fotografia', 'foto', 'photo'], icon: '📸' },

  // --- GASTRONOMIA, BARES & VIDA NOTURNA ---
  { keywords: ['cerveja', 'chope', 'chopp', 'brewery', 'boteco', 'bar'], icon: '🍺' },
  { keywords: ['vinho', 'wine', 'enologia'], icon: '🍷' },
  { keywords: ['hamburguer', 'hambúrguer', 'burger', 'fast food'], icon: '🍔' },
  { keywords: ['pizza', 'pizzaria'], icon: '🍕' },
  { keywords: ['churrasco', 'churras', 'bbq', 'carne'], icon: '🥩' },
  { keywords: ['cafe', 'café', 'coffee', 'cafeteria', 'brunch'], icon: '☕' },
  { keywords: ['doce', 'confeitaria', 'sobremesa', 'bolo', 'sorvete'], icon: '🍰' },
  { keywords: ['comida', 'gastronomia', 'restaurante', 'almoco', 'almoço', 'jantar'], icon: '🍽️' },

  // --- SOCIAL, NETWORKING & OUTROS ---
  { keywords: ['networking', 'negocios', 'negócios', 'workshop', 'palestra', 'conferencia', 'conferência'], icon: '💼' },
  { keywords: ['festa', 'party', 'comemoracao', 'comemoração', 'aniversario', 'aniversário'], icon: '🎉' },
  { keywords: ['jogos', 'games', 'tabuleiro', 'boardgame', 'videogame'], icon: '🎮' },
  { keywords: ['pet', 'pets', 'cachorro', 'dog'], icon: '🐶' },
  { keywords: ['espiritual', 'oracao', 'oração', 'igreja', 'culto'], icon: '🙏' },
  { keywords: ['voluntariado', 'social', 'caridade', 'ong'], icon: '🤝' },
  { keywords: ['natureza', 'parque', 'ao ar livre', 'ecoturismo'], icon: '🌿' },
];

/**
 * Remove acentos e caracteres especiais para comparação flexível
 */
function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

/**
 * Retorna o ícone mais apropriado com base no texto (subcategoria ou título).
 */
export function getSubcategoryIcon(
  textToMatch?: string | null,
  fallbackCategoryIcon?: string | null
): string {
  if (textToMatch) {
    const normalized = normalizeText(textToMatch);
    const words = normalized.split(/[\s,.-]+/);
    
    for (const item of SUBCATEGORY_ICON_MAP) {
      for (const keyword of item.keywords) {
        const normalizedKeyword = normalizeText(keyword);
        
        // Se a keyword tiver múltiplas palavras (ex: 'beach tennis', 'mountain bike')
        if (normalizedKeyword.includes(' ')) {
          if (normalized.includes(normalizedKeyword)) {
            return item.icon;
          }
        } else {
          // Palavra única: checa se está isolada nas palavras ou se é substring
          if (words.includes(normalizedKeyword) || normalized.includes(normalizedKeyword)) {
            return item.icon;
          }
        }
      }
    }
  }

  // Se não encontrou ícone específico, usa o da categoria pai
  if (fallbackCategoryIcon && fallbackCategoryIcon.trim() !== '') {
    return fallbackCategoryIcon;
  }

  return '📍';
}

/**
 * Retorna o ícone do evento priorizando:
 * 1. Nome da Subcategoria
 * 2. Título do Evento (ex: "Nashville rock and run" -> 🏃‍♂️)
 * 3. Ícone da Categoria Pai
 */
export function getEventMarkerIcon(event: {
  title?: string | null;
  subcategories?: { name?: string | null } | null;
  categories?: { icon?: string | null; name?: string | null } | null;
}): string {
  const subName = event?.subcategories?.name;
  const catIcon = event?.categories?.icon;
  const title = event?.title;

  // 1. Prioridade máxima: subcategoria cadastrada
  if (subName) {
    const iconFromSub = getSubcategoryIcon(subName, null);
    if (iconFromSub && iconFromSub !== '📍') {
      return iconFromSub;
    }
  }

  // 2. Segunda prioridade: título do evento (detecta "run", "ciclismo", "crossfit", etc. no nome!)
  if (title) {
    const iconFromTitle = getSubcategoryIcon(title, null);
    if (iconFromTitle && iconFromTitle !== '📍') {
      return iconFromTitle;
    }
  }

  // 3. Terceira prioridade: ícone da categoria pai
  if (catIcon && catIcon.trim() !== '') {
    return catIcon;
  }

  return '📍';
}
