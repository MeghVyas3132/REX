import React from 'react';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import heroImage from '@/assets/workflow-hero.jpg';

interface EmptyStateProps {
  onGetStarted: () => void;
}

export const EmptyState: React.FC<EmptyStateProps> = ({ onGetStarted }) => {
  return (
    <div className="absolute inset-0 flex items-center justify-center p-8 pointer-events-none">
      <Card className="max-w-2xl mx-auto text-center p-8 bg-gradient-node border-border/50 shadow-elevated pointer-events-auto">
        <div className="mb-6">
          <img 
            src={heroImage} 
            alt="Workflow automation platform" 
            className="w-full h-48 object-cover rounded-lg shadow-node"
          />
        </div>
        
        <h1 className="text-3xl font-bold mb-4 bg-gradient-primary bg-clip-text text-transparent">
          Welcome to Pransh Workflow Studio
        </h1>
        
        <p className="text-muted-foreground mb-6 text-lg leading-relaxed">
          Build powerful automation workflows with our visual node-based editor. 
          Connect triggers, actions, and AI models to create sophisticated workflows 
          without writing code.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <div className="p-4 rounded-lg bg-surface-elevated border border-border/50">
            <div className="text-2xl mb-2"></div>
            <h3 className="font-semibold mb-1">Smart Triggers</h3>
            <p className="text-sm text-muted-foreground">
              Webhooks, schedules, and event-driven automation
            </p>
          </div>
          
          <div className="p-4 rounded-lg bg-surface-elevated border border-border/50">
            <div className="text-2xl mb-2"></div>
            <h3 className="font-semibold mb-1">AI Integration</h3>
            <p className="text-sm text-muted-foreground">
              Built-in support for OpenAI, Claude, and more
            </p>
          </div>
          
          <div className="p-4 rounded-lg bg-surface-elevated border border-border/50">
            <div className="text-2xl mb-2"></div>
            <h3 className="font-semibold mb-1">Easy Connections</h3>
            <p className="text-sm text-muted-foreground">
              Drag, drop, and connect nodes visually
            </p>
          </div>
        </div>
        
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button 
            variant="gradient" 
            size="lg"
            className="glow-hover"
            onClick={onGetStarted}
            data-testid="start-building-button"
          >
            🚀 Start Building
          </Button>
          <Button variant="outline" size="lg">
            📖 View Documentation
          </Button>
        </div>
      </Card>
    </div>
  );
};