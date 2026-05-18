
/**
 * Tipos de medalhas disponíveis no sistema
 */
export interface Badge {
  id: string;
  label: string;
  icon: string;
  color: string;
  description: string;
}

export const BADGE_DEFINITIONS: Record<string, Badge> = {
  verified: {
    id: 'verified',
    label: 'Verificado',
    icon: 'Sparkles',
    color: '#00d9ff',
    description: 'Usuário verificado pela comunidade UNИA.'
  },
  influencer: {
    id: 'influencer',
    label: 'Influenciador',
    icon: 'Users',
    color: '#ff1493',
    description: 'Possui uma grande rede de seguidores.'
  },
  host: {
    id: 'host',
    label: 'Super Anfitrião',
    icon: 'Award',
    color: '#FFD700',
    description: 'Criador assíduo de eventos memoráveis.'
  },
  pioneer: {
    id: 'pioneer',
    label: 'Pioneiro',
    icon: 'Star',
    color: '#7b2fff',
    description: 'Um dos primeiros membros da nossa comunidade.'
  }
};

/**
 * Calcula quais medalhas o usuário possui baseado nas suas estatísticas
 */
export const calculateUserBadges = (profile: any, stats: { followers: number, events: number }): Badge[] => {
  const userBadges: Badge[] = [];

  if (profile.is_verified) {
    userBadges.push(BADGE_DEFINITIONS.verified);
  }

  if (stats.followers >= 10) {
    userBadges.push(BADGE_DEFINITIONS.influencer);
  }

  if (stats.events >= 5) {
    userBadges.push(BADGE_DEFINITIONS.host);
  }

  // Se o ID for de um dos primeiros usuários (exemplo) ou data de criação antiga
  const createdAt = new Date(profile.created_at);
  const sixMonthsAgo = new Date();
  sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
  
  if (createdAt < sixMonthsAgo) {
    userBadges.push(BADGE_DEFINITIONS.pioneer);
  }

  return userBadges;
};
