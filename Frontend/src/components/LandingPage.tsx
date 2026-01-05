import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Users, Zap, Radio, Sparkles, ArrowRight } from 'lucide-react';
import JoinRoomModal from './JoinRoomModal';

const LandingPage: React.FC = () => {
  const [modalMode, setModalMode] = useState<'create' | 'join' | null>(null);

  const features = [
    {
      icon: Radio,
      title: 'Perfect Sync',
      description: 'Millisecond-accurate playback synchronization across all devices.',
    },
    {
      icon: Users,
      title: 'Watch Together',
      description: 'Invite friends with a simple room code. No signup required.',
    },
    {
      icon: Zap,
      title: 'Low Latency',
      description: 'Powered by WebSocket technology for real-time updates.',
    },
  ];

  return (
    <div className="min-h-screen flex flex-col">
      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-16 relative overflow-hidden">
        {/* Background Effects */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-primary/20 rounded-full blur-[120px] animate-float" />
          <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-secondary/20 rounded-full blur-[120px] animate-float" style={{ animationDelay: '1.5s' }} />
        </div>

        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto text-center">
          {/* Badge */}
          <div className="inline-flex items-center gap-2 glass px-4 py-2 rounded-full mb-8 animate-slide-up">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="text-sm font-medium text-foreground">Real-time sync for everyone</span>
          </div>

          {/* Heading */}
          <h1 className="text-4xl sm:text-5xl lg:text-7xl font-extrabold mb-6 leading-tight">
            <span className="text-foreground">Watch </span>
            <span className="gradient-text">Together,</span>
            <br />
            <span className="text-foreground">Stay </span>
            <span className="gradient-text">Connected</span>
          </h1>

          <p className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10">
            Create a room, share the code, and enjoy synchronized media playback 
            with friends. Real-time chat, host controls, and seamless sync.
          </p>

          {/* CTA Buttons */}
          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-16">
            <Button
              variant="glow"
              size="xl"
              onClick={() => setModalMode('create')}
              className="w-full sm:w-auto group"
            >
              <Play className="h-5 w-5" />
              Create Room
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </Button>
            <Button
              variant="glass"
              size="xl"
              onClick={() => setModalMode('join')}
              className="w-full sm:w-auto"
            >
              <Users className="h-5 w-5" />
              Join Room
            </Button>
          </div>

          {/* Features */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 max-w-3xl mx-auto">
            {features.map((feature, index) => (
              <div
                key={feature.title}
                className="glass rounded-2xl p-6 text-left hover:bg-card/80 transition-all duration-300 animate-slide-up"
                style={{ animationDelay: `${index * 100}ms` }}
              >
                <div className="h-12 w-12 rounded-xl bg-primary/20 flex items-center justify-center mb-4">
                  <feature.icon className="h-6 w-6 text-primary" />
                </div>
                <h3 className="font-semibold text-foreground mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="py-6 text-center text-sm text-muted-foreground border-t border-border/50">
        <p>Built with Socket.IO for real-time synchronization</p>
      </footer>

      {/* Modal */}
      {modalMode && (
        <JoinRoomModal mode={modalMode} onClose={() => setModalMode(null)} />
      )}
    </div>
  );
};

export default LandingPage;
