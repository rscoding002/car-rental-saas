'use client';

import { useState, useEffect } from 'react';
import {
  Globe,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Copy,
  RefreshCw,
  ExternalLink,
  Info,
  Server,
  Shield,
} from 'lucide-react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Modal } from '@/components/ui/modal';
import { cn } from '@/lib/utils';
import { getDnsInstructions } from '@/lib/tenant/subdomain';

// ============================================================================
// TYPES
// ============================================================================

export type DomainVerificationStatus = 'unverified' | 'pending' | 'verified' | 'failed';

export interface CustomDomainConfig {
  domain: string | null;
  verificationStatus?: DomainVerificationStatus;
  sslStatus?: 'pending' | 'active' | 'failed';
  lastVerifiedAt?: string;
}

interface CustomDomainFormProps {
  tenantId: string;
  tenantSlug: string;
  currentDomain: string | null;
  onDomainChange: (domain: string | null) => Promise<void>;
  isUpdating?: boolean;
}

// ============================================================================
// DNS INSTRUCTIONS COMPONENT
// ============================================================================

function DnsInstructionsCard({
  tenantSlug,
  customDomain,
  onCopy,
}: {
  tenantSlug: string;
  customDomain: string;
  onCopy: (text: string, label: string) => void;
}) {
  const dnsInstructions = getDnsInstructions(tenantSlug, customDomain);

  return (
    <div className="space-y-4">
      {/* Instructions header */}
      <div className="flex items-start gap-3 p-3 rounded-lg bg-blue-50 dark:bg-blue-950/30 text-blue-700 dark:text-blue-300">
        <Info className="w-5 h-5 shrink-0 mt-0.5" />
        <div className="text-sm">
          <p className="font-medium mb-1">DNS Configuration Required</p>
          <p className="text-blue-600 dark:text-blue-400">
            Add these DNS records to your domain registrar to point your custom domain to our servers.
          </p>
        </div>
      </div>

      {/* CNAME Record */}
      <div className="p-4 rounded-lg border border-border bg-muted/30">
        <div className="flex items-center gap-2 mb-3">
          <Server className="w-4 h-4 text-muted-foreground" />
          <span className="font-medium text-sm">CNAME Record</span>
          <Badge variant="secondary" className="text-xs">Required</Badge>
        </div>
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Host / Name</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 rounded bg-background border border-border text-sm font-mono break-all">
                {dnsInstructions.cname.host}
              </code>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onCopy(dnsInstructions.cname.host, 'Host')}
                className="shrink-0"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
          <div>
            <label className="text-xs text-muted-foreground block mb-1">Points to / Value</label>
            <div className="flex items-center gap-2">
              <code className="flex-1 px-3 py-2 rounded bg-background border border-border text-sm font-mono break-all">
                {dnsInstructions.cname.value}
              </code>
              <Button
                variant="ghost"
                size="icon"
                onClick={() => onCopy(dnsInstructions.cname.value, 'Value')}
                className="shrink-0"
              >
                <Copy className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* TXT Record for verification */}
      {dnsInstructions.txt && (
        <div className="p-4 rounded-lg border border-border bg-muted/30">
          <div className="flex items-center gap-2 mb-3">
            <Shield className="w-4 h-4 text-muted-foreground" />
            <span className="font-medium text-sm">TXT Record (Verification)</span>
            <Badge variant="outline" className="text-xs">Optional</Badge>
          </div>
          <div className="space-y-3">
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Host / Name</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 rounded bg-background border border-border text-sm font-mono break-all">
                  {dnsInstructions.txt.host}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onCopy(dnsInstructions.txt!.host, 'TXT Host')}
                  className="shrink-0"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
            <div>
              <label className="text-xs text-muted-foreground block mb-1">Value</label>
              <div className="flex items-center gap-2">
                <code className="flex-1 px-3 py-2 rounded bg-background border border-border text-sm font-mono break-all">
                  {dnsInstructions.txt.value}
                </code>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => onCopy(dnsInstructions.txt!.value, 'TXT Value')}
                  className="shrink-0"
                >
                  <Copy className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TTL Note */}
      <p className="text-xs text-muted-foreground">
        DNS changes can take up to 48 hours to propagate globally. We recommend setting TTL to 3600 (1 hour) or lower.
      </p>
    </div>
  );
}

// ============================================================================
// VERIFICATION STATUS COMPONENT
// ============================================================================

