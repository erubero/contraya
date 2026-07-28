import React, { lazy, Suspense, useState } from 'react';
import { createWarranty, uploadReceipt, extractReceipt } from '@/api/warranties';
import { useAuth } from '@/lib/AuthContext';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Camera, FileText, Loader2, Upload, X } from "lucide-react";
import { Link } from "react-router-dom";
import { toast } from "sonner";
import { addMonths, format } from "date-fns";
import { usePageTitle } from '@/lib/usePageTitle';

// Loaded on demand so the Lottie player stays out of the main bundle.
const LottieLoader = lazy(() => import('@/components/LottieLoader'));

const CATEGORIES = [
  { value: "electronics", label: "Electronics" },
  { value: "appliances", label: "Appliances" },
  { value: "furniture", label: "Furniture" },
  { value: "automotive", label: "Automotive" },
  { value: "clothing", label: "Clothing" },
  { value: "tools", label: "Tools" },
  { value: "sports", label: "Sports" },
  { value: "jewelry", label: "Jewelry" },
  { value: "other", label: "Other" },
];

const WARRANTY_TYPES = [
  { value: "manufacturer", label: "Manufacturer" },
  { value: "extended", label: "Extended" },
  { value: "store", label: "Store" },
  { value: "other", label: "Other" },
];

