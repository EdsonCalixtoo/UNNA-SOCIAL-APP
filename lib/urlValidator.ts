/**
 * Valida se uma URL é válida para carregar imagens
 * @param url - URL da imagem
 * @returns true se a URL é válida, false caso contrário
 */
export function isValidImageUrl(url: string | undefined): boolean {
  if (!url) {
    console.warn('URL é vazia ou undefined');
    return false;
  }

  // Rejeita URLs locais do file:// que não são acessíveis no viewer
  if (url.startsWith('file://')) {
    console.warn('URL local rejeitada (file://):', url);
    return false;
  }

  // Rejeita apenas URLs que definitivamente não funcionam
  if (url === '' || url === null || url === undefined) {
    return false;
  }

  // Aceita URLs HTTP/HTTPS (incluindo Supabase Storage)
  if (url.startsWith('http://') || url.startsWith('https://')) {
    console.log('URL válida (HTTP/HTTPS):', url);
    return true;
  }

  // Se for qualquer outra coisa (data URI, blob, etc.), rejeita
  if (url.startsWith('data:') || url.startsWith('blob:')) {
    console.warn('URL de data ou blob rejeitada:', url.substring(0, 50));
    return false;
  }

  console.warn('URL inválida:', url);
  return false;
}

/**
 * Obtém a URL de imagem válida ou undefined
 * @param url - URL da imagem
 * @returns URL válida ou undefined
 */
export function getValidImageUrl(url: string | undefined): string | undefined {
  return isValidImageUrl(url) ? url : undefined;
}
