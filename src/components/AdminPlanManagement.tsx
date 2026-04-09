import { useState } from 'react';
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
import { Textarea } from './ui/textarea';
import { MoreVertical, Edit, Trash2, Plus, Check, X } from 'lucide-react';
import { Switch } from './ui/switch';

export interface PlanFeature {
  id: string;
  text: string;
  included: boolean;
}

export interface Plan {
  id: string;
  name: string;
  price: number;
  billingPeriod: 'monthly' | 'yearly' | 'lifetime';
  description: string;
  features: PlanFeature[];
  isPopular: boolean;
  isActive: boolean;
  maxProjects: number;
  maxStorage: string;
  support: string;
  customDomain: boolean;
  exportCode: boolean;
  aiCredits: number;
}

// Default plans - in production this would come from Supabase
export const defaultPlans: Plan[] = [
  {
    id: 'free',
    name: 'Free',
    price: 0,
    billingPeriod: 'monthly',
    description: 'Perfect for getting started',
    features: [
      { id: '1', text: '3 projects', included: true },
      { id: '2', text: '100MB storage', included: true },
      { id: '3', text: 'Basic components', included: true },
      { id: '4', text: 'Community support', included: true },
      { id: '5', text: 'Custom domain', included: false },
      { id: '6', text: 'Export code', included: false },
      { id: '7', text: 'AI assistance', included: false },
      { id: '8', text: 'Priority support', included: false }
    ],
    isPopular: false,
    isActive: true,
    maxProjects: 3,
    maxStorage: '100MB',
    support: 'Community',
    customDomain: false,
    exportCode: false,
    aiCredits: 0
  },
  {
    id: 'pro',
    name: 'Pro',
    price: 29.99,
    billingPeriod: 'monthly',
    description: 'For professional developers',
    features: [
      { id: '1', text: 'Unlimited projects', included: true },
      { id: '2', text: '10GB storage', included: true },
      { id: '3', text: 'All components', included: true },
      { id: '4', text: 'Priority support', included: true },
      { id: '5', text: 'Custom domain', included: true },
      { id: '6', text: 'Export code', included: true },
      { id: '7', text: '1000 AI credits/month', included: true },
      { id: '8', text: 'Advanced analytics', included: true }
    ],
    isPopular: true,
    isActive: true,
    maxProjects: -1,
    maxStorage: '10GB',
    support: 'Priority',
    customDomain: true,
    exportCode: true,
    aiCredits: 1000
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 99.99,
    billingPeriod: 'monthly',
    description: 'For teams and organizations',
    features: [
      { id: '1', text: 'Unlimited projects', included: true },
      { id: '2', text: '100GB storage', included: true },
      { id: '3', text: 'All components', included: true },
      { id: '4', text: '24/7 dedicated support', included: true },
      { id: '5', text: 'Custom domain', included: true },
      { id: '6', text: 'Export code', included: true },
      { id: '7', text: 'Unlimited AI credits', included: true },
      { id: '8', text: 'Team collaboration', included: true }
    ],
    isPopular: false,
    isActive: true,
    maxProjects: -1,
    maxStorage: '100GB',
    support: 'Dedicated 24/7',
    customDomain: true,
    exportCode: true,
    aiCredits: -1
  }
];

interface AdminPlanManagementProps {
  onPlansUpdate?: (plans: Plan[]) => void;
}

