'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useAuth } from '@/contexts/AuthContext';
import { accountApi } from '@/lib/api';

export default function AccountSettingsPage() {
  const router = useRouter();
  const { token, user } = useAuth();
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
  }, [token, router]);

  const handleDeleteAccount = async () => {
    if (!token) return;

    setDeleteLoading(true);
    setError(null);

    try {
      await accountApi.deleteAccount(token, () => router.push('/login'));
      setSuccessMessage(
        'Account deletion requested. You have 30 days to export your data. Your subscription has been canceled.'
      );
      setDeleteDialogOpen(false);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : 'Failed to request account deletion'
      );
    } finally {
      setDeleteLoading(false);
    }
  };

  if (!user) {
    return (
      <div className="animate-pulse">
        <Card>
          <CardHeader>
            <div className="h-6 bg-secondary rounded w-1/3 mb-2"></div>
            <div className="h-4 bg-secondary rounded w-1/2"></div>
          </CardHeader>
          <CardContent>
            <div className="h-20 bg-secondary rounded"></div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div>
      {error && (
        <Alert variant="destructive" className="mb-6">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {successMessage && (
        <Alert variant="warning" className="mb-6">
          <AlertDescription>{successMessage}</AlertDescription>
        </Alert>
      )}

      <div className="space-y-6">
        {/* Account Information Card */}
        <Card>
          <CardHeader>
            <CardTitle>Account Information</CardTitle>
            <CardDescription>Your account details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div>
                <label
                  htmlFor="email"
                  className="block text-sm font-medium text-gray-700 mb-2"
                >
                  Email Address
                </label>
                <Input
                  id="email"
                  type="email"
                  value={user.email}
                  readOnly
                  className="cursor-not-allowed"
                  disabled
                />
                <p className="text-xs text-gray-500 mt-1">
                  Your email address cannot be changed
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Account Deletion Card */}
        <Card>
          <CardHeader>
            <CardTitle>Account Deletion</CardTitle>
            <CardDescription>
              Permanently delete your account and all associated data
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <Alert variant="destructive">
                <AlertDescription>
                  <strong>Warning:</strong> This action cannot be undone. Once
                  you request account deletion, your account will be permanently
                  deleted after 30 days. During this grace period, you can
                  export your data. Your subscription will be canceled
                  immediately.
                </AlertDescription>
              </Alert>

              <Button
                variant="destructive"
                onClick={() => setDeleteDialogOpen(true)}
                disabled={deleteLoading}
              >
                Delete Account
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Account</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete your account? This action cannot
              be undone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <Alert variant="warning">
              <AlertDescription>
                <div className="space-y-2">
                  <p>
                    <strong>What happens when you delete your account:</strong>
                  </p>
                  <ul className="list-disc list-inside space-y-1 text-sm">
                    <li>
                      Your account will be deleted after a 30-day grace period
                    </li>
                    <li>You can export your data during the grace period</li>
                    <li>Your subscription will be canceled immediately</li>
                    <li>
                      All your data (ESP connections, subscribers, sync history,
                      billing records) will be permanently deleted
                    </li>
                  </ul>
                </div>
              </AlertDescription>
            </Alert>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDeleteDialogOpen(false)}
              disabled={deleteLoading}
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteAccount}
              disabled={deleteLoading}
            >
              {deleteLoading ? 'Deleting...' : 'Delete Account'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
