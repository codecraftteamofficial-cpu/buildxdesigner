import React, { useState, useEffect } from "react";
import {
  Check,
  Sparkles,
  Zap,
  Crown,
  X,
  CreditCard,
  Shield,
  ArrowRight,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "./ui/dialog";
import { Button } from "./ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "./ui/card";
import { Badge } from "./ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import { Plan, defaultPlans } from "./AdminPlanManagement";

interface PlansModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const plans = [
  {
    id: "starter",
    name: "Starter",
    icon: Sparkles,
    price: {
      monthly: 0,
      yearly: 0,
    },
    description: "Perfect for individuals getting started",
    features: [
      "Up to 3 projects",
      "500 MB storage",
      "Basic templates",
      "Community support",
      "Export to HTML/CSS",
      "1 team member",
    ],
    limitations: ["No AI generation", "Limited templates", "No custom domain"],
    popular: false,
    buttonText: "Current Plan",
    buttonVariant: "outline" as const,
  },
  {
    id: "pro",
    name: "Pro",
    icon: Zap,
    price: {
      monthly: 999,
      yearly: 9990,
    },
    description: "For professionals and growing teams",
    features: [
      "Unlimited projects",
      "50 GB storage",
      "All premium templates",
      "Priority support",
      "AI UI generation",
      "Advanced export options",
      "Custom branding",
      "Up to 5 team members",
      "Version history",
      "Custom domain support",
    ],
    limitations: [],
    popular: true,
    buttonText: "Upgrade to Pro",
    buttonVariant: "default" as const,
  },
  {
    id: "enterprise",
    name: "Enterprise",
    icon: Crown,
    price: {
      monthly: 4999,
      yearly: 49990,
    },
    description: "For large teams with advanced needs",
    features: [
      "Everything in Pro",
      "Unlimited storage",
      "Dedicated account manager",
      "24/7 phone support",
      "Custom AI training",
      "Advanced security features",
      "SSO authentication",
      "Unlimited team members",
      "Custom integrations",
      "SLA guarantee",
      "White-label options",
      "Advanced analytics",
    ],
    limitations: [],
    popular: false,
    buttonText: "Contact Sales",
    buttonVariant: "default" as const,
  },
];

export function PlansModal({ isOpen, onClose }: PlansModalProps) {
  const [billingCycle, setBillingCycle] = useState<"monthly" | "yearly">(
    "monthly",
  );
  const [adminPlans, setAdminPlans] = useState<Plan[]>([]);
  const [selectedPlan, setSelectedPlan] = useState<string | null>(null);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);

  // Load plans from localStorage (set by admin) or use defaults
  useEffect(() => {
    const loadPlans = () => {
      const savedPlans = localStorage.getItem("codecraft-plans");
      if (savedPlans) {
        try {
          const parsed = JSON.parse(savedPlans);
          setAdminPlans(parsed.filter((p: Plan) => p.isActive));
        } catch (e) {
          setAdminPlans(defaultPlans.filter((p) => p.isActive));
        }
      } else {
        setAdminPlans(defaultPlans.filter((p) => p.isActive));
      }
    };

    loadPlans();

    // Listen for plan updates
    const handleStorageChange = (e: StorageEvent) => {
      if (e.key === "codecraft-plans") {
        loadPlans();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, [isOpen]);

  const getSavings = (plan: (typeof plans)[0]) => {
    if (plan.price.yearly === 0) return null;
    const monthlyCost = plan.price.monthly * 12;
    const savings = monthlyCost - plan.price.yearly;
    const percentage = Math.round((savings / monthlyCost) * 100);
    return { amount: savings, percentage };
  };

  const handlePayMongoPayment = async (
    planId: string,
    planName: string,
    amount: number,
  ) => {
    if (amount === 0) {
      return; // Free plan, no payment needed
    }

    setIsProcessingPayment(true);
    setSelectedPlan(planId);

    try {
      // PayMongo integration
      // In a real application, you would:
      // 1. Call your backend API to create a PayMongo payment intent
      // 2. Redirect to PayMongo checkout or use their SDK

      // Mock PayMongo checkout URL creation
      const checkoutUrl = await createPayMongoCheckout(
        planId,
        planName,
        amount,
        billingCycle,
      );

      // Redirect to PayMongo checkout
      window.location.href = checkoutUrl;
    } catch (error) {
      console.error("Payment failed:", error);
      alert("Payment initialization failed. Please try again.");
      setIsProcessingPayment(false);
      setSelectedPlan(null);
    }
  };

  // Mock function - In production, this would be your backend API call
  const createPayMongoCheckout = async (
    planId: string,
    planName: string,
    amount: number,
    cycle: string,
  ): Promise<string> => {
    // This is a mock implementation
    // In production, you would call your backend which creates a PayMongo checkout session

    return new Promise((resolve) => {
      setTimeout(() => {
        // Mock checkout URL
        // In production: POST to your backend at /api/create-paymongo-checkout
        const mockCheckoutUrl = `https://checkout.paymongo.com/mock?plan=${planId}&amount=${amount}&cycle=${cycle}`;

        // For demo purposes, we'll show an alert instead of redirecting
        alert(
          `PayMongo Checkout\n\nPlan: ${planName}\nAmount: ₱${amount.toLocaleString("en-PH")}\nCycle: ${cycle}\n\nIn production, you would be redirected to PayMongo's secure checkout page.`,
        );

        resolve(mockCheckoutUrl);
        setIsProcessingPayment(false);
        setSelectedPlan(null);
      }, 1500);
    });
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-[95vw] h-[92vh] overflow-hidden p-0 flex flex-col">
        <DialogHeader className="px-6 py-3 border-b border-border bg-gradient-to-r from-blue-50 to-violet-50 dark:from-blue-950/20 dark:to-violet-950/20 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div>
              <DialogTitle className="text-xl">
                Choose Your Perfect Plan
              </DialogTitle>
              <DialogDescription className="text-xs mt-0.5">
                14-day money-back guarantee • Cancel anytime
              </DialogDescription>
            </div>
            <div className="flex items-center gap-3">
              <Badge className="bg-green-600 text-white px-2 py-0.5 text-xs">
                <Shield className="w-3 h-3 mr-1" />
                Secure Payment
              </Badge>
              {/* Billing Toggle in Header */}
              <div className="inline-flex items-center gap-1.5 p-0.5 bg-muted rounded-md border border-border">
                <button
                  onClick={() => setBillingCycle("monthly")}
                  className={`px-4 py-1.5 rounded-sm transition-all font-medium text-xs ${
                    billingCycle === "monthly"
                      ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Monthly
                </button>
                <button
                  onClick={() => setBillingCycle("yearly")}
                  className={`px-4 py-1.5 rounded-sm transition-all flex items-center gap-1 font-medium text-xs ${
                    billingCycle === "yearly"
                      ? "bg-gradient-to-r from-blue-600 to-violet-600 text-white shadow-sm"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  Yearly
                  <Badge className="bg-green-600 text-white text-[9px] px-1 py-0">
                    17% OFF
                  </Badge>
                </button>
              </div>
            </div>
          </div>
        </DialogHeader>

        <div className="flex-1 px-6 py-4 flex flex-col justify-between overflow-hidden">
          {/* Plans Grid */}
          <div className="grid grid-cols-3 gap-4 flex-shrink-0">
            {/* Show admin-managed plans if available, otherwise show default plans */}
            {(adminPlans.length > 0 ? adminPlans : plans).map((plan: any) => {
              // Handle both admin Plan type and default plan type
              const isAdminPlan = "maxProjects" in plan;
              const Icon = isAdminPlan ? Zap : plan.icon;
              const planName = plan.name;
              const planPrice = isAdminPlan
                ? plan.price
                : billingCycle === "monthly"
                  ? plan.price.monthly
                  : plan.price.yearly;
              const planDescription = plan.description;
              const planFeatures = isAdminPlan
                ? plan.features
                    .filter((f: any) => f.included)
                    .map((f: any) => f.text)
                : plan.features;
              const isPopular = isAdminPlan ? plan.isPopular : plan.popular;
              const savings =
                !isAdminPlan && billingCycle === "yearly"
                  ? getSavings(plan)
                  : null;
              const isProcessing =
                isProcessingPayment && selectedPlan === plan.id;

              return (
                <Card
                  key={plan.id}
                  className={`relative border-2 transition-all duration-300 hover:shadow-lg flex flex-col h-full ${
                    isPopular
                      ? "border-blue-500 shadow-lg shadow-blue-500/10"
                      : "border-border hover:border-blue-400"
                  }`}
                >
                  {isPopular && (
                    <div className="absolute -top-2.5 left-1/2 transform -translate-x-1/2 z-10">
                      <Badge className="bg-gradient-to-r from-blue-600 to-violet-600 text-white px-2.5 py-0.5 text-[10px]">
                        <Sparkles className="w-2.5 h-2.5 mr-0.5" />
                        Most Popular
                      </Badge>
                    </div>
                  )}

                  <CardHeader className="text-center pb-2 pt-3 flex-shrink-0">
                    <div className="mx-auto mb-1.5 w-10 h-10 bg-gradient-to-br from-blue-500 via-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
                      <Icon className="w-5 h-5 text-white" />
                    </div>
                    <CardTitle className="text-base mb-0.5">
                      {planName}
                    </CardTitle>
                    <CardDescription className="text-[10px] leading-tight line-clamp-1">
                      {planDescription}
                    </CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-2 px-3 pb-3 flex-1 flex flex-col">
                    {/* Pricing */}
                    <div className="text-center py-2 bg-gradient-to-br from-blue-50 to-violet-50 dark:from-blue-950/20 dark:to-violet-950/20 rounded-md border border-blue-200 dark:border-blue-800 flex-shrink-0">
                      <div className="flex items-baseline justify-center gap-0.5">
                        <span className="text-2xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600">
                          ₱{planPrice.toLocaleString("en-PH")}
                        </span>
                        <span className="text-muted-foreground text-[10px]">
                          /
                          {isAdminPlan
                            ? plan.billingPeriod === "monthly"
                              ? "mo"
                              : plan.billingPeriod === "yearly"
                                ? "yr"
                                : "life"
                            : billingCycle === "monthly"
                              ? "mo"
                              : "yr"}
                        </span>
                      </div>
                      {savings && (
                        <div className="mt-0.5">
                          <span className="text-[9px] font-semibold text-green-700 dark:text-green-400">
                            Save ₱{savings.amount.toLocaleString("en-PH")}/yr
                          </span>
                        </div>
                      )}
                    </div>

                    {/* CTA Button */}
                    <Button
                      onClick={() =>
                        handlePayMongoPayment(plan.id, planName, planPrice)
                      }
                      disabled={isProcessingPayment || planPrice === 0}
                      className={`w-full h-8 text-[10px] font-semibold transition-all duration-300 flex-shrink-0 ${
                        planPrice === 0
                          ? "bg-gray-100 dark:bg-gray-800 text-gray-500 cursor-not-allowed"
                          : isPopular
                            ? "bg-gradient-to-r from-blue-600 via-violet-600 to-purple-600 hover:from-blue-700 hover:via-violet-700 hover:to-purple-700 text-white shadow-md hover:shadow-lg"
                            : "bg-gradient-to-r from-blue-500 to-violet-500 hover:from-blue-600 hover:to-violet-600 text-white shadow-sm hover:shadow-md"
                      }`}
                    >
                      {isProcessing ? (
                        <div className="flex items-center gap-1">
                          <div className="w-2.5 h-2.5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                          Processing...
                        </div>
                      ) : planPrice === 0 ? (
                        <div className="flex items-center gap-1">
                          <Check className="w-2.5 h-2.5" />
                          Current Plan
                        </div>
                      ) : (
                        <div className="flex items-center gap-1">
                          <CreditCard className="w-2.5 h-2.5" />
                          {plan.id === "enterprise"
                            ? "Upgrade Plan"
                            : `Upgrade Pro`}
                          <ArrowRight className="w-2.5 h-2.5" />
                        </div>
                      )}
                    </Button>

                    {/* Features List */}
                    <div className="space-y-1.5 pt-1.5 border-t border-border flex-1">
                      <p className="text-[9px] font-semibold text-muted-foreground uppercase tracking-wide">
                        Included:
                      </p>
                      <ul className="space-y-1">
                        {planFeatures
                          .slice(0, 6)
                          .map((feature: string, index: number) => (
                            <li
                              key={index}
                              className="flex items-start gap-1.5"
                            >
                              <div className="w-3 h-3 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center flex-shrink-0 mt-0.5">
                                <Check className="w-2 h-2 text-green-600 dark:text-green-400" />
                              </div>
                              <span className="text-[10px] text-foreground leading-tight line-clamp-1">
                                {feature}
                              </span>
                            </li>
                          ))}
                        {planFeatures.length > 6 && (
                          <li className="text-[10px] text-blue-600 dark:text-blue-400 pl-4.5 font-medium">
                            +{planFeatures.length - 6} more
                          </li>
                        )}
                      </ul>

                      {/* Limitations */}
                      {!isAdminPlan &&
                        plan.limitations &&
                        plan.limitations.length > 0 && (
                          <ul className="space-y-0.5 pt-1 border-t border-border/50 mt-1">
                            {plan.limitations
                              .slice(0, 2)
                              .map((limitation: string, index: number) => (
                                <li
                                  key={index}
                                  className="flex items-start gap-1.5"
                                >
                                  <X className="w-2.5 h-2.5 text-gray-400 flex-shrink-0 mt-0.5" />
                                  <span className="text-[9px] text-muted-foreground leading-tight">
                                    {limitation}
                                  </span>
                                </li>
                              ))}
                          </ul>
                        )}
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Payment Info Section - Compact */}
        </div>
      </DialogContent>
    </Dialog>
  );
}
