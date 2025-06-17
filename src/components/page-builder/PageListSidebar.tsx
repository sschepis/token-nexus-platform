import React, { useState } from 'react';
import { usePageBuilderStore } from '@/store/pageBuilderStore';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Plus, FileText, Search } from 'lucide-react';
import { cn } from '@/lib/utils';
import { toast } from '@/components/ui/sonner';

interface PageListSidebarProps {
  className?: string;
}

const PageListSidebar: React.FC<PageListSidebarProps> = ({ className }) => {
  const { pages, currentPageId, setCurrentPageId, addPage } = usePageBuilderStore();
  const [newPageTitle, setNewPageTitle] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  const handleCreatePage = () => {
    if (newPageTitle.trim()) {
      addPage(newPageTitle.trim());
      setNewPageTitle('');
      toast.success(`Page "${newPageTitle.trim()}" created!`);
    } else {
      toast.error('Page title cannot be empty.');
    }
  };

  const filteredPages = pages.filter(page =>
    page.title.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className={cn("w-64 bg-card border-r flex flex-col", className)}>
      {/* Search and Add Page */}
      <div className="p-4 border-b">
        <div className="relative mb-3">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search pages..."
            className="pl-9"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="flex gap-2">
          <Input
            placeholder="New page title"
            value={newPageTitle}
            onChange={(e) => setNewPageTitle(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                handleCreatePage();
              }
            }}
            className="flex-1"
          />
          <Button onClick={handleCreatePage} size="icon">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
      </div>

      {/* Pages List */}
      <ScrollArea className="flex-1 p-4">
        {filteredPages.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-4">No pages found.</p>
        ) : (
          <div className="space-y-2">
            {filteredPages.map(page => (
              <Button
                key={page.id}
                variant={page.id === currentPageId ? 'secondary' : 'ghost'}
                className="w-full justify-start h-auto py-2 px-3 text-wrap"
                onClick={() => setCurrentPageId(page.id)}
              >
                <FileText className="h-4 w-4 mr-2 flex-shrink-0" />
                <span className="flex-1 text-left truncate">{page.title}</span>
                {page.isPublished && (
                  <span className="ml-2 text-xs text-green-500">
                    {/* Could add a published icon here */}
                  </span>
                )}
              </Button>
            ))}
          </div>
        )}
      </ScrollArea>
    </div>
  );
};

export default PageListSidebar;