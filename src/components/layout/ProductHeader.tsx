import { Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ShoppingCart, User } from "lucide-react";
import { User as SupabaseUser } from "@supabase/supabase-js";

interface Profile {
  id: string;
  email?: string;
  nama?: string;
  telepon?: string;
  alamat?: string;
  role: string;
}

interface ProductHeaderProps {
  getCartItemsCount: () => number;
  user: SupabaseUser | null;
  profile: Profile | null;
  signOut: () => void;
}

export function ProductHeader({ getCartItemsCount, user, profile, signOut }: ProductHeaderProps) {
  return (
    <header className="border-b bg-[hsl(var(--header-footer))] text-[hsl(var(--header-footer-foreground))]">
      <div className="container mx-auto px-4">
        <div className="flex h-16 items-center justify-between">
          {/* Logo */}
          <Link
            to="/"
            className="text-2xl font-etna font-black text-[hsl(var(--header-footer-foreground))] tracking-wider">
            TEELITECLUB
          </Link>

          {/* Right side - Cart, User */}
          <div className="flex items-center space-x-6">
            {/* Cart */}
            <Button
              variant="ghost"
              size="icon"
              className="relative text-[hsl(var(--header-footer-foreground))] hover:bg-[hsl(var(--header-footer-foreground))]/10"
              asChild>
              <Link to="/cart">
                <ShoppingCart className="h-6 w-6" />
                {getCartItemsCount() > 0 && (
                  <Badge className="absolute -top-2 -right-2 h-5 w-5 rounded-full p-0 text-xs">
                    {getCartItemsCount()}
                  </Badge>
                )}
              </Link>
            </Button>

            {/* User Account */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="text-[hsl(var(--header-footer-foreground))] hover:bg-[hsl(var(--header-footer-foreground))]/10">
                  <User className="h-6 w-6" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {user ? (
                  <>
                    <DropdownMenuItem disabled>
                      <div className="flex flex-col">
                        <span className="font-medium">
                          {profile?.nama || "User"}
                        </span>
                        <span className="text-xs text-muted-foreground">
                          {user.email}
                        </span>
                      </div>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem asChild>
                      <Link to="/account">My Account</Link>
                    </DropdownMenuItem>
                    <DropdownMenuItem asChild>
                      <Link to="/orders">My Orders</Link>
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={signOut}
                      className="text-destructive">
                      Logout
                    </DropdownMenuItem>
                  </>
                ) : (
                  <DropdownMenuItem asChild>
                    <Link to="/auth">Login / Register</Link>
                  </DropdownMenuItem>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </div>
    </header>
  );
}