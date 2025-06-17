import React, { useEffect, useState } from "react";
import { usePageController } from "@/hooks/usePageController";
import { Token } from "@/store/slices/tokenSlice";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Plus,
  Search,
  Filter,
  MoreHorizontal,
  ArrowUpDown,
  ExternalLink,
  RefreshCw,
  Loader2
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { usePermission } from "@/hooks/usePermission";
import { useToast } from "@/hooks/use-toast";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

const TokensPage = () => {
  const { toast } = useToast();
  const { hasPermission } = usePermission();

  // Initialize page controller
  const pageController = usePageController({
    pageId: 'tokens',
    pageName: 'Tokens',
    description: 'Manage blockchain tokens, digital assets, and tokenized securities',
    category: 'blockchain',
    permissions: ['tokens:read', 'tokens:write', 'tokens:manage'],
    tags: ['tokens', 'blockchain', 'assets', 'securities', 'digital']
  });

  const [tokens, setTokens] = useState<Token[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [confirmDeleteTokenId, setConfirmDeleteTokenId] = useState<string | null>(null);
  const [isDeletingToken, setIsDeletingToken] = useState(false);
  const [isLoadingTokens, setIsLoadingTokens] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Load tokens on mount
  useEffect(() => {
    if (pageController.isRegistered) {
      handleRefresh();
    }
  }, [pageController.isRegistered]);

  // Handle errors
  useEffect(() => {
    if (error) {
      toast({
        title: "Error",
        description: error,
        variant: "destructive",
      });
      setError(null);
    }
  }, [error, toast]);

  const handleRefresh = async () => {
    if (!pageController.isRegistered) return;
    
    setIsLoadingTokens(true);
    setError(null);
    
    try {
      const result = await pageController.executeAction('refreshTokens', {});
      if (result.success && result.data) {
        // Handle the API response structure
        const responseData = result.data as any;
        if (responseData.tokens && Array.isArray(responseData.tokens)) {
          setTokens(responseData.tokens);
        } else if (Array.isArray(responseData)) {
          setTokens(responseData);
        } else {
          setTokens([]);
        }
      } else {
        setError(result.error || 'Failed to load tokens');
      }
    } catch (error) {
      console.error('Failed to refresh tokens:', error);
      setError('Failed to refresh tokens');
    } finally {
      setIsLoadingTokens(false);
    }
  };

  const handleDeleteConfirmation = (tokenId: string) => {
    setConfirmDeleteTokenId(tokenId);
  };
  
  const handleDeleteToken = async (tokenId: string) => {
    setConfirmDeleteTokenId(null);
    setIsDeletingToken(true);
    
    try {
      const result = await pageController.executeAction('deleteToken', { tokenId });
      if (result.success) {
        toast({
          title: "Token Deleted",
          description: "Token has been successfully deleted.",
        });
        // Refresh the tokens list
        await handleRefresh();
      } else {
        setError(result.error || 'Failed to delete token');
      }
    } catch (error) {
      console.error('Failed to delete token:', error);
      setError('Failed to delete token');
    } finally {
      setIsDeletingToken(false);
    }
  };

  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return "N/A";
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

  const filteredTokens = tokens.filter((token) =>
    token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    token.symbol?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    token.blockchain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Token Management</h1>
          <p className="text-muted-foreground mt-1">
            Manage your organization's tokenized assets
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button size="sm" variant="outline" onClick={handleRefresh} disabled={isLoadingTokens}>
            {isLoadingTokens ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
            Refresh
          </Button>
          {hasPermission('tokens:write') && (
            <Button asChild size="sm">
              <Link href="/tokens/create">
                <Plus className="h-4 w-4 mr-2" />
                Create Token
              </Link>
            </Button>
          )}
        </div>
      </div>

      <Card>
        <div className="p-4 border-b">
          <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
            <div className="relative w-full md:w-64">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search tokens..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-8"
              />
            </div>
            
            <Button variant="outline" size="sm">
              <Filter className="h-4 w-4 mr-2" />
              Filter
            </Button>
          </div>
        </div>
        
        <div className="relative overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[250px]">
                  <div className="flex items-center">
                    Name
                    <ArrowUpDown className="ml-2 h-3 w-3" />
                  </div>
                </TableHead>
                <TableHead>Symbol</TableHead>
                <TableHead>Blockchain</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Supply</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Created</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoadingTokens ? (
                Array(5).fill(0).map((_, index) => (
                  <TableRow key={index}>
                    {Array(8).fill(0).map((_, cellIndex) => (
                      <TableCell key={cellIndex}>
                        <Skeleton className="h-6 w-full" />
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              ) : filteredTokens.length > 0 ? (
                filteredTokens.map((token) => (
                  <TableRow key={token.id}>
                    <TableCell>
                      <div className="font-medium">{token.name}</div>
                    </TableCell>
                    <TableCell>{token.symbol}</TableCell>
                    <TableCell>{token.blockchain}</TableCell>
                    <TableCell>{token.type}</TableCell>
                    <TableCell className="text-right">
                      {token.supply.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          token.status === 'confirmed' ? 'default' :
                          token.status === 'pending' ? 'secondary' :
                          'destructive'
                        }
                        className="capitalize"
                      >
                        {token.status}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {formatDate(token.createdAt)}
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="h-4 w-4" />
                            <span className="sr-only">Open menu</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuItem asChild>
                            <Link href={`/tokens/${token.id}`}>
                              View details
                            </Link>
                          </DropdownMenuItem>
                          {/* Transfer tokens only if user has write permission */}
                          {hasPermission('tokens:write') && (
                            <DropdownMenuItem onClick={() => {
                              toast({ title: "Feature Coming Soon", description: "Transferring tokens is not yet implemented." });
                            }}>
                              Transfer tokens
                            </DropdownMenuItem>
                          )}
                          {token.contractAddress && (
                            <DropdownMenuItem onClick={() => window.open(`https://etherscan.io/token/${token.contractAddress}`, "_blank")}>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View on Explorer
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          {hasPermission('tokens:write') && ( // Only allow delete if user has write permission
                            <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteConfirmation(token.id)} disabled={isDeletingToken}>
                              {isDeletingToken ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Delete token"}
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="h-24 text-center">
                    {searchTerm ? (
                      <div className="text-muted-foreground">
                        No tokens found matching "{searchTerm}"
                      </div>
                    ) : (
                      <div className="text-muted-foreground">
                        No tokens found. Create your first token to get started.
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      </Card>

      {/* Delete Confirmation Dialog */}
      <AlertDialog
        open={!!confirmDeleteTokenId}
        onOpenChange={(open) => {
          if (!open) setConfirmDeleteTokenId(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this token.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeletingToken}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => handleDeleteToken(confirmDeleteTokenId!)}
              disabled={isDeletingToken}
            >
              {isDeletingToken ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : "Continue"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TokensPage;