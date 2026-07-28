import React, { useState, useRef, useCallback } from 'react';
import { listWarranties } from '@/api/warranties';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Search, Shield, Loader2, RefreshCw } from "lucide-react";
import { differenceInDays } from "date-fns";
import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import StatsOverview from "../components/warranty/StatsOverview";
import WarrantyCard from "../components/warranty/WarrantyCard";
import { usePageTitle } from '@/lib/usePageTitle';

export default function Dashboard() {
  usePageTitle('Your Vault');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [refreshing, setRefreshing] = useState(false);
  const touchStartY = useRef(null);
  const isTouchScrolling = useRef(false);
  const queryClient = useQueryClient();

  const { data: warranties = [], isLoading } = useQuery({
    queryKey: ['warranties'],
    queryFn: listWarranties,
  });

  const handleRefresh = useCallback(async () => {
    setRefreshing(true);
    await queryClient.invalidateQueries({ queryKey: ['warranties'] });
    setTimeout(() => setRefreshing(false), 600);
  }, [queryClient]);

  const onTouchStart = (e) => {
    touchStartY.current = e.touches[0].clientY;
    isTouchScrolling.current = false;
  };
  const onTouchMove = (e) => {
    if (touchStartY.current === null) return;
    const dy = e.touches[0].clientY - touchStartY.current;
    // If the page is scrolled down, mark as scrolling so we don't refresh
    if (window.scrollY > 0 || dy < 0) {
      isTouchScrolling.current = true;
    }
  };
  const onTouchEnd = (e) => {
    if (touchStartY.current === null) return;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    if (!isTouchScrolling.current && dy > 80 && window.scrollY === 0) handleRefresh();
    touchStartY.current = null;
    isTouchScrolling.current = false;
  };

  const filtered = warranties.filter(w => {
    const matchesSearch = !search || 
      w.product_name?.toLowerCase().includes(search.toLowerCase()) ||
      w.brand?.toLowerCase().includes(search.toLowerCase()) ||
      w.store?.toLowerCase().includes(search.toLowerCase());

    if (!matchesSearch) return false;

    const daysLeft = differenceInDays(new Date(w.warranty_end_date), new Date());
    
    if (filter === 'active') return daysLeft > 30;
    if (filter === 'expiring') return daysLeft >= 0 && daysLeft <= 30;
    if (filter === 'expired') return daysLeft < 0;
    return true;
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (warranties.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-32 text-center">
        <div className="w-20 h-20 bg-accent rounded-2xl flex items-center justify-center mb-6">
          <Shield className="w-10 h-10 text-primary" />
        </div>
        <h2 className="text-2xl font-bold mb-2">Your vault is empty</h2>
        <p className="text-muted-foreground mb-6 max-w-sm">
          Add your first warranty in under a minute. Snap a receipt or fill in the details yourself.
        </p>
        <Link to="/add">
          <Button size="lg" className="gap-2">
            Add Your First Warranty
          </Button>
        </Link>

      </div>
    );
  }

  return (
    <div className="space-y-6" onTouchStart={onTouchStart} onTouchMove={onTouchMove} onTouchEnd={onTouchEnd}>
      {refreshing && (
        <div className="flex justify-center py-2 -mb-4">
          <RefreshCw className="w-5 h-5 text-primary animate-spin" />
        </div>
      )}
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Your Vault</h1>
        <p className="text-muted-foreground text-sm mt-1">
          {warranties.length} {warranties.length === 1 ? 'product protected' : 'products protected'}
        </p>
      </div>

      <StatsOverview warranties={warranties} onFilterChange={setFilter} />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search by product, brand, or store"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
        <Tabs value={filter} onValueChange={setFilter}>
          <TabsList>
            <TabsTrigger value="all">All</TabsTrigger>
            <TabsTrigger value="active">Active</TabsTrigger>
            <TabsTrigger value="expiring">Expiring</TabsTrigger>
            <TabsTrigger value="expired">Expired</TabsTrigger>
          </TabsList>
        </Tabs>
      </div>

      <div className="space-y-3">
        {filtered.map((warranty) => (
          <WarrantyCard key={warranty.id} warranty={warranty} />
        ))}
        {filtered.length === 0 && (
          <p className="text-center text-muted-foreground py-12">
            Nothing here. Try a different search or filter.
          </p>
        )}
      </div>
    </div>
  );
}