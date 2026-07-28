import React, { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Trash2, LogOut, Bell, BellOff, Loader2 } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { deleteAccount } from '@/api/account';
import { isPushSupported, isPushEnabled, enablePush, disablePush } from '@/lib/push';
import { toast } from 'sonner';

export default function SettingsModal({ open, onClose }) {
  const { logout, user } = useAuth();
  const [deleting, setDeleting] = useState(false);
  const [pushSupported] = useState(() => isPushSupported());
  const [pushOn, setPushOn] = useState(false);
  const [pushBusy, setPushBusy] = useState(false);

  useEffect(() => {
    if (open && pushSupported) {
      isPushEnabled().then(setPushOn);
    }
  }, [open, pushSupported]);

  const togglePush = async () => {
    setPushBusy(true);
    try {
      if (pushOn) {
        await disablePush();
        setPushOn(false);
        toast.success('Reminders turned off.');
      } else {
        await enablePush();
        setPushOn(true);
        toast.success("You're set. We'll nudge you before a warranty expires.");
      }
    } catch (err) {
      if (err?.message === 'permission-denied') {
        toast.error('Notifications are blocked for Warraya. Allow them in your browser settings and try again.');
      } else {
        toast.error("Couldn't update reminders. Please try again.");
      }
    } finally {
      setPushBusy(false);
    }
  };

  const handleDeleteAccount = async () => {
    setDeleting(true);
    try {
      await deleteAccount();
      toast.success('Your account and data have been deleted.');
      setTimeout(() => logout(), 1200);
    } catch {
      toast.error("We couldn't delete your account. Please contact support.");
      setDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>Settings</DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-2">
          {user && (
            <div className="p-3 bg-secondary rounded-xl text-sm">
              <p className="text-muted-foreground text-xs">Signed in as</p>
              <p className="font-medium truncate">{user.email}</p>
            </div>
          )}

          {pushSupported && (
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">Warranty Reminders</p>
              <Button
                variant="outline"
                className="w-full gap-2 justify-start"
                onClick={togglePush}
                disabled={pushBusy}
              >
                {pushBusy ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : pushOn ? (
                  <BellOff className="w-4 h-4" />
                ) : (
                  <Bell className="w-4 h-4" />
                )}
                {pushOn ? 'Turn Off Reminders' : 'Turn On Reminders'}
              </Button>
              <p className="text-xs text-muted-foreground">
                We notify you 30 days and 7 days before a warranty expires. On iPhone, add Warraya to your Home Screen first.
              </p>
            </div>
          )}

          <Button
            variant="outline"
            className="w-full gap-2 justify-start"
            onClick={() => logout()}
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </Button>

          <div className="border-t pt-4">
            <p className="text-xs text-muted-foreground mb-3">Danger Zone</p>
            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="destructive" className="w-full gap-2" disabled={deleting}>
                  <Trash2 className="w-4 h-4" />
                  Delete Account &amp; Data
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>Delete your account?</AlertDialogTitle>
                  <AlertDialogDescription>
                    Every warranty, receipt, and all account data will be permanently removed. This cannot be undone.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={handleDeleteAccount}
                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                  >
                    Delete Everything
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