export default function AddWarranty() {
  usePageTitle('Add Warranty');
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { user } = useAuth();
  const [mode, setMode] = useState('scan');
  const [isExtracting, setIsExtracting] = useState(false);
  const [receiptFile, setReceiptFile] = useState(null);

  const [form, setForm] = useState({
    product_name: '',
    brand: '',
    category: '',
    purchase_date: '',
    warranty_duration_months: 12,
    warranty_end_date: '',
    purchase_price: '',
    store: '',
    serial_number: '',
    notes: '',
    warranty_type: 'manufacturer',
  });

  const createMutation = useMutation({
    mutationFn: async ({ data, file }) => {
      const receipt_path = file ? await uploadReceipt(file, user.id) : null;
      return createWarranty({ ...data, receipt_path });
    },
    onMutate: async ({ data }) => {
      await queryClient.cancelQueries({ queryKey: ['warranties'] });
      const previous = queryClient.getQueryData(['warranties']);
      const optimistic = { ...data, id: `optimistic-${Date.now()}`, created_at: new Date().toISOString() };
      queryClient.setQueryData(['warranties'], (old = []) => [optimistic, ...old]);
      return { previous };
    },
    onError: (_err, _vars, context) => {
      queryClient.setQueryData(['warranties'], context.previous);
      toast.error("Couldn't save your warranty. Please try again.");
    },
    onSuccess: () => {
      toast.success('Saved. Your warranty is protected.');
      navigate('/dashboard');
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ['warranties'] });
    },
  });

  const applyExtractedFields = (extracted, updated) => {
    if (extracted.product_name) updated.product_name = extracted.product_name;
    if (extracted.brand) updated.brand = extracted.brand;
    if (extracted.purchase_date) updated.purchase_date = extracted.purchase_date;
    if (extracted.purchase_price) updated.purchase_price = extracted.purchase_price;
    if (extracted.store) updated.store = extracted.store;
    if (extracted.serial_number) updated.serial_number = extracted.serial_number;
    if (extracted.warranty_duration_months) updated.warranty_duration_months = extracted.warranty_duration_months;
    if (extracted.category) updated.category = extracted.category;

    if (updated.purchase_date && updated.warranty_duration_months) {
      const endDate = addMonths(new Date(updated.purchase_date), Number(updated.warranty_duration_months));
      updated.warranty_end_date = format(endDate, 'yyyy-MM-dd');
    }
    return updated;
  };

  const handleChange = (field, value) => {
    const updated = { ...form, [field]: value };

    // Auto-calculate end date when purchase date or duration changes
    if ((field === 'purchase_date' || field === 'warranty_duration_months') && updated.purchase_date && updated.warranty_duration_months) {
      const endDate = addMonths(new Date(updated.purchase_date), Number(updated.warranty_duration_months));
      updated.warranty_end_date = format(endDate, 'yyyy-MM-dd');
    }

    setForm(updated);
  };

  const handleScanFile = async (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please use a photo of the receipt for scanning.');
      return;
    }

    setReceiptFile(file);
    setIsExtracting(true);
    try {
      const extracted = await extractReceipt(file);
      setForm((prev) => applyExtractedFields(extracted, { ...prev }));
      toast.success('Got it. Review the details below and save when ready.');
    } catch (err) {
      if (err?.message === 'image-too-large') {
        toast.error('That photo is too large. Please use one under 5 MB.');
      } else {
        toast.error("We couldn't read this receipt. Please enter the details yourself.");
      }
    } finally {
      setIsExtracting(false);
    }
  };

  const handleAttachFile = (e) => {
    const file = e.target.files[0];
    e.target.value = '';
    if (!file) return;

    if (!file.type.startsWith('image/') && file.type !== 'application/pdf') {
      toast.error('Receipts can be an image or a PDF.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('That file is too large. Please use one under 10 MB.');
      return;
    }
    setReceiptFile(file);
  };

  const handleSubmit = (e) => {
    e.preventDefault();

    if (!form.product_name || !form.purchase_date || !form.warranty_end_date) {
      toast.error('Please add a product name, purchase date, and warranty end date to continue.');
      return;
    }

    if (form.warranty_end_date < form.purchase_date) {
      toast.error('The warranty end date has to be after the purchase date.');
      return;
    }

    const data = {
      product_name: form.product_name,
      brand: form.brand || null,
      category: form.category || null,
      purchase_date: form.purchase_date,
      warranty_end_date: form.warranty_end_date,
      warranty_duration_months: form.warranty_duration_months ? Number(form.warranty_duration_months) : null,
      purchase_price: form.purchase_price ? Number(form.purchase_price) : null,
      store: form.store || null,
      serial_number: form.serial_number || null,
      notes: form.notes || null,
      warranty_type: form.warranty_type,
    };

    createMutation.mutate({ data, file: receiptFile });
  };

  return (
    <div className="space-y-6">
      <div>
        <p className="text-muted-foreground text-sm">Snap a receipt or enter the details yourself.</p>
      </div>

      <Tabs value={mode} onValueChange={setMode}>
        <TabsList className="w-full">
          <TabsTrigger value="scan" className="flex-1 gap-2">
            <Camera className="w-4 h-4" />
            Scan Receipt
          </TabsTrigger>
          <TabsTrigger value="manual" className="flex-1 gap-2">
            <FileText className="w-4 h-4" />
            Manual Entry
          </TabsTrigger>
        </TabsList>

        <TabsContent value="scan" className="mt-4 space-y-3">
          {isExtracting ? (
            <Card className="border-2 border-dashed p-8 text-center">
              <div className="flex flex-col items-center gap-3">
                <Suspense fallback={<Loader2 className="w-8 h-8 animate-spin text-primary" />}>
                  <LottieLoader className="w-40 h-40" />
                </Suspense>
                <p className="font-medium">Reading your receipt</p>
                <p className="text-sm text-muted-foreground">Just a moment.</p>
              </div>
            </Card>
          ) : (
            <>
              <label className="cursor-pointer block">
                <Card className="border-2 border-dashed p-6 text-center hover:border-primary/40 hover:bg-accent/30 transition-all">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 bg-accent rounded-2xl flex items-center justify-center">
                      <Camera className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">Take a Photo</p>
                      <p className="text-sm text-muted-foreground mt-0.5">Capture a receipt or warranty card with your camera.</p>
                    </div>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    capture="environment"
                    className="hidden"
                    onChange={handleScanFile}
                  />
                </Card>
              </label>

              <label className="cursor-pointer block">
                <Card className="border-2 border-dashed p-6 text-center hover:border-primary/40 hover:bg-accent/30 transition-all">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-14 h-14 bg-accent rounded-2xl flex items-center justify-center">
                      <Upload className="w-7 h-7 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold">
                        {receiptFile && mode === 'scan' ? `✓ ${receiptFile.name}` : 'Upload from Device'}
                      </p>
                      <p className="text-sm text-muted-foreground mt-0.5">Choose a photo of the receipt from your files.</p>
                    </div>
                  </div>
                  <input
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleScanFile}
                  />
                </Card>
              </label>
            </>
          )}

          {receiptFile && !isExtracting && (
            <p className="text-sm text-center text-emerald-600 font-medium">✓ Captured from {receiptFile.name}</p>
          )}
        </TabsContent>

        <TabsContent value="manual" className="mt-4">
          {/* Empty - form is always shown below */}
        </TabsContent>
      </Tabs>

      <form onSubmit={handleSubmit} className="space-y-5">
        <Card className="p-5 space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Product Info</h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label>Product Name *</Label>
              <Input
                placeholder="e.g. MacBook Pro 14 inch"
                value={form.product_name}
                onChange={(e) => handleChange('product_name', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Brand</Label>
              <Input
                placeholder="e.g. Apple"
                value={form.brand}
                onChange={(e) => handleChange('brand', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Category</Label>
              <Select value={form.category} onValueChange={(v) => handleChange('category', v)}>
                <SelectTrigger><SelectValue placeholder="Select category" /></SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map(c => (
                    <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Serial Number</Label>
              <Input
                placeholder="Optional"
                value={form.serial_number}
                onChange={(e) => handleChange('serial_number', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Purchase Price</Label>
              <Input
                type="number"
                step="0.01"
                placeholder="0.00"
                value={form.purchase_price}
                onChange={(e) => handleChange('purchase_price', e.target.value)}
              />
            </div>
          </div>
        </Card>

        <Card className="p-5 space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Warranty Details</h3>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Purchase Date *</Label>
              <Input
                type="date"
                value={form.purchase_date}
                onChange={(e) => handleChange('purchase_date', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Store</Label>
              <Input
                placeholder="e.g. Best Buy"
                value={form.store}
                onChange={(e) => handleChange('store', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Warranty Duration (months)</Label>
              <Input
                type="number"
                value={form.warranty_duration_months}
                onChange={(e) => handleChange('warranty_duration_months', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Warranty End Date *</Label>
              <Input
                type="date"
                value={form.warranty_end_date}
                onChange={(e) => handleChange('warranty_end_date', e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>Warranty Type</Label>
              <Select value={form.warranty_type} onValueChange={(v) => handleChange('warranty_type', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {WARRANTY_TYPES.map(t => (
                    <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </Card>

        {mode === 'manual' && (
          <Card className="p-5 space-y-4">
            <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Receipt (Optional)</h3>
            {receiptFile ? (
              <div className="flex items-center justify-between gap-3 rounded-xl border p-3">
                <p className="text-sm font-medium truncate">{receiptFile.name}</p>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="flex-shrink-0 text-muted-foreground"
                  onClick={() => setReceiptFile(null)}
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            ) : (
              <label className="cursor-pointer block">
                <div className="border-2 border-dashed rounded-xl p-6 text-center hover:border-primary/40 hover:bg-accent/30 transition-all">
                  <div className="flex flex-col items-center gap-3">
                    <div className="w-12 h-12 bg-accent rounded-2xl flex items-center justify-center">
                      <Camera className="w-6 h-6 text-primary" />
                    </div>
                    <div>
                      <p className="font-semibold text-sm">Attach a receipt</p>
                      <p className="text-sm text-muted-foreground mt-0.5">Choose an image or PDF from your files.</p>
                    </div>
                  </div>
                  <input
                    type="file"
                    accept="image/*,.pdf"
                    className="hidden"
                    onChange={handleAttachFile}
                  />
                </div>
              </label>
            )}
          </Card>
        )}

        <Card className="p-5 space-y-4">
          <h3 className="font-semibold text-sm text-muted-foreground uppercase tracking-wider">Notes</h3>
          <Textarea
            placeholder="Anything else worth remembering about this warranty"
            value={form.notes}
            onChange={(e) => handleChange('notes', e.target.value)}
            rows={3}
          />
        </Card>

        <div className="flex gap-3 justify-end">
          <Link to="/dashboard">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={createMutation.isPending} className="gap-2 min-w-32">
            {createMutation.isPending ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              'Save Warranty'
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
