import React, { useEffect, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { mockApis } from "@/services/api";
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
  RefreshCw
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
import Link from "next/link"; // Import Next.js Link

const TokensPage = () => {
  const { hasPermission } = { hasPermission: (perm: string) => true }; // Mock permission hook
  const [tokens, setTokens] = useState<Token[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");

  useEffect(() => {
    const fetchTokens = async () => {
      try {
        const response = await mockApis.getTokens();
        setTokens(response.data.tokens);
      } catch (error) {
        console.error("Failed to fetch tokens:", error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchTokens();
  }, []);

  const filteredTokens = tokens.filter((token) =>
    token.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    token.symbol?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    token.blockchain.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    }).format(date);
  };

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
          <Button size="sm" variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button asChild size="sm"> {/* Use asChild to make Button a Link */}
            <Link href="/tokens/create">
              <Plus className="h-4 w-4 mr-2" />
              Create Token
            </Link>
          </Button>
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
              {isLoading ? (
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
                          <DropdownMenuItem>
                            View details
                          </DropdownMenuItem>
                          <DropdownMenuItem>
                            Transfer tokens
                          </DropdownMenuItem>
                          {token.contractAddress && (
                            <DropdownMenuItem>
                              <ExternalLink className="h-4 w-4 mr-2" />
                              View on Explorer
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem className="text-destructive">
                            Delete token
                          </DropdownMenuItem>
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
    </div>
  );
};

export default TokensPage;