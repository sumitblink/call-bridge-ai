import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Phone, Mail, Lock, User, Chrome, BookOpen, Building2, Shield, BarChart3, Zap, ArrowRight, CheckCircle, Users, Target, Globe } from "lucide-react";
import { FaFacebook } from "react-icons/fa";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";

export default function Auth() {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const loginMutation = useMutation({
    mutationFn: async (data: { email: string; password: string }) => {
      const response = await apiRequest("POST", "/api/login", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Login Successful",
        description: "Welcome to CallCenter Pro!",
      });
    },
    onError: (error) => {
      toast({
        title: "Login Failed",
        description: error.message || "Please check your credentials and try again.",
        variant: "destructive",
      });
    },
  });

  const signupMutation = useMutation({
    mutationFn: async (data: { email: string; password: string; firstName: string; lastName: string }) => {
      const response = await apiRequest("POST", "/api/signup", data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/auth/user"] });
      toast({
        title: "Account Created",
        description: "Welcome to CallCenter Pro!",
      });
    },
    onError: (error) => {
      toast({
        title: "Signup Failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });

  const forgotPasswordMutation = useMutation({
    mutationFn: async (data: { email: string }) => {
      const response = await apiRequest("POST", "/api/forgot-password", data);
      return response.json();
    },
    onSuccess: () => {
      toast({
        title: "Reset Link Sent",
        description: "Check your email for password reset instructions.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error.message || "Failed to send reset link.",
        variant: "destructive",
      });
    },
  });

  const handleEmailLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;
    loginMutation.mutate({ email, password });
  };

  const handleEmailSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("signupEmail") as string;
    const password = formData.get("signupPassword") as string;
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;
    signupMutation.mutate({ email, password, firstName, lastName });
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const email = formData.get("forgotEmail") as string;
    forgotPasswordMutation.mutate({ email });
  };

  const handleGoogleLogin = () => {
    setIsLoading(true);
    window.location.href = "/api/auth/google";
  };

  const handleFacebookLogin = () => {
    setIsLoading(true);
    window.location.href = "/api/auth/facebook";
  };

  return (
    <div className="min-h-screen flex bg-gray-50">
      {/* Left Side - Branding & Features */}
      <div className="hidden lg:flex lg:w-1/2 bg-gradient-to-br from-blue-900 via-blue-800 to-indigo-900 relative overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 opacity-20">
          <div className="w-full h-full bg-gradient-to-br from-white/5 to-transparent"></div>
        </div>
        
        <div className="relative z-10 flex flex-col justify-center px-12 py-16 text-white">
          {/* Logo & Brand */}
          <div className="mb-12">
            <div className="flex items-center mb-6">
              <div className="bg-white/10 backdrop-blur-sm p-4 rounded-2xl border border-white/20">
                <Phone className="h-10 w-10 text-white" />
              </div>
              <div className="ml-4">
                <h1 className="text-4xl font-bold">CallCenter Pro</h1>
                <p className="text-blue-200 text-lg">Professional Call Management</p>
              </div>
            </div>
          </div>

          {/* Features */}
          <div className="space-y-8">
            <div>
              <h2 className="text-2xl font-semibold mb-6">Why Choose CallCenter Pro?</h2>
              <div className="grid gap-4">
                <div className="flex items-start gap-4">
                  <div className="bg-white/10 p-2 rounded-lg flex-shrink-0">
                    <Target className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Smart Call Routing</h3>
                    <p className="text-blue-200 text-sm">Intelligent distribution with multiple algorithms including round-robin, priority-based, and geographic routing.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-white/10 p-2 rounded-lg flex-shrink-0">
                    <BarChart3 className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Real-time Analytics</h3>
                    <p className="text-blue-200 text-sm">Comprehensive reporting and performance tracking with live dashboard monitoring.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-white/10 p-2 rounded-lg flex-shrink-0">
                    <Shield className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Enterprise Security</h3>
                    <p className="text-blue-200 text-sm">Bank-level security with encrypted data transmission and secure session management.</p>
                  </div>
                </div>

                <div className="flex items-start gap-4">
                  <div className="bg-white/10 p-2 rounded-lg flex-shrink-0">
                    <Zap className="h-5 w-5" />
                  </div>
                  <div>
                    <h3 className="font-medium mb-1">Twilio Integration</h3>
                    <p className="text-blue-200 text-sm">Seamless integration with Twilio for reliable call handling and advanced telephony features.</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white/5 backdrop-blur-sm p-6 rounded-xl border border-white/10">
              <div className="flex items-center gap-3 mb-4">
                <CheckCircle className="h-5 w-5 text-green-400" />
                <span className="font-medium">Trusted by 500+ Companies</span>
              </div>
              <p className="text-blue-200 text-sm">
                From small businesses to enterprise call centers, CallCenter Pro scales with your needs and delivers consistent results.
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="mt-12 grid grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-2xl font-bold">99.9%</div>
              <div className="text-blue-200 text-sm">Uptime</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">50M+</div>
              <div className="text-blue-200 text-sm">Calls Processed</div>
            </div>
            <div className="text-center">
              <div className="text-2xl font-bold">24/7</div>
              <div className="text-blue-200 text-sm">Support</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Side - Authentication Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-gray-50">
        <div className="w-full max-w-md space-y-8">
          {/* Mobile Header */}
          <div className="lg:hidden text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <div className="bg-gradient-to-r from-blue-600 to-indigo-600 p-3 rounded-xl">
                <Phone className="h-8 w-8 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-bold text-gray-900">CallCenter Pro</h1>
            <p className="text-gray-600">Professional call center management</p>
          </div>

          <Card className="shadow-lg border-0 bg-white">
            <Tabs defaultValue="login" className="w-full">
              <TabsList className="grid w-full grid-cols-3 mb-6">
                <TabsTrigger value="login" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                  Sign In
                </TabsTrigger>
                <TabsTrigger value="signup" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                  Sign Up
                </TabsTrigger>
                <TabsTrigger value="forgot" className="data-[state=active]:bg-blue-600 data-[state=active]:text-white">
                  Reset
                </TabsTrigger>
              </TabsList>

              <TabsContent value="login">
                <CardHeader className="space-y-1 text-center pb-6">
                  <CardTitle className="text-2xl font-bold text-gray-900">Welcome back</CardTitle>
                  <CardDescription className="text-gray-600">
                    Sign in to access your call center dashboard
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <form onSubmit={handleEmailLogin} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="email" className="text-sm font-medium">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="email"
                          name="email"
                          type="email"
                          placeholder="Enter your email"
                          className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="password" className="text-sm font-medium">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="password"
                          name="password"
                          type="password"
                          placeholder="Enter your password"
                          className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          required
                        />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium text-base"
                      disabled={loginMutation.isPending}
                    >
                      {loginMutation.isPending ? "Signing in..." : "Sign In"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </form>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-gray-500">Or continue with</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="h-12 border-gray-200 hover:bg-gray-50"
                      disabled={isLoading}
                      onClick={handleGoogleLogin}
                    >
                      <Chrome className="h-4 w-4 mr-2" />
                      Google
                    </Button>
                    <Button
                      variant="outline"
                      className="h-12 border-gray-200 hover:bg-gray-50"
                      disabled={isLoading}
                      onClick={handleFacebookLogin}
                    >
                      <FaFacebook className="h-4 w-4 mr-2 text-blue-600" />
                      Facebook
                    </Button>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-gray-600">
                      Don't have an account?{" "}
                      <button 
                        className="text-blue-600 hover:text-blue-500 font-medium"
                        onClick={() => {
                          const tabs = document.querySelector('[role="tablist"]');
                          const signupTab = tabs?.querySelector('[value="signup"]') as HTMLElement;
                          signupTab?.click();
                        }}
                      >
                        Sign up for free
                      </button>
                    </p>
                  </div>
                </CardContent>
              </TabsContent>

              <TabsContent value="signup">
                <CardHeader className="space-y-1 text-center pb-6">
                  <CardTitle className="text-2xl font-bold text-gray-900">Create your account</CardTitle>
                  <CardDescription className="text-gray-600">
                    Start managing your call center today
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <form onSubmit={handleEmailSignup} className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label htmlFor="firstName" className="text-sm font-medium">First name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                          <Input
                            id="firstName"
                            name="firstName"
                            placeholder="John"
                            className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                            required
                          />
                        </div>
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="lastName" className="text-sm font-medium">Last name</Label>
                        <Input
                          id="lastName"
                          name="lastName"
                          placeholder="Doe"
                          className="h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signupEmail" className="text-sm font-medium">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="signupEmail"
                          name="signupEmail"
                          type="email"
                          placeholder="Enter your email"
                          className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="signupPassword" className="text-sm font-medium">Password</Label>
                      <div className="relative">
                        <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="signupPassword"
                          name="signupPassword"
                          type="password"
                          placeholder="Create a password"
                          className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          required
                        />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium text-base"
                      disabled={signupMutation.isPending}
                    >
                      {signupMutation.isPending ? "Creating account..." : "Create Account"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </form>

                  <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                      <Separator className="w-full" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                      <span className="bg-white px-2 text-gray-500">Or continue with</span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <Button
                      variant="outline"
                      className="h-12 border-gray-200 hover:bg-gray-50"
                      disabled={isLoading}
                      onClick={handleGoogleLogin}
                    >
                      <Chrome className="h-4 w-4 mr-2" />
                      Google
                    </Button>
                    <Button
                      variant="outline"
                      className="h-12 border-gray-200 hover:bg-gray-50"
                      disabled={isLoading}
                      onClick={handleFacebookLogin}
                    >
                      <FaFacebook className="h-4 w-4 mr-2 text-blue-600" />
                      Facebook
                    </Button>
                  </div>

                  <div className="text-center">
                    <p className="text-sm text-gray-600">
                      Already have an account?{" "}
                      <button 
                        className="text-blue-600 hover:text-blue-500 font-medium"
                        onClick={() => {
                          const tabs = document.querySelector('[role="tablist"]');
                          const loginTab = tabs?.querySelector('[value="login"]') as HTMLElement;
                          loginTab?.click();
                        }}
                      >
                        Sign in
                      </button>
                    </p>
                  </div>
                </CardContent>
              </TabsContent>

              <TabsContent value="forgot">
                <CardHeader className="space-y-1 text-center pb-6">
                  <CardTitle className="text-2xl font-bold text-gray-900">Reset Password</CardTitle>
                  <CardDescription className="text-gray-600">
                    Enter your email to receive a reset link
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  <form onSubmit={handleForgotPassword} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="forgotEmail" className="text-sm font-medium">Email</Label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="forgotEmail"
                          name="forgotEmail"
                          type="email"
                          placeholder="Enter your email"
                          className="pl-10 h-12 border-gray-200 focus:border-blue-500 focus:ring-blue-500"
                          required
                        />
                      </div>
                    </div>
                    <Button
                      type="submit"
                      className="w-full h-12 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium text-base"
                      disabled={forgotPasswordMutation.isPending}
                    >
                      {forgotPasswordMutation.isPending ? "Sending..." : "Send Reset Link"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </form>

                  <div className="text-center">
                    <p className="text-sm text-gray-600">
                      Remember your password?{" "}
                      <button 
                        className="text-blue-600 hover:text-blue-500 font-medium"
                        onClick={() => {
                          const tabs = document.querySelector('[role="tablist"]');
                          const loginTab = tabs?.querySelector('[value="login"]') as HTMLElement;
                          loginTab?.click();
                        }}
                      >
                        Sign in
                      </button>
                    </p>
                  </div>
                </CardContent>
              </TabsContent>
            </Tabs>
          </Card>

          {/* Documentation and Terms */}
          <div className="space-y-4 text-center">
            <Button variant="outline" className="text-blue-600 hover:text-blue-700 border-blue-200 hover:border-blue-300" asChild>
              <a href="/documentation">
                <BookOpen className="h-4 w-4 mr-2" />
                View Documentation
              </a>
            </Button>

            <p className="text-xs text-gray-500">
              By continuing, you agree to our{" "}
              <a href="#" className="text-blue-600 hover:text-blue-500">
                Terms of Service
              </a>{" "}
              and{" "}
              <a href="#" className="text-blue-600 hover:text-blue-500">
                Privacy Policy
              </a>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}