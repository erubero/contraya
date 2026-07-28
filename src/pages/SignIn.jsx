import React, { useState } from 'react';
import { Link, Navigate, useNavigate } from 'react-router-dom';
import { supabase } from '@/api/supabaseClient';
import { useAuth } from '@/lib/AuthContext';
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { usePageTitle } from '@/lib/usePageTitle';

export default function SignIn() {
  usePageTitle('Sign In');
  const navigate = useNavigate();
  const { isAuthenticated, isLoadingAuth } = useAuth();
  const [step, setStep] = useState('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isLoadingAuth && isAuthenticated) {
    return <Navigate to="/dashboard" replace />;
  }

  const sendCode = async (e) => {
    e.preventDefault();
    if (!email) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.signInWithOtp({ email });
      if (error) throw error;
      setStep('code');
    } catch {
      toast.error("We couldn't send the code. Please check the email and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const verifyCode = async (e) => {
    e.preventDefault();
    if (!code) return;
    setSubmitting(true);
    try {
      const { error } = await supabase.auth.verifyOtp({ email, token: code.trim(), type: 'email' });
      if (error) throw error;
      navigate('/dashboard');
    } catch {
      toast.error("That code didn't work. Please check it and try again.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background text-foreground font-inter flex flex-col">
      <header className="p-4">
        <Link to="/" className="inline-flex items-center gap-2 text-muted-foreground hover:text-foreground transition-colors select-none text-sm">
          <ArrowLeft className="w-4 h-4" />
          Back
        </Link>
      </header>

      <main className="flex-1 flex items-center justify-center px-4 pb-24">
        <Card className="w-full max-w-sm p-6 space-y-6">
          <div className="text-center space-y-2">
            <img
              src="/icons/icon-192.png"
              alt="Warraya"
              className="w-12 h-12 rounded-2xl object-cover mx-auto"
            />
            <h1 className="text-xl font-bold tracking-tight">Sign in to Warraya</h1>
            <p className="text-sm text-muted-foreground">
              {step === 'email'
                ? 'Enter your email and we will send you a six digit code. No password needed.'
                : `We sent a code to ${email}. Enter it below.`}
            </p>
          </div>

          {step === 'email' ? (
            <form onSubmit={sendCode} className="space-y-4">
              <div className="space-y-2">
                <Label>Email</Label>
                <Input
                  type="email"
                  autoComplete="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting || !email}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Send Code'}
              </Button>
            </form>
          ) : (
            <form onSubmit={verifyCode} className="space-y-4">
              <div className="space-y-2">
                <Label>Six digit code</Label>
                <Input
                  inputMode="numeric"
                  autoComplete="one-time-code"
                  placeholder="123456"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                  autoFocus
                />
              </div>
              <Button type="submit" className="w-full" disabled={submitting || !code}>
                {submitting ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify & Sign In'}
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full text-muted-foreground"
                onClick={() => { setStep('email'); setCode(''); }}
              >
                Use a different email
              </Button>
            </form>
          )}
        </Card>
      </main>
    </div>
  );
}
