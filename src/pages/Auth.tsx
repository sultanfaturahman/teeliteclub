import { useState, useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { Button } from "@/components/ui/button";
import { handleAuthError } from "@/lib/errorHandler";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Separator } from "@/components/ui/separator";
import { Loader2, ArrowLeft } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { Footer } from "@/components/layout/Footer";
import { toast } from "sonner";
const Auth = () => {
  const {
    signIn,
    signUp,
    signInWithGoogle,
    user
  } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [defaultTab, setDefaultTab] = useState('signin');
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    nama: '',
    confirmPassword: ''
  });

  // Check URL parameters to set default tab
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const mode = urlParams.get('mode');
    if (mode === 'signin' || mode === 'signup') {
      setDefaultTab(mode);
    }
  }, []);

  // Redirect if already logged in
  useEffect(() => {
    if (user) {
      navigate('/');
    }
  }, [user, navigate]);
  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleGoogleSignIn = async () => {
    setGoogleLoading(true);
    try {
      const { error } = await signInWithGoogle();
      if (error) {
        toast.error(handleAuthError(error));
      } else {
        toast.success('Mengalihkan ke Google...');
      }
    } catch (error) {
      toast.error(handleAuthError(error));
    } finally {
      setGoogleLoading(false);
    }
  };
  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password) {
      toast.error('Email dan password harus diisi');
      return;
    }
    setLoading(true);
    try {
      const {
        error
      } = await signIn(formData.email, formData.password);
      if (error) {
        toast.error(handleAuthError(error));
      } else {
        window.location.href = '/';
      }
    } catch (error) {
      toast.error(handleAuthError(error));
    } finally {
      setLoading(false);
    }
  };
  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.email || !formData.password || !formData.nama) {
      toast.error('Semua field harus diisi');
      return;
    }
    if (formData.password !== formData.confirmPassword) {
      toast.error('Password tidak sama');
      return;
    }
    // Simplified password validation
    if (formData.password.length < 6) {
      toast.error('Password minimal 6 karakter');
      return;
    }
    setLoading(true);
    try {
      const {
        error
      } = await signUp(formData.email, formData.password, formData.nama);
      if (error) {
        toast.error(handleAuthError(error));
      }
    } catch (error) {
      toast.error(handleAuthError(error));
    } finally {
      setLoading(false);
    }
  };
  return <div className="min-h-screen bg-background flex flex-col">
      <div className="flex-1 flex items-center justify-center p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <Link to="/" className="inline-flex items-center text-sm text-muted-foreground hover:text-primary">
              <ArrowLeft className="h-4 w-4 mr-1" />
              Kembali ke beranda
            </Link>
            
            <p className="text-muted-foreground">Masuk atau daftar untuk melanjutkan</p>
          </div>

          <Tabs defaultValue={defaultTab} className="w-full">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="signin">Masuk</TabsTrigger>
              <TabsTrigger value="signup">Daftar</TabsTrigger>
            </TabsList>

            <TabsContent value="signin">
              <Card>
                <CardHeader>
                  <CardTitle>Masuk</CardTitle>
                  <CardDescription>Masuk ke akun Anda</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Google Sign In Button */}
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={handleGoogleSignIn}
                      disabled={googleLoading || loading}
                    >
                      {googleLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                      )}
                      Masuk dengan Google
                    </Button>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <Separator className="w-full" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          Atau
                        </span>
                      </div>
                    </div>

                    {/* Regular Email/Password Form */}
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signin-email">Email</Label>
                        <Input id="signin-email" type="email" placeholder="nama@email.com" value={formData.email} onChange={e => handleInputChange('email', e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signin-password">Password</Label>
                        <Input id="signin-password" type="password" placeholder="Password" value={formData.password} onChange={e => handleInputChange('password', e.target.value)} required />
                      </div>
                      <Button type="submit" className="w-full" disabled={loading || googleLoading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Masuk
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="signup">
              <Card>
                <CardHeader>
                  <CardTitle>Daftar</CardTitle>
                  <CardDescription>Buat akun baru</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {/* Google Sign Up Button */}
                    <Button
                      type="button"
                      variant="outline"
                      className="w-full"
                      onClick={handleGoogleSignIn}
                      disabled={googleLoading || loading}
                    >
                      {googleLoading ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <svg className="mr-2 h-4 w-4" viewBox="0 0 24 24">
                          <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                          <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                          <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                          <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                      )}
                      Daftar dengan Google
                    </Button>

                    <div className="relative">
                      <div className="absolute inset-0 flex items-center">
                        <Separator className="w-full" />
                      </div>
                      <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-background px-2 text-muted-foreground">
                          Atau
                        </span>
                      </div>
                    </div>

                    {/* Regular Email/Password Form */}
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="signup-nama">Nama Lengkap</Label>
                        <Input id="signup-nama" type="text" placeholder="Nama lengkap" value={formData.nama} onChange={e => handleInputChange('nama', e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-email">Email</Label>
                        <Input id="signup-email" type="email" placeholder="nama@email.com" value={formData.email} onChange={e => handleInputChange('email', e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="signup-password">Password</Label>
                        <Input id="signup-password" type="password" placeholder="Password (minimal 6 karakter)" value={formData.password} onChange={e => handleInputChange('password', e.target.value)} required />
                      </div>
                      <div className="space-y-2">
                        <Label htmlFor="confirm-password">Konfirmasi Password</Label>
                        <Input id="confirm-password" type="password" placeholder="Konfirmasi password" value={formData.confirmPassword} onChange={e => handleInputChange('confirmPassword', e.target.value)} required />
                      </div>
                      <Button type="submit" className="w-full" disabled={loading || googleLoading}>
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Daftar
                      </Button>
                    </form>
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
      
      <Footer />
    </div>;
};
export default Auth;