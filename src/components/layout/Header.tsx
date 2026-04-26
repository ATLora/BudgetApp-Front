import { useNavigate } from 'react-router-dom';
import { LogOut, Menu, PanelLeft, User } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/hooks/useAuth';
import { useSidebar } from './SidebarContext';

export function Header() {
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { toggle, setMobileOpen } = useSidebar();

  const initials = user
    ? `${user.firstName[0]}${user.lastName[0]}`.toUpperCase()
    : '?';

  async function handleLogout() {
    await logout();
    navigate('/login');
  }

  return (
    <header className="flex h-14 items-center justify-between border-b bg-background px-6">
      {/* Left: toggle — Menu (drawer) on mobile, PanelLeft (collapse) on desktop, hidden on tablet */}
      <div className="flex items-center">
        <Button
          variant="ghost"
          size="icon-sm"
          className="sm:hidden"
          onClick={() => setMobileOpen(true)}
          aria-label="Open menu"
        >
          <Menu className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          className="hidden lg:inline-flex"
          onClick={toggle}
          aria-label="Toggle sidebar"
        >
          <PanelLeft className="h-4 w-4" />
        </Button>
      </div>

      {/* Right: user menu (unchanged) */}
      <DropdownMenu>
        <DropdownMenuTrigger className="flex items-center gap-2 rounded-md p-1 hover:bg-accent outline-none">
          <span className="sr-only">User menu</span>
          <Avatar className="h-8 w-8">
            <AvatarFallback className="text-xs">{initials}</AvatarFallback>
          </Avatar>
          {user && (
            <span className="hidden text-sm font-medium sm:block">
              {user.firstName} {user.lastName}
            </span>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-48">
          <DropdownMenuItem disabled className="flex items-center gap-2">
            <User className="h-4 w-4" />
            Profile
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            onClick={handleLogout}
            className="flex items-center gap-2 text-destructive focus:text-destructive"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </header>
  );
}
