import React from 'react';
import { RoomProvider, useRoom } from '@/contexts/RoomContext';
import LandingPage from '@/components/LandingPage';
import RoomView from '@/components/RoomView';

const AppContent: React.FC = () => {
  const { isConnected } = useRoom();

  return isConnected ? <RoomView /> : <LandingPage />;
};

const Index: React.FC = () => {
  return (
    <RoomProvider>
      <AppContent />
    </RoomProvider>
  );
};

export default Index;
