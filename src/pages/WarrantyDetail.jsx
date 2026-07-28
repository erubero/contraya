import React from 'react';
import { getWarranty, deleteWarranty, getReceiptUrl } from '@/api/warranties';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel,
  AlertDialogContent, AlertDialogDescription, AlertDialogFooter,
  AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger
} from "@/components/ui/alert-dialog";
import {
  Calendar, Store, DollarSign, Hash, FileText,
  Trash2, Loader2, ExternalLink, Clock
} from "lucide-react";
import { Link } from "react-router-dom";
import { format, differenceInDays } from "date-fns";
import StatusBadge from "../components/warranty/StatusBadge";
import CategoryIcon from "../components/warranty/CategoryIcon";
import { toast } from "sonner";
import { usePageTitle } from '@/lib/usePageTitle';

export default function WarrantyDetail() {
  usePageTitle('Warranty Details');
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const { data: warranty, isLoading } = useQuery({
    queryKey: ['warranty', id],
    queryFn: () => getWarranty(id),
    retry: false,
  });

  const { data: receiptUrl } = useQuery({
    queryKey: ['receipt-url', warranty?.receipt_path],
    queryFn: () => getReceiptUrl(warranty.receipt_path),
    enabled: !!warranty?.receipt_path,
  });

  const deleteMutation = useMutation({
    mutationFn: () => deleteWarranty(warranty),
    onMutate: async () => {
      await queryClient.cancelQueries({ queryKey: ['warranties'] });
      const previous = queryClient.getQueryData(['warranties']);
      queryClient.setQueryData(['warranties'], (old = []) => old.filter(w => w.id !== id));
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['warranties'], context.previous);
      toast.error("Couldn't delete this warranty. Please try again.");
    },
    onSuccess: () => {
      queryClient.removeQueries({ queryKey: ['warranty', id] });
      toast.success('Warranty removed.');
      navigate('/dashboard');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['warranties'] });
    },
  });

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-32">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!warranty) {
    return (
      <div className="text-center py-32">
        <p className="text-muted-foreground">We couldn't find this warranty.</p>
        <Link to="/dashboard">
          <Button variant="link" className="mt-2">Back to your vault</Button>
        </Link>
      </div>
    );
  }

  const daysLeft = differenceInDays(new Date(warranty.warranty_end_date), new Date());

  const warrantyTypeLabels = {
    manufacturer: "Manufacturer",
    extended: "Extended",
    store: "Store",
    other: "Other",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div />
        
        <AlertDialog>
          <AlertDialogTrigger asChild>
            <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive">
              <Trash2 className="w-5 h-5" />
            </Button>
          </AlertDialogTrigger>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete this warranty?</AlertDialogTitle>
              <AlertDialogDescription>
                "{warranty.product_name}" will be removed from your vault. This cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={() => deleteMutation.mutate()}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </div>

      {/* Product Header */}
      <Card className="p-6">
        <div className="flex items-start gap-4">
          <CategoryIcon category={warranty.category} size="lg" />
          <div className="flex-1">
            <div className="flex items-start justify-between gap-3 flex-wrap">
              <div>
                <h2 className="text-xl font-bold">{warranty.product_name}</h2>
                {warranty.brand && (
                  <p className="text-muted-foreground">{warranty.brand}</p>
                )}
              </div>
              <StatusBadge endDate={warranty.warranty_end_date} />
            </div>

            {/* Progress bar */}
            {daysLeft >= 0 && warranty.warranty_duration_months && (
              <div className="mt-4">
                <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                  <span>{format(new Date(warranty.purchase_date), "MMM d, yyyy")}</span>
                  <span>{format(new Date(warranty.warranty_end_date), "MMM d, yyyy")}</span>
                </div>
                <div className="h-2 bg-secondary rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      daysLeft <= 30 ? 'bg-amber-500' : 'bg-emerald-500'
                    }`}
                    style={{
                      width: `${Math.max(0, Math.min(100, 
                        ((warranty.warranty_duration_months * 30 - daysLeft) / (warranty.warranty_duration_months * 30)) * 100
                      ))}%`
                    }}
                  />
                </div>
                <p className="text-xs text-muted-foreground mt-1.5 text-center">
                  {daysLeft} day{daysLeft !== 1 ? 's' : ''} of coverage left
                </p>
              </div>
            )}
          </div>
        </div>
      </Card>

      {/* Details Grid */}
      <div className="grid gap-3 sm:grid-cols-2">
        <DetailCard icon={Calendar} label="Purchase Date" value={format(new Date(warranty.purchase_date), "MMMM d, yyyy")} />
        <DetailCard icon={Clock} label="Warranty Expires" value={format(new Date(warranty.warranty_end_date), "MMMM d, yyyy")} />
        {warranty.store && <DetailCard icon={Store} label="Store" value={warranty.store} />}
        {warranty.purchase_price && <DetailCard icon={DollarSign} label="Purchase Price" value={`$${warranty.purchase_price.toFixed(2)}`} />}
        {warranty.serial_number && <DetailCard icon={Hash} label="Serial Number" value={warranty.serial_number} />}
        {warranty.warranty_type && (
          <DetailCard icon={FileText} label="Warranty Type" value={warrantyTypeLabels[warranty.warranty_type] || warranty.warranty_type} />
        )}
      </div>

      {/* Notes */}
      {warranty.notes && (
        <Card className="p-5">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-2">Notes</h3>
          <p className="text-foreground">{warranty.notes}</p>
        </Card>
      )}

      {/* Receipt */}
      {warranty.receipt_path && (
        <Card className="p-5">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider mb-3">Receipt</h3>
          {receiptUrl ? (
            <a
              href={receiptUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 text-primary hover:underline"
            >
              <ExternalLink className="w-4 h-4" />
              View receipt
            </a>
          ) : (
            <p className="text-sm text-muted-foreground">Loading receipt…</p>
          )}
        </Card>
      )}
    </div>
  );
}

function DetailCard({ icon: Icon, label, value }) {
  return (
    <Card className="p-4 flex items-center gap-3">
      <div className="w-10 h-10 bg-secondary rounded-xl flex items-center justify-center flex-shrink-0">
        <Icon className="w-5 h-5 text-muted-foreground" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground">{label}</p>
        <p className="font-medium">{value}</p>
      </div>
    </Card>
  );
}