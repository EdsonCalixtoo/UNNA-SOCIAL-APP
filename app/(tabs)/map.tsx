import React from 'react';
import EventsMapScreen from '@/screens/EventsMapScreen';
import PageTransition from '@/components/PageTransition';

/**
 * Entry point para a aba de Mapa.
 * Toda a lógica e interface premium foram movidas para @/screens/EventsMapScreen
 * para manter o código modular, performático e fácil de manter.
 */
export default function MapTab() {
  return (
    <PageTransition>
      <EventsMapScreen />
    </PageTransition>
  );
}
