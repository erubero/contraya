import React from 'react';
import { Card } from "@/components/ui/card";
import { ShieldCheck, ShieldAlert, ShieldX, DollarSign } from "lucide-react";
import { differenceInDays } from "date-fns";


export default function StatsOverview({ warranties, onFilterChange }) {
  const today = new Date();

  const active = warranties.filter(w => differenceInDays(new Date(w.warranty_end_date), today) > 30);
  const expiringSoon = warranties.filter(w => {
    const d = differenceInDays(new Date(w.warranty_end_date), today);
    return d >= 0 && d <= 30;
  });
  const expired = warranties.filter(w => differenceInDays(new Date(w.warranty_end_date), today) < 0);
  const totalValue = warranties
    .filter(w => differenceInDays(new Date(w.warranty_end_date), today) >= 0)
    .reduce((sum, w) => sum + (w.purchase_price || 0), 0);

  const stats = [
    { label: "Active", value: active.length, icon: ShieldCheck, color: "text-blue-600", bg: "bg-blue-50", filter: "active" },
    { label: "Expiring Soon", value: expiringSoon.length, icon: ShieldAlert, color: "text-amber-600", bg: "bg-amber-50", filter: "expiring" },
    { label: "Expired", value: expired.length, icon: ShieldX, color: "text-red-500", bg: "bg-red-50", filter: "expired" },
    { label: "Protected Value", value: `$${totalValue.toLocaleString()}`, icon: DollarSign, color: "text-primary", bg: "bg-accent", filter: null },
  ];

  return (
    <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
      {stats.map((stat) => (
        <Card
          key={stat.label}
          className={`p-4 border ${stat.filter ? 'cursor-pointer hover:shadow-md hover:border-primary/20 transition-all' : ''}`}
          onClick={() => stat.filter && onFilterChange(stat.filter)}
        >
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 ${stat.bg} rounded-xl flex items-center justify-center`}>
              <stat.icon className={`w-5 h-5 ${stat.color}`} />
            </div>
            <div>
              <p className="text-2xl font-bold tracking-tight">{stat.value}</p>
              <p className="text-xs text-muted-foreground">{stat.label}</p>
            </div>
          </div>
        </Card>
      ))}
    </div>
  );
}