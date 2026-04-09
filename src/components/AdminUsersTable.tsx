import { useState, useMemo } from 'react';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from './ui/table';
import { Badge } from './ui/badge';
import { Button } from './ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui/dropdown-menu';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from './ui/dialog';
import { Input } from './ui/input';
import { Label } from './ui/label';
import { MoreVertical, Edit, Trash2, Ban, CheckCircle, Mail } from 'lucide-react';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';

interface User {
  id: string;
  name: string;
  email: string;
  status: 'active' | 'inactive' | 'banned';
  plan: string;
  registeredDate: string;
  lastActive: string;
  projects: number;
}

// Mock data - in production, this would come from your backend/Supabase
const mockUsers: User[] = [
  {
    id: '1',
    name: 'John Doe',
    email: 'john.doe@example.com',
    status: 'active',
    plan: 'Pro',
    registeredDate: '2025-01-15',
    lastActive: '2 hours ago',
    projects: 12
  },
  {
    id: '2',
    name: 'Jane Smith',
    email: 'jane.smith@example.com',
    status: 'active',
    plan: 'Enterprise',
    registeredDate: '2025-02-20',
    lastActive: '1 day ago',
    projects: 24
  },
  {
    id: '3',
    name: 'Bob Wilson',
    email: 'bob.wilson@example.com',
    status: 'inactive',
    plan: 'Free',
    registeredDate: '2024-12-10',
    lastActive: '2 weeks ago',
    projects: 3
  },
  {
    id: '4',
    name: 'Alice Johnson',
    email: 'alice.j@example.com',
    status: 'active',
    plan: 'Pro',
    registeredDate: '2025-03-01',
    lastActive: '5 minutes ago',
    projects: 8
  },
  {
    id: '5',
    name: 'Charlie Brown',
    email: 'charlie.b@example.com',
    status: 'banned',
    plan: 'Free',
    registeredDate: '2024-11-05',
    lastActive: '1 month ago',
    projects: 1
  },
  {
    id: '6',
    name: 'Diana Prince',
    email: 'diana.p@example.com',
    status: 'active',
    plan: 'Enterprise',
    registeredDate: '2025-01-22',
    lastActive: '3 hours ago',
    projects: 31
  },
  {
    id: '7',
    name: 'Ethan Hunt',
    email: 'ethan.h@example.com',
    status: 'active',
    plan: 'Pro',
    registeredDate: '2025-02-14',
    lastActive: '1 hour ago',
    projects: 15
  },
  {
    id: '8',
    name: 'Fiona Gallagher',
    email: 'fiona.g@example.com',
    status: 'inactive',
    plan: 'Free',
    registeredDate: '2024-10-30',
    lastActive: '3 weeks ago',
    projects: 2
  }
];

interface AdminUsersTableProps {
  limit?: number;
  searchQuery?: string;
}

