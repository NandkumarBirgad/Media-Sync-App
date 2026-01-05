import React from 'react';
import RoomHeader from './RoomHeader';
import MediaPlayer from './MediaPlayer';
import ParticipantList from './ParticipantList';
import ChatPanel from './ChatPanel';

const RoomView: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <RoomHeader />

      <main className="flex-1 container mx-auto px-4 py-6">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 h-full">
          {/* Main Content - Media Player */}
          <div className="lg:col-span-8 xl:col-span-9 space-y-6">
            <MediaPlayer />
          </div>

          {/* Sidebar - Participants & Chat */}
          <div className="lg:col-span-4 xl:col-span-3 space-y-6 lg:h-[calc(100vh-8rem)] lg:sticky lg:top-24">
            <ParticipantList />
            <div className="flex-1 lg:h-[calc(100%-220px)]">
              <ChatPanel />
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default RoomView;