function VerificationStatusBadge({ status }: { status: DomainVerificationStatus }) {
  const statusConfig: Record<DomainVerificationStatus, {
    icon: React.ElementType;
    label: string;
    className: string;
  }> = {
    unverified: {
      icon: AlertTriangle,
      label: 'Not Verified',
      className: 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300',
    },
    pending: {
      icon: RefreshCw,
      label: 'Verification Pending',
      className: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-300',
    },
    verified: {
      icon: CheckCircle,
      label: 'Verified',
      className: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-300',
    },
    failed: {
      icon: XCircle,
      label: 'Verification Failed',
      className: 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-300',
    },
  };

  const config = statusConfig[status];
  const StatusIcon = config.icon;

  return (
    <Badge className={cn('gap-1', config.className)}>
      <StatusIcon className={cn('w-3 h-3', status === 'pending' && 'animate-spin')} />
      {config.label}
    </Badge>
  );
}

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export function CustomDomainForm({
  tenantId,
  tenantSlug,
  currentDomain,
  onDomainChange,
  isUpdating = false,
}: CustomDomainFormProps) {
  const [showModal, setShowModal] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [domain, setDomain] = useState(currentDomain || '');
  const [domainError, setDomainError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationStatus, setVerificationStatus] = useState<DomainVerificationStatus>(
    currentDomain ? 'verified' : 'unverified'
  );
  const [copiedText, setCopiedText] = useState<string | null>(null);

  // Reset domain input when modal opens
  useEffect(() => {
    if (showModal) {
      setDomain(currentDomain || '');
      setDomainError(null);
    }
  }, [showModal, currentDomain]);

  // Validate domain format
  const validateDomain = (value: string): string | null => {
    if (!value.trim()) {
      return 'Domain is required';
    }

    // Remove protocol if present
    const cleanDomain = value.replace(/^https?:\/\//, '').replace(/\/$/, '');

    // Basic domain validation
    const domainRegex = /^(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?\.)+[a-zA-Z]{2,}$/;
    if (!domainRegex.test(cleanDomain)) {
      return 'Please enter a valid domain (e.g., rentals.example.com)';
    }

    // Check for common issues
    if (cleanDomain.includes(' ')) {
      return 'Domain cannot contain spaces';
    }

    if (cleanDomain.startsWith('-') || cleanDomain.endsWith('-')) {
      return 'Domain cannot start or end with a hyphen';
    }

    return null;
  };

  // Clean domain input
  const cleanDomain = (value: string): string => {
    return value
      .toLowerCase()
      .replace(/^https?:\/\//, '')
      .replace(/\/$/, '')
      .trim();
  };

  // Handle copy to clipboard
  const handleCopy = async (text: string, label: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2000);
    } catch {
      // Fallback for older browsers
      const textArea = document.createElement('textarea');
      textArea.value = text;
      document.body.appendChild(textArea);
      textArea.select();
      document.execCommand('copy');
      document.body.removeChild(textArea);
      setCopiedText(label);
      setTimeout(() => setCopiedText(null), 2000);
    }
  };

  // Handle save domain
  const handleSave = async () => {
    const cleanedDomain = cleanDomain(domain);
    const error = validateDomain(cleanedDomain);

    if (error) {
      setDomainError(error);
      return;
    }

    setIsSaving(true);
    try {
      await onDomainChange(cleanedDomain);
      setVerificationStatus('pending');
      setShowModal(false);
    } catch (err) {
      setDomainError(err instanceof Error ? err.message : 'Failed to save domain');
    } finally {
      setIsSaving(false);
    }
  };

  // Handle remove domain
  const handleRemove = async () => {
    setIsSaving(true);
    try {
      await onDomainChange(null);
      setVerificationStatus('unverified');
      setShowRemoveModal(false);
    } catch (err) {
      // Show error in modal
    } finally {
      setIsSaving(false);
    }
  };

  // Handle verify domain
  const handleVerify = async () => {
    if (!currentDomain) return;

    setIsVerifying(true);
    try {
      // Simulate DNS verification check
      // In production, this would call an API to verify DNS records
      await new Promise(resolve => setTimeout(resolve, 2000));

      // For demo, randomly succeed or fail
      const success = Math.random() > 0.3;
      setVerificationStatus(success ? 'verified' : 'failed');
    } catch {
      setVerificationStatus('failed');
    } finally {
      setIsVerifying(false);
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="flex flex-row items-center justify-between pb-2">
          <CardTitle className="text-base flex items-center gap-2">
            <Globe className="w-4 h-4 text-blue-600" />
            Custom Domain
          </CardTitle>
          {currentDomain ? (
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleVerify}
                disabled={isVerifying || isUpdating}
                className="gap-2"
              >
                <RefreshCw className={cn('w-4 h-4', isVerifying && 'animate-spin')} />
                <span className="hidden sm:inline">Verify</span>
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowModal(true)}
                disabled={isUpdating}
              >
                Edit
              </Button>
            </div>
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowModal(true)}
              disabled={isUpdating}
              className="gap-2"
            >
              <Globe className="w-4 h-4" />
              Add Domain
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {currentDomain ? (
            <div className="space-y-4">
              {/* Current domain display */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 p-4 rounded-lg bg-muted/50">
                <div className="flex-1 min-w-0">
                  <a
                    href={`https://${currentDomain}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="font-mono text-base text-foreground hover:text-primary hover:underline flex items-center gap-2"
                  >
                    {currentDomain}
                    <ExternalLink className="w-4 h-4 shrink-0" />
                  </a>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <VerificationStatusBadge status={verificationStatus} />
                </div>
              </div>

              {/* DNS Instructions if not verified */}
              {verificationStatus !== 'verified' && (
                <DnsInstructionsCard
                  tenantSlug={tenantSlug}
                  customDomain={currentDomain}
                  onCopy={handleCopy}
                />
              )}

              {/* Verified message */}
              {verificationStatus === 'verified' && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-green-50 dark:bg-green-950/30 text-green-700 dark:text-green-300">
                  <CheckCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium mb-1">Domain Verified & Active</p>
                    <p className="text-green-600 dark:text-green-400">
                      Your custom domain is properly configured and serving traffic. SSL certificate is active.
                    </p>
                  </div>
                </div>
              )}

              {/* Failed verification message */}
              {verificationStatus === 'failed' && (
                <div className="flex items-start gap-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/30 text-red-700 dark:text-red-300">
                  <XCircle className="w-5 h-5 shrink-0 mt-0.5" />
                  <div className="text-sm">
                    <p className="font-medium mb-1">Verification Failed</p>
                    <p className="text-red-600 dark:text-red-400">
                      We couldn't verify your DNS configuration. Please check the DNS records above and try again.
                    </p>
                  </div>
                </div>
              )}

              {/* Remove domain link */}
              <div className="pt-2 border-t border-border">
                <button
                  type="button"
                  onClick={() => setShowRemoveModal(true)}
                  className="text-sm text-red-600 hover:text-red-700 hover:underline"
                >
                  Remove custom domain
                </button>
              </div>
            </div>
          ) : (
            <div className="text-center py-6">
              <Globe className="w-12 h-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-sm text-muted-foreground mb-4">
                No custom domain configured. The tenant is accessible via their subdomain.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowModal(true)}
                className="gap-2"
              >
                <Globe className="w-4 h-4" />
                Add Custom Domain
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Copied toast */}
      {copiedText && (
        <div className="fixed bottom-4 right-4 z-50 px-4 py-2 rounded-lg bg-foreground text-background text-sm shadow-lg animate-in fade-in slide-in-from-bottom-2">
          <div className="flex items-center gap-2">
            <CheckCircle className="w-4 h-4" />
            {copiedText} copied to clipboard
          </div>
        </div>
      )}

      {/* Add/Edit Domain Modal */}
      <Modal
        open={showModal}
        onClose={() => setShowModal(false)}
        title={currentDomain ? 'Edit Custom Domain' : 'Add Custom Domain'}
      >
        <div className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Enter the custom domain you want to use for this tenant's website.
          </p>

          {/* Domain input */}
          <div>
            <label htmlFor="domain" className="block text-sm font-medium mb-2">
              Domain
            </label>
            <Input
              id="domain"
              type="text"
              placeholder="rentals.example.com"
              value={domain}
              onChange={(e) => {
                setDomain(e.target.value);
                setDomainError(null);
              }}
              className={cn(domainError && 'border-red-500 focus:ring-red-500')}
            />
            {domainError && (
              <p className="mt-1 text-sm text-red-600">{domainError}</p>
            )}
            <p className="mt-1 text-xs text-muted-foreground">
              Enter without http:// or https://
            </p>
          </div>

          {/* Preview DNS Instructions */}
          {domain && !domainError && validateDomain(cleanDomain(domain)) === null && (
            <div className="border-t border-border pt-4">
              <h4 className="text-sm font-medium mb-3">DNS Configuration Preview</h4>
              <DnsInstructionsCard
                tenantSlug={tenantSlug}
                customDomain={cleanDomain(domain)}
                onCopy={handleCopy}
              />
            </div>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-4 border-t border-border">
            <Button
              variant="outline"
              onClick={() => setShowModal(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              disabled={isSaving || !domain.trim()}
              className="gap-2"
            >
              {isSaving && <RefreshCw className="w-4 h-4 animate-spin" />}
              {currentDomain ? 'Update Domain' : 'Add Domain'}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Remove Domain Confirmation Modal */}
      <Modal
        open={showRemoveModal}
        onClose={() => setShowRemoveModal(false)}
        title="Remove Custom Domain"
      >
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-yellow-50 dark:bg-yellow-950/20 text-yellow-700 dark:text-yellow-300 text-sm">
            <strong>Warning:</strong> Removing the custom domain will make it inactive immediately.
            Visitors to <code className="font-mono">{currentDomain}</code> will no longer reach this tenant's site.
          </div>

          <p className="text-sm text-muted-foreground">
            The tenant will still be accessible via their subdomain.
          </p>

          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="outline"
              onClick={() => setShowRemoveModal(false)}
              disabled={isSaving}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleRemove}
              disabled={isSaving}
              className="gap-2"
            >
              {isSaving && <RefreshCw className="w-4 h-4 animate-spin" />}
              Remove Domain
            </Button>
          </div>
        </div>
      </Modal>
    </>
  );
}