export function AdminPlanManagement({ onPlansUpdate }: AdminPlanManagementProps) {
  const [plans, setPlans] = useState<Plan[]>(defaultPlans);
  const [editingPlan, setEditingPlan] = useState<Plan | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false);
  const [editingFeature, setEditingFeature] = useState('');

  const handleEdit = (plan: Plan) => {
    setEditingPlan(plan);
    setIsEditDialogOpen(true);
  };

  const handleCreate = () => {
    const newPlan: Plan = {
      id: Date.now().toString(),
      name: 'New Plan',
      price: 0,
      billingPeriod: 'monthly',
      description: 'Description',
      features: [],
      isPopular: false,
      isActive: true,
      maxProjects: 0,
      maxStorage: '0GB',
      support: 'Community',
      customDomain: false,
      exportCode: false,
      aiCredits: 0
    };
    setEditingPlan(newPlan);
    setIsCreateDialogOpen(true);
  };

  const handleSaveEdit = () => {
    if (editingPlan) {
      const updatedPlans = plans.map((p) => (p.id === editingPlan.id ? editingPlan : p));
      setPlans(updatedPlans);
      setIsEditDialogOpen(false);
      setEditingPlan(null);
      
      // Notify parent component
      if (onPlansUpdate) {
        onPlansUpdate(updatedPlans);
      }
      
      // Save to localStorage for persistence across components
      localStorage.setItem('codecraft-plans', JSON.stringify(updatedPlans));
    }
  };

  const handleSaveCreate = () => {
    if (editingPlan) {
      const updatedPlans = [...plans, editingPlan];
      setPlans(updatedPlans);
      setIsCreateDialogOpen(false);
      setEditingPlan(null);
      
      // Notify parent component
      if (onPlansUpdate) {
        onPlansUpdate(updatedPlans);
      }
      
      // Save to localStorage
      localStorage.setItem('codecraft-plans', JSON.stringify(updatedPlans));
    }
  };

  const handleDelete = (planId: string) => {
    if (confirm('Are you sure you want to delete this plan? Users with this plan will need to be migrated.')) {
      const updatedPlans = plans.filter((p) => p.id !== planId);
      setPlans(updatedPlans);
      
      // Notify parent component
      if (onPlansUpdate) {
        onPlansUpdate(updatedPlans);
      }
      
      // Save to localStorage
      localStorage.setItem('codecraft-plans', JSON.stringify(updatedPlans));
    }
  };

  const handleToggleActive = (planId: string) => {
    const updatedPlans = plans.map((p) =>
      p.id === planId ? { ...p, isActive: !p.isActive } : p
    );
    setPlans(updatedPlans);
    
    // Notify parent component
    if (onPlansUpdate) {
      onPlansUpdate(updatedPlans);
    }
    
    // Save to localStorage
    localStorage.setItem('codecraft-plans', JSON.stringify(updatedPlans));
  };

  const addFeature = () => {
    if (editingPlan && editingFeature.trim()) {
      const newFeature: PlanFeature = {
        id: Date.now().toString(),
        text: editingFeature,
        included: true
      };
      setEditingPlan({
        ...editingPlan,
        features: [...editingPlan.features, newFeature]
      });
      setEditingFeature('');
    }
  };

  const removeFeature = (featureId: string) => {
    if (editingPlan) {
      setEditingPlan({
        ...editingPlan,
        features: editingPlan.features.filter((f) => f.id !== featureId)
      });
    }
  };

  const toggleFeatureIncluded = (featureId: string) => {
    if (editingPlan) {
      setEditingPlan({
        ...editingPlan,
        features: editingPlan.features.map((f) =>
          f.id === featureId ? { ...f, included: !f.included } : f
        )
      });
    }
  };

  const getStatusBadge = (isActive: boolean) => {
    return (
      <Badge className={isActive 
        ? 'bg-green-100 text-green-700 hover:bg-green-100'
        : 'bg-gray-100 text-gray-700 hover:bg-gray-100'
      }>
        {isActive ? 'Active' : ''}
      </Badge>
    );
  };

  const renderEditDialog = () => (
    <Dialog open={isEditDialogOpen || isCreateDialogOpen} onOpenChange={(open) => {
      setIsEditDialogOpen(open);
      setIsCreateDialogOpen(open);
      if (!open) setEditingPlan(null);
    }}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isCreateDialogOpen ? 'Create New Plan' : 'Edit Plan'}</DialogTitle>
          <DialogDescription>
            {isCreateDialogOpen 
              ? 'Create a new subscription plan for users'
              : 'Update plan details and features'}
          </DialogDescription>
        </DialogHeader>
        {editingPlan && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="name">Plan Name</Label>
                <Input
                  id="name"
                  value={editingPlan.name}
                  onChange={(e) =>
                    setEditingPlan({ ...editingPlan, name: e.target.value })
                  }
                />
              </div>
              <div>
                <Label htmlFor="price">Price ($)</Label>
                <Input
                  id="price"
                  type="number"
                  step="0.01"
                  value={editingPlan.price}
                  onChange={(e) =>
                    setEditingPlan({ ...editingPlan, price: parseFloat(e.target.value) })
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="description">Description</Label>
              <Textarea
                id="description"
                value={editingPlan.description}
                onChange={(e) =>
                  setEditingPlan({ ...editingPlan, description: e.target.value })
                }
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="billingPeriod">Billing Period</Label>
                <select
                  id="billingPeriod"
                  value={editingPlan.billingPeriod}
                  onChange={(e) =>
                    setEditingPlan({
                      ...editingPlan,
                      billingPeriod: e.target.value as 'monthly' | 'yearly' | 'lifetime'
                    })
                  }
                  className="w-full h-10 px-3 border border-input rounded-md bg-background"
                >
                  <option value="monthly">Monthly</option>
                  <option value="yearly">Yearly</option>
                  <option value="lifetime">Lifetime</option>
                </select>
              </div>
              <div>
                <Label htmlFor="maxProjects">Max Projects (-1 = unlimited)</Label>
                <Input
                  id="maxProjects"
                  type="number"
                  value={editingPlan.maxProjects}
                  onChange={(e) =>
                    setEditingPlan({ ...editingPlan, maxProjects: parseInt(e.target.value) })
                  }
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label htmlFor="maxStorage">Max Storage</Label>
                <Input
                  id="maxStorage"
                  value={editingPlan.maxStorage}
                  onChange={(e) =>
                    setEditingPlan({ ...editingPlan, maxStorage: e.target.value })
                  }
                  placeholder="e.g., 10GB"
                />
              </div>
              <div>
                <Label htmlFor="aiCredits">AI Credits (-1 = unlimited)</Label>
                <Input
                  id="aiCredits"
                  type="number"
                  value={editingPlan.aiCredits}
                  onChange={(e) =>
                    setEditingPlan({ ...editingPlan, aiCredits: parseInt(e.target.value) })
                  }
                />
              </div>
            </div>

            <div>
              <Label htmlFor="support">Support Level</Label>
              <Input
                id="support"
                value={editingPlan.support}
                onChange={(e) =>
                  setEditingPlan({ ...editingPlan, support: e.target.value })
                }
                placeholder="e.g., Priority, Community, 24/7"
              />
            </div>

            <div className="flex gap-6">
              <div className="flex items-center space-x-2">
                <Switch
                  id="customDomain"
                  checked={editingPlan.customDomain}
                  onCheckedChange={(checked) =>
                    setEditingPlan({ ...editingPlan, customDomain: checked })
                  }
                />
                <Label htmlFor="customDomain">Custom Domain</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="exportCode"
                  checked={editingPlan.exportCode}
                  onCheckedChange={(checked) =>
                    setEditingPlan({ ...editingPlan, exportCode: checked })
                  }
                />
                <Label htmlFor="exportCode">Export Code</Label>
              </div>
              <div className="flex items-center space-x-2">
                <Switch
                  id="isPopular"
                  checked={editingPlan.isPopular}
                  onCheckedChange={(checked) =>
                    setEditingPlan({ ...editingPlan, isPopular: checked })
                  }
                />
                <Label htmlFor="isPopular">Popular Badge</Label>
              </div>
            </div>

            <div>
              <Label>Features</Label>
              <div className="space-y-2 mt-2">
                {editingPlan.features.map((feature) => (
                  <div key={feature.id} className="flex items-center gap-2 p-2 border rounded-md">
                    <Switch
                      checked={feature.included}
                      onCheckedChange={() => toggleFeatureIncluded(feature.id)}
                    />
                    <span className={`flex-1 ${!feature.included ? 'line-through text-muted-foreground' : ''}`}>
                      {feature.text}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeFeature(feature.id)}
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
                <div className="flex gap-2">
                  <Input
                    placeholder="Add new feature..."
                    value={editingFeature}
                    onChange={(e) => setEditingFeature(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && addFeature()}
                  />
                  <Button onClick={addFeature}>
                    <Plus className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}
        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              setIsEditDialogOpen(false);
              setIsCreateDialogOpen(false);
              setEditingPlan(null);
            }}
          >
            Cancel
          </Button>
          <Button onClick={isCreateDialogOpen ? handleSaveCreate : handleSaveEdit}>
            {isCreateDialogOpen ? 'Create Plan' : 'Save Changes'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-gray-900">Subscription Plans</h3>
          <p className="text-sm text-gray-500">Manage available plans for users</p>
        </div>
        <Button onClick={handleCreate}>
          <Plus className="w-4 h-4 mr-2" />
          Create Plan
        </Button>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Plan Name</TableHead>
              <TableHead>Price</TableHead>
              <TableHead>Billing</TableHead>
              <TableHead>Features</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Popular</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {plans.map((plan) => (
              <TableRow key={plan.id}>
                <TableCell>
                  <div>
                    <div className="text-gray-900">{plan.name}</div>
                    <div className="text-sm text-gray-500">{plan.description}</div>
                  </div>
                </TableCell>
                <TableCell>
                  <div className="text-gray-900">
                    ${plan.price.toFixed(2)}
                  </div>
                </TableCell>
                <TableCell className="capitalize">{plan.billingPeriod}</TableCell>
                <TableCell>
                  <div className="text-sm text-gray-600">
                    {plan.features.filter(f => f.included).length} features
                  </div>
                </TableCell>
                <TableCell>{getStatusBadge(plan.isActive)}</TableCell>
                <TableCell>
                  {plan.isPopular && (
                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                      Popular
                    </Badge>
                  )}
                </TableCell>
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
                      <DropdownMenuItem onClick={() => handleEdit(plan)}>
                        <Edit className="w-4 h-4 mr-2" />
                        Edit Plan
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleToggleActive(plan.id)}>
                        {plan.isActive ? (
                          <>
                            <X className="w-4 h-4 mr-2" />
                            Deactivate
                          </>
                        ) : (
                          <>
                            <Check className="w-4 h-4 mr-2" />
                            Activate
                          </>
                        )}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem
                        onClick={() => handleDelete(plan.id)}
                        className="text-red-600"
                      >
                        <Trash2 className="w-4 h-4 mr-2" />
                        Delete Plan
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      {renderEditDialog()}
    </div>
  );
}
