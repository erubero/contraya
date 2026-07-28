import React from 'react';
import { Card } from "@/components/ui/card";
import { format, differenceInDays } from "date-fns";
import { ChevronRight, Store, DollarSign } from "lucide-react";
import { Link } from "react-router-dom";
import StatusBadge from "./StatusBadge";
import CategoryIcon from "./CategoryIcon";

export default function WarrantyCard({ warranty }) {
  const daysLeft = differenceInDays(new Date(warranty.warranty_end_date), new Date());
  const isExpired = daysLeft < 0;

  return (
    <Link to={`/warranty/${warranty.id}`}>
      <Card className={`p-4 hover:shadow-md transition-all duration-300 cursor-pointer group border ${
        isExpired ? 'opacity-60 border-border' : 'border-border hover:border-primary/20'
      }`}>
        <div className="flex items-center gap-4">
          <CategoryIcon category={warranty.category} />
          
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between gap-2 mb-1">
              <h3 className={`font-semibold truncate ${isExpired ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                {warranty.product_name}
              </h3>
              <StatusBadge endDate={warranty.warranty_end_date} />
            </div>
            
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {warranty.brand && (
                <span className="font-medium">{warranty.brand}</span>
              )}
              {warranty.store && (
                <span className="flex items-center gap-1">
                  <Store className="w-3 h-3" />
                  {warranty.store}
                </span>
              )}
              {warranty.purchase_price && (
                <span className="flex items-center gap-1">
                  <DollarSign className="w-3 h-3" />
                  {warranty.purchase_price.toFixed(2)}
                </span>
              )}
            </div>
            
            <p className="text-xs text-muted-foreground mt-1">
              Expires {format(new Date(warranty.warranty_end_date), "MMM d, yyyy")}
            </p>
          </div>
          
          <ChevronRight className="w-5 h-5 text-muted-foreground/40 group-hover:text-primary transition-colors flex-shrink-0" />
        </div>
      </Card>
    </Link>
  );
}