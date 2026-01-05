import React from 'react';
import { RoomProvider, useRoom } from '@/contexts/RoomContext';
import LandingPage from '@/components/LandingPage';
import RoomView from '@/components/RoomView';

const AppContent: React.FC = () => {
  const { room } = useRoom();

  return room ? <RoomView /> : <LandingPage />;
};

const Index: React.FC = () => {
  return (
    <RoomProvider>
      <AppContent />
    </RoomProvider>
  );
};

export default Index;