export function AdminUsersTable({ limit, searchQuery = '' }: AdminUsersTableProps) {
  const [users, setUsers] = useState<User[]>(mockUsers);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [planFilter, setPlanFilter] = useState<string>('all');

  const filteredUsers = useMemo(() => {
    let filtered = users;

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (user) =>
          user.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
          user.email.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter((user) => user.status === statusFilter);
    }

    // Apply plan filter
    if (planFilter !== 'all') {
      filtered = filtered.filter((user) => user.plan === planFilter);
    }

    // Apply limit if specified
    if (limit) {
      filtered = filtered.slice(0, limit);
    }

    return filtered;
  }, [users, searchQuery, statusFilter, planFilter, limit]);

  const handleEdit = (user: User) => {
    setEditingUser(user);
    setIsEditDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (editingUser) {
      setUsers(users.map((u) => (u.id === editingUser.id ? editingUser : u)));
      setIsEditDialogOpen(false);
      setEditingUser(null);
    }
  };

  const handleDelete = (userId: string) => {
    if (confirm('Are you sure you want to delete this user?')) {
      setUsers(users.filter((u) => u.id !== userId));
    }
  };

  const handleToggleStatus = (userId: string, newStatus: User['status']) => {
    setUsers(users.map((u) => (u.id === userId ? { ...u, status: newStatus } : u)));
  };

  const getStatusBadge = (status: User['status']) => {
    const variants = {
      active: 'bg-green-100 text-green-700 hover:bg-green-100',

      banned: 'bg-red-100 text-red-700 hover:bg-red-100',
    };

    return (
      <Badge className={variants[status]}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </Badge>
    );
  };

  const getPlanBadge = (plan: string) => {
    const variants: Record<string, string> = {
      Free: 'bg-gray-100 text-gray-700 hover:bg-gray-100',
      Pro: 'bg-blue-100 text-blue-700 hover:bg-blue-100',
      Enterprise: 'bg-purple-100 text-purple-700 hover:bg-purple-100',
    };

    return <Badge className={variants[plan] || variants.Free}>{plan}</Badge>;
  };

  return (
    <div className="space-y-4">
      {/* Filters */}
      {!limit && (
        <div className="flex gap-4">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>

              <SelectItem value="banned">Banned</SelectItem>
            </SelectContent>
          </Select>

          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger className="w-40">
              <SelectValue placeholder="Filter by plan" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Plans</SelectItem>
              <SelectItem value="Free">Free</SelectItem>
              <SelectItem value="Pro">Pro</SelectItem>
              <SelectItem value="Enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>User</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Plan</TableHead>
              <TableHead>Projects</TableHead>
              {!limit && <TableHead>Registered</TableHead>}
              <TableHead>Last Active</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredUsers.length === 0 ? (
              <TableRow>
                <TableCell colSpan={limit ? 6 : 7} className="text-center text-gray-500">
                  No users found
                </TableCell>
              </TableRow>
            ) : (
              filteredUsers.map((user) => (
                <TableRow key={user.id}>
                  <TableCell>
                    <div>
                      <div className="text-gray-900">{user.name}</div>
                      <div className="text-sm text-gray-500">{user.email}</div>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(user.status)}</TableCell>
                  <TableCell>{getPlanBadge(user.plan)}</TableCell>
                  <TableCell>{user.projects}</TableCell>
                  {!limit && <TableCell className="text-gray-600">{user.registeredDate}</TableCell>}
                  <TableCell className="text-gray-600">{user.lastActive}</TableCell>
                  <TableCell className="text-right">
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreVertical className="w-4 h-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuLabel>Actions</DropdownMenuLabel>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleEdit(user)}>
                          <Edit className="w-4 h-4 mr-2" />
                          Edit User
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Mail className="w-4 h-4 mr-2" />
                          Send Email
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        {user.status === 'active' ? (
                          <DropdownMenuItem onClick={() => handleToggleStatus(user.id, 'banned')}>
                            <Ban className="w-4 h-4 mr-2" />
                            Ban User
                          </DropdownMenuItem>
                        ) : (
                          <DropdownMenuItem onClick={() => handleToggleStatus(user.id, 'active')}>
                            <CheckCircle className="w-4 h-4 mr-2" />
                            Activate User
                          </DropdownMenuItem>
                        )}
                        <DropdownMenuItem
                          onClick={() => handleDelete(user.id)}
                          className="text-red-600"
                        >
                          <Trash2 className="w-4 h-4 mr-2" />
                          Delete User
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      {/* Edit Dialog */}
      <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit User</DialogTitle>
            <DialogDescription>Update user information and settings</DialogDescription>
          </DialogHeader>
          {editingUser && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={editingUser.name}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  value={editingUser.email}
                  onChange={(e) =>
                    setEditingUser({ ...editingUser, email: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="plan">Plan</Label>
                <Select
                  value={editingUser.plan}
                  onValueChange={(value) =>
                    setEditingUser({ ...editingUser, plan: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Free">Free</SelectItem>
                    <SelectItem value="Pro">Pro</SelectItem>
                    <SelectItem value="Enterprise">Enterprise</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="status">Status</Label>
                <Select
                  value={editingUser.status}
                  onValueChange={(value) =>
                    setEditingUser({ ...editingUser, status: value as User['status'] })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>

                    <SelectItem value="banned">Banned</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSaveEdit}>Save Changes</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
