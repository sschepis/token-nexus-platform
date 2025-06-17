import React, { useState, useCallback, useEffect } from 'react';
import { useRouter } from 'next/router';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command";
import {
  Search,
  User,
  Database,
  FileText,
  Settings,
  LayoutDashboard,
  Store,
  Navigation as NavigationIcon,
  Clock,
  Component,
  Key,
  Shield
} from "lucide-react";

interface SearchResult {
  id: string;
  title: string;
  description: string;
  type: 'page' | 'user' | 'object' | 'token' | 'app' | 'setting';
  url: string;
  icon: React.ReactNode;
}

// Mock search results - in a real app, these would come from your API
const mockSearchResults: SearchResult[] = [
  {
    id: '1',
    title: 'Dashboard',
    description: 'View your application dashboard and analytics',
    type: 'page',
    url: '/dashboard',
    icon: <LayoutDashboard className="h-4 w-4" />
  },
  {
    id: '2',
    title: 'John Doe',
    description: 'john.doe@example.com - Admin User',
    type: 'user',
    url: '/users/john-doe',
    icon: <User className="h-4 w-4" />
  },
  {
    id: '3',
    title: 'Token Contract',
    description: 'ERC-20 token smart contract configuration',
    type: 'object',
    url: '/object-manager/token-contract',
    icon: <Database className="h-4 w-4" />
  },
  {
    id: '4',
    title: 'NEXUS Token',
    description: 'Platform utility token with 1M total supply',
    type: 'token',
    url: '/tokens/nexus',
    icon: <Key className="h-4 w-4" />
  },
  {
    id: '5',
    title: 'DeFi Trading App',
    description: 'Decentralized trading application',
    type: 'app',
    url: '/marketplace/defi-trading',
    icon: <Store className="h-4 w-4" />
  },
  {
    id: '6',
    title: 'Organization Settings',
    description: 'Manage your organization preferences',
    type: 'setting',
    url: '/settings/organization',
    icon: <Settings className="h-4 w-4" />
  }
];

const getTypeColor = (type: SearchResult['type']) => {
  switch (type) {
    case 'page':
      return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
    case 'user':
      return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
    case 'object':
      return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300';
    case 'token':
      return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
    case 'app':
      return 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-300';
    case 'setting':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    default:
      return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
  }
};

interface GlobalSearchProps {
  trigger?: React.ReactNode;
}

export function GlobalSearch({ trigger }: GlobalSearchProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResult[]>([]);
  const router = useRouter();

  // Filter results based on query
  const filterResults = useCallback((searchQuery: string) => {
    if (!searchQuery.trim()) {
      setResults([]);
      return;
    }

    const filtered = mockSearchResults.filter(item =>
      item.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase())
    );

    setResults(filtered);
  }, []);

  useEffect(() => {
    filterResults(query);
  }, [query]);

  const handleSelect = (result: SearchResult) => {
    setOpen(false);
    setQuery('');
    router.push(result.url);
  };

  // Keyboard shortcut to open search
  useEffect(() => {
    const down = (e: KeyboardEvent) => {
      if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
        e.preventDefault();
        setOpen((open) => !open);
      }
    };

    document.addEventListener('keydown', down);
    return () => document.removeEventListener('keydown', down);
  }, []);

  const defaultTrigger = (
    <Button variant="ghost" size="icon" className="h-8 w-8">
      <Search className="h-4 w-4" />
      <span className="sr-only">Search</span>
    </Button>
  );

  // Group results by type
  const groupedResults = results.reduce((acc, result) => {
    if (!acc[result.type]) {
      acc[result.type] = [];
    }
    acc[result.type].push(result);
    return acc;
  }, {} as Record<string, SearchResult[]>);

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {trigger || defaultTrigger}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[550px] p-0">
        <DialogHeader className="px-4 pb-0 pt-4">
          <DialogTitle className="text-sm text-muted-foreground">
            Search everything...
          </DialogTitle>
        </DialogHeader>
        <Command className="rounded-lg border-0 shadow-none">
          <CommandInput
            placeholder="Type to search..."
            value={query}
            onValueChange={setQuery}
            className="border-0"
          />
          <CommandList className="max-h-[300px]">
            {query && results.length === 0 && (
              <CommandEmpty>No results found.</CommandEmpty>
            )}
            
            {Object.entries(groupedResults).map(([type, typeResults]) => (
              <div key={type}>
                <CommandGroup heading={type.charAt(0).toUpperCase() + type.slice(1) + 's'}>
                  {typeResults.map((result) => (
                    <CommandItem
                      key={result.id}
                      onSelect={() => handleSelect(result)}
                      className="flex items-center gap-3 p-3"
                    >
                      <div className="flex items-center gap-3 flex-1">
                        {result.icon}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{result.title}</span>
                            <Badge variant="secondary" className={`text-xs ${getTypeColor(result.type)}`}>
                              {result.type}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground truncate">
                            {result.description}
                          </p>
                        </div>
                      </div>
                    </CommandItem>
                  ))}
                </CommandGroup>
                {Object.keys(groupedResults).indexOf(type) < Object.keys(groupedResults).length - 1 && (
                  <CommandSeparator />
                )}
              </div>
            ))}
            
            {!query && (
              <div className="p-4 text-center text-sm text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p>Start typing to search across your platform</p>
                <p className="text-xs mt-1">
                  Press <kbd className="px-1.5 py-0.5 text-xs bg-muted rounded">⌘K</kbd> to open search
                </p>
              </div>
            )}
          </CommandList>
        </Command>
      </DialogContent>
    </Dialog>
  );
}