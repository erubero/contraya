import React from 'react';
import { Badge } from "@/components/ui/badge";
import { Shield, ShieldAlert, ShieldX, ShieldCheck } from "lucide-react";
import { differenceInDays } from "date-fns";

export default function StatusBadge({ endDate }) {
  const today = new Date();
  const end = new Date(endDate);
  const daysLeft = differenceInDays(end, today);

  if (daysLeft < 0) {
    return (
      <Badge className="bg-red-50 text-red-600 border border-red-200 hover:bg-red-50 gap-1.5 font-medium px-3 py-1">
        <ShieldX className="w-3.5 h-3.5" />
        Expired
      </Badge>
    );
  }

  if (daysLeft <= 30) {
    return (
      <Badge className="bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-50 gap-1.5 font-medium px-3 py-1">
        <ShieldAlert className="w-3.5 h-3.5" />
        {daysLeft}d left
      </Badge>
    );
  }

  if (daysLeft <= 90) {
    return (
      <Badge className="bg-orange-50 text-orange-600 border border-orange-200 hover:bg-orange-50 gap-1.5 font-medium px-3 py-1">
        <Shield className="w-3.5 h-3.5" />
        {Math.floor(daysLeft / 30)}mo left
      </Badge>
    );
  }

  return (
    <Badge className="bg-emerald-50 text-emerald-700 border border-emerald-200 hover:bg-emerald-50 gap-1.5 font-medium px-3 py-1">
      <ShieldCheck className="w-3.5 h-3.5" />
      Active
    </Badge>
  );
}