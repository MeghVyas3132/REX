import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, FileText, History as HistoryIcon } from 'lucide-react';

export const WorkflowHome: React.FC = () => {


  return (
    <div className="min-h-screen bg-canvas-background">
      {/* Header */}
      <header className="border-b border-border bg-surface-elevated">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-4">
              <h1 className="text-2xl font-bold text-foreground">Workflow Studio</h1>
            </div>
            <div className="flex items-center gap-2">
              <Link to="/history">
                <Button variant="outline" className="flex items-center gap-2">
                  <HistoryIcon className="h-4 w-4" />
                  View History
              </Button>
              </Link>
              <Link to="/studio">
                <Button className="flex items-center gap-2">
                  <Plus className="h-4 w-4" />
                  Create Workflow
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="text-center">
          <Card className="p-12">
            <FileText className="h-16 w-16 text-muted-foreground mx-auto mb-6" />
            <h2 className="text-3xl font-bold text-foreground mb-4">
              Welcome to Workflow Studio
            </h2>
            <p className="text-lg text-muted-foreground mb-8 max-w-2xl mx-auto">
              All your workflows (executed or created) are stored in the History section. 
              Create a new workflow to get started, or view your existing workflows in History.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to="/studio">
                <Button size="lg" className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Create New Workflow
                </Button>
              </Link>
              <Link to="/history">
                <Button variant="outline" size="lg" className="flex items-center gap-2">
                  <HistoryIcon className="h-5 w-5" />
                  View All Workflows
                    </Button>
                  </Link>
                </div>
              </Card>
          </div>
      </main>
    </div>
  );
};