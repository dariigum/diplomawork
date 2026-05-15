'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Search, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { format } from 'date-fns';

export default function AdminUsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const limit = 50;

  useEffect(() => {
    async function fetchUsers() {
      setIsLoading(true);
      try {
        const url = new URL('/api/admin/users', window.location.origin);
        if (search) url.searchParams.set('search', search);
        url.searchParams.set('page', page.toString());
        url.searchParams.set('limit', limit.toString());
        
        const res = await fetch(url.toString());
        if (res.ok) {
          const data = await res.json();
          setUsers(data.users || []);
          setTotalPages(data.totalPages || 1);
        }
      } catch (error) {
        console.error('Failed to fetch users', error);
      } finally {
        setIsLoading(false);
      }
    }
    
    // Debounce search
    const timeout = setTimeout(fetchUsers, 300);
    return () => clearTimeout(timeout);
  }, [search, page]);

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">User Management</h1>
        <p className="text-muted-foreground">View and manage all registered users.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Users List</CardTitle>
            <div className="flex w-full max-w-sm items-center space-x-2">
              <Input 
                placeholder="Search by name or email..." 
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
              <Button type="button" size="icon" variant="outline">
                <Search className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Registered</TableHead>
                  <TableHead>Activity</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center">
                      <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                    </TableCell>
                  </TableRow>
                ) : users.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="h-24 text-center text-muted-foreground">
                      No users found.
                    </TableCell>
                  </TableRow>
                ) : (
                  users.map((user) => (
                    <TableRow key={user._id}>
                      <TableCell className="font-medium">{user.name}</TableCell>
                      <TableCell>{user.email}</TableCell>
                      <TableCell>
                        <Badge variant={user.role === 'ADMIN' ? 'destructive' : user.role === 'EMPLOYER' ? 'default' : 'secondary'}>
                          {user.role}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {format(new Date(user.createdAt), 'MMM d, yyyy')}
                      </TableCell>
                      <TableCell>
                        {user.role === 'EMPLOYEE' ? (
                          <span className="text-xs text-muted-foreground">{user.applicationsCount} apps</span>
                        ) : user.role === 'EMPLOYER' ? (
                          <span className="text-xs text-muted-foreground">{user.vacanciesCount} jobs</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
        <CardFooter className="flex items-center justify-between">
          <div className="text-sm text-muted-foreground">
            Page {page} of {totalPages === 0 ? 1 : totalPages}
          </div>
          <div className="space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={page <= 1}
            >
              <ChevronLeft className="h-4 w-4 mr-2" />
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={page >= totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </CardFooter>
      </Card>
    </div>
  );
}
