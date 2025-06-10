import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Phone, Mail, Lock, User, Chrome, HelpCircle, BookOpen } from "lucide-react";
import { FaFacebook } from "react-icons/fa";
import { useToast } from "@/hooks/use-toast";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Documentation } from "@/components/ui/documentation";

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
        title: "Reset Failed",
        description: error.message || "Please try again.",
        variant: "destructive",
      });
    },
  });



  const handleEmailLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const email = formData.get("email") as string;
    const password = formData.get("password") as string;

    loginMutation.mutate({ email, password });
  };

  const handleEmailSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const email = formData.get("signupEmail") as string;
    const password = formData.get("signupPassword") as string;
    const firstName = formData.get("firstName") as string;
    const lastName = formData.get("lastName") as string;

    signupMutation.mutate({ email, password, firstName, lastName });
  };

  const handleGoogleLogin = () => {
    window.location.href = "/api/auth/google";
  };

  const handleFacebookLogin = () => {
    window.location.href = "/api/auth/facebook";
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    const formData = new FormData(e.target as HTMLFormElement);
    const email = formData.get("forgotEmail") as string;

    forgotPasswordMutation.mutate({ email });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {/* Logo and Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-gradient-to-r from-blue-600 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
              <Phone className="h-6 w-6 text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">CallCenter Pro</h1>
          <p className="text-gray-600">Welcome to the professional call routing platform</p>
        </div>

        <Card className="shadow-xl border-0 bg-white/80 backdrop-blur-sm">
          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="login" className="text-sm font-medium">
                Sign In
              </TabsTrigger>
              <TabsTrigger value="signup" className="text-sm font-medium">
                Sign Up
              </TabsTrigger>
              <TabsTrigger value="forgot" className="text-sm font-medium">
                Reset
              </TabsTrigger>
            </TabsList>

            <TabsContent value="login">
              <CardHeader className="space-y-1 text-center pb-4">
                <CardTitle className="text-2xl font-semibold">Welcome back</CardTitle>
                <CardDescription>
                  Sign in to your account to continue
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleEmailLogin} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="Enter your email"
                        className="pl-10 h-11"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="password">Password</Label>
                      <button 
                        type="button"
                        className="text-sm text-blue-600 hover:text-blue-500 font-medium"
                        onClick={() => {
                          const tabs = document.querySelector('[role="tablist"]');
                          const resetTab = tabs?.querySelector('[value="forgot"]') as HTMLElement;
                          resetTab?.click();
                        }}
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="password"
                        name="password"
                        type="password"
                        placeholder="Enter your password"
                        className="pl-10 h-11"
                        required
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium"
                    disabled={loginMutation.isPending}
                  >
                    {loginMutation.isPending ? "Signing in..." : "Sign In"}
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
                    className="w-full h-11 border-gray-200 hover:bg-gray-50"
                    disabled={isLoading}
                    onClick={handleGoogleLogin}
                  >
                    <Chrome className="h-4 w-4 mr-2" />
                    Google
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full h-11 border-gray-200 hover:bg-gray-50"
                    disabled={isLoading}
                    onClick={handleFacebookLogin}
                  >
                    <FaFacebook className="h-4 w-4 mr-2 text-blue-600" />
                    Facebook
                  </Button>
                </div>
              </CardContent>
              <CardFooter className="text-center">
                <p className="text-sm text-gray-600">
                  Don't have an account?{" "}
                  <button className="text-blue-600 hover:text-blue-500 font-medium">
                    Sign up
                  </button>
                </p>
              </CardFooter>
            </TabsContent>

            <TabsContent value="signup">
              <CardHeader className="space-y-1 text-center pb-4">
                <CardTitle className="text-2xl font-semibold">Create account</CardTitle>
                <CardDescription>
                  Get started with your call center management
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleEmailSignup} className="space-y-4">
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <Label htmlFor="firstName">First name</Label>
                      <div className="relative">
                        <User className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                        <Input
                          id="firstName"
                          name="firstName"
                          placeholder="John"
                          className="pl-10 h-11"
                          required
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName">Last name</Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        placeholder="Doe"
                        className="h-11"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signupEmail">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="signupEmail"
                        name="signupEmail"
                        type="email"
                        placeholder="Enter your email"
                        className="pl-10 h-11"
                        required
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="signupPassword">Password</Label>
                    <div className="relative">
                      <Lock className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="signupPassword"
                        name="signupPassword"
                        type="password"
                        placeholder="Create a password"
                        className="pl-10 h-11"
                        required
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium"
                    disabled={signupMutation.isPending}
                  >
                    {signupMutation.isPending ? "Creating account..." : "Create Account"}
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
                    className="w-full h-11 border-gray-200 hover:bg-gray-50"
                    disabled={isLoading}
                    onClick={handleGoogleLogin}
                  >
                    <Chrome className="h-4 w-4 mr-2" />
                    Google
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full h-11 border-gray-200 hover:bg-gray-50"
                    disabled={isLoading}
                    onClick={handleFacebookLogin}
                  >
                    <FaFacebook className="h-4 w-4 mr-2 text-blue-600" />
                    Facebook
                  </Button>
                </div>
              </CardContent>
              <CardFooter className="text-center">
                <p className="text-sm text-gray-600">
                  Already have an account?{" "}
                  <button className="text-blue-600 hover:text-blue-500 font-medium">
                    Sign in
                  </button>
                </p>
              </CardFooter>
            </TabsContent>

            <TabsContent value="forgot">
              <CardHeader className="space-y-1 text-center pb-4">
                <CardTitle className="text-2xl font-semibold">Reset Password</CardTitle>
                <CardDescription>
                  Enter your email and we'll send you a reset link
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <form onSubmit={handleForgotPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="forgotEmail">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
                      <Input
                        id="forgotEmail"
                        name="forgotEmail"
                        type="email"
                        placeholder="Enter your email"
                        className="pl-10 h-11"
                        required
                      />
                    </div>
                  </div>
                  <Button
                    type="submit"
                    className="w-full h-11 bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white font-medium"
                    disabled={forgotPasswordMutation.isPending}
                  >
                    {forgotPasswordMutation.isPending ? "Sending..." : "Send Reset Link"}
                  </Button>
                </form>
              </CardContent>
              <CardFooter className="text-center">
                <p className="text-sm text-gray-600">
                  Remember your password?{" "}
                  <button className="text-blue-600 hover:text-blue-500 font-medium">
                    Sign in
                  </button>
                </p>
              </CardFooter>
            </TabsContent>
          </Tabs>
        </Card>

        {/* Documentation and Help Section */}
        <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-100">
          <div className="text-center mb-4">
            <BookOpen className="h-8 w-8 mx-auto text-blue-600 mb-2" />
            <h3 className="text-lg font-semibold text-gray-800">Need Help Getting Started?</h3>
            <p className="text-sm text-gray-600 mt-1">
              Complete documentation and setup guides for your call center platform
            </p>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Documentation 
              trigger={
                <Button variant="outline" className="bg-white hover:bg-blue-50 border-blue-200">
                  <HelpCircle className="h-4 w-4 mr-2" />
                  View Documentation
                </Button>
              }
            />
            <Button variant="outline" className="bg-white hover:bg-blue-50 border-blue-200" asChild>
              <a href="/MULTI_TWILIO_SETUP.md" target="_blank" rel="noopener noreferrer">
                <Phone className="h-4 w-4 mr-2" />
                Twilio Setup Guide
              </a>
            </Button>
          </div>

          <div className="mt-4 p-4 bg-white rounded-lg border border-blue-200">
            <h4 className="font-medium text-gray-800 mb-2">Quick Demo Access</h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-sm">
              <div className="p-2 bg-blue-50 rounded">
                <strong>Demo Account 1:</strong><br />
                sumit@example.com / demo123
              </div>
              <div className="p-2 bg-green-50 rounded">
                <strong>Demo Account 2:</strong><br />
                kiran@example.com / kiran123
              </div>
            </div>
          </div>
        </div>

        <div className="text-center mt-6">
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
  );
}