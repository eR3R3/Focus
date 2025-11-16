"use client";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    const supabase = createClient();
    await supabase.auth.signOut();
    // Use window.location for a hard redirect to ensure proper navigation
    window.location.href = "/";
  };

  return (
    <Button 
      onClick={logout} 
      variant="ghost" 
      size="sm"
      className="text-white/70 hover:text-white hover:bg-white/10 h-8 w-8 p-0"
    >
      <LogOut className="h-4 w-4" />
    </Button>
  );
}
