import { useState } from "react"
import { Link, useLocation } from "react-router-dom"
import { cn } from "@/lib/utils"
import {
  LayoutDashboard,
  PenTool,
  Calendar,
  Image,
  BarChart3,
  MessageSquare,
  Users,
  Settings,
  Zap,
  Target,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  Info,
  Mail,
  Shield,
  FileText,
  HelpCircle
} from "lucide-react"
import { Button } from "./ui/button"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "./ui/collapsible"

const navigation = [
  { name: 'Dashboard', href: '/', icon: LayoutDashboard },
  { name: 'Create', href: '/create', icon: PenTool },
  { name: 'Calendar', href: '/calendar', icon: Calendar },
  { name: 'Media Library', href: '/media', icon: Image },
  { name: 'Analytics', href: '/analytics', icon: BarChart3 },
  { name: 'Inbox', href: '/inbox', icon: MessageSquare },
  { name: 'Team', href: '/team', icon: Users },
  { name: 'Automation', href: '/automation', icon: Zap },
  { name: 'Ads Manager', href: '/ads', icon: Target },
  { name: 'Settings', href: '/settings', icon: Settings },
]

const aboutSubmenu = [
  { name: 'About Us', href: '/about', icon: Info },
  { name: 'Contact Us', href: '/contact', icon: Mail },
  { name: 'Help Center', href: '/help', icon: HelpCircle },
  { name: 'Privacy Policy', href: '/privacy', icon: Shield },
  { name: 'Terms of Service', href: '/terms', icon: FileText },
]

export function Sidebar() {
  const [collapsed, setCollapsed] = useState(false)
  const [aboutOpen, setAboutOpen] = useState(false)
  const location = useLocation()

  const isAboutActive = aboutSubmenu.some(item => location.pathname === item.href)

  return (
    <div className={cn(
      "flex flex-col bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-r border-slate-200/50 dark:border-slate-700/50 transition-all duration-300",
      collapsed ? "w-16" : "w-64"
    )}>
      <div className="flex items-center justify-between p-4 border-b border-slate-200/50 dark:border-slate-700/50">
        {!collapsed && (
          <div className="flex items-center space-x-2">
            <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-sm">N</span>
            </div>
            <span className="font-bold text-xl bg-gradient-to-r from-blue-600 to-indigo-600 bg-clip-text text-transparent">
              Nexura
            </span>
          </div>
        )}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setCollapsed(!collapsed)}
          className="h-8 w-8 p-0"
        >
          {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => {
          const isActive = location.pathname === item.href
          return (
            <Link
              key={item.name}
              to={item.href}
              className={cn(
                "flex items-center space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group",
                isActive
                  ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <item.icon className={cn(
                "h-5 w-5 transition-colors",
                isActive ? "text-white" : "text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300"
              )} />
              {!collapsed && <span>{item.name}</span>}
            </Link>
          )
        })}

        {/* About Us Dropdown */}
        <Collapsible open={aboutOpen} onOpenChange={setAboutOpen}>
          <CollapsibleTrigger asChild>
            <button
              className={cn(
                "flex items-center justify-between w-full space-x-3 px-3 py-2 rounded-lg text-sm font-medium transition-all duration-200 group",
                isAboutActive
                  ? "bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg shadow-blue-500/25"
                  : "text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white"
              )}
            >
              <div className="flex items-center space-x-3">
                <Info className={cn(
                  "h-5 w-5 transition-colors",
                  isAboutActive ? "text-white" : "text-slate-500 group-hover:text-slate-700 dark:group-hover:text-slate-300"
                )} />
                {!collapsed && <span>About Us</span>}
              </div>
              {!collapsed && (
                <ChevronDown className={cn(
                  "h-4 w-4 transition-transform duration-200",
                  aboutOpen ? "rotate-180" : "",
                  isAboutActive ? "text-white" : "text-slate-500"
                )} />
              )}
            </button>
          </CollapsibleTrigger>
          
          {!collapsed && (
            <CollapsibleContent className="space-y-1 mt-1">
              {aboutSubmenu.map((item) => {
                const isActive = location.pathname === item.href
                return (
                  <Link
                    key={item.name}
                    to={item.href}
                    className={cn(
                      "flex items-center space-x-3 px-3 py-2 ml-6 rounded-lg text-sm font-medium transition-all duration-200 group",
                      isActive
                        ? "bg-blue-100 dark:bg-blue-900 text-blue-700 dark:text-blue-300"
                        : "text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-700 dark:hover:text-slate-200"
                    )}
                  >
                    <item.icon className={cn(
                      "h-4 w-4 transition-colors",
                      isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-400 group-hover:text-slate-600 dark:group-hover:text-slate-300"
                    )} />
                    <span>{item.name}</span>
                  </Link>
                )
              })}
            </CollapsibleContent>
          )}
        </Collapsible>
      </nav>
    </div>
  )
}