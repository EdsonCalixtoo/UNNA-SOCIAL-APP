import * as Location from 'expo-location';
import { Platform } from 'react-native';

export const mapService = {
  /**
   * Obtém a localização atual do usuário com permissões
   */
  async getUserLocation(): Promise<{ latitude: number; longitude: number } | null> {
    if (Platform.OS === 'web') return null;

    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') return null;

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
      });
      
      return {
        latitude: location.coords.latitude,
        longitude: location.coords.longitude,
      };
    } catch (error) {
      console.error('Error getting location:', error);
      return null;
    }
  },

  /**
   * Calcula a cor do marcador baseada no status
   */
  getMarkerColor(status: 'happening' | 'starting-soon' | 'upcoming'): string {
    switch (status) {
      case 'happening': return '#34C759'; // Green
      case 'starting-soon': return '#FF9500'; // Orange
      default: return '#00d9ff'; // Cyan
    }
  },

  /**
   * Calcula a distância entre dois pontos e retorna o valor numérico em km
   */
  getDistanceInKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Raio da terra em km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  },

  /**
   * Calcula a distância entre dois pontos (Haversine formula)
   */
  calculateDistance(lat1: number, lon1: number, lat2: number, lon2: number): string {
    const d = this.getDistanceInKm(lat1, lon1, lat2, lon2);
    
    if (d < 1) return `${(d * 1000).toFixed(0)}m`;
    return `${d.toFixed(1)}km`;
  }
};
