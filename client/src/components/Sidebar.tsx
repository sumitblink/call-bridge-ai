import { Link, useLocation } from "wouter";
import { Phone, BarChart3, BellRing, Users, PhoneCall, Settings } from "lucide-react";

const navigation = [
  { name: "Dashboard", href: "/dashboard", icon: BarChart3, current: true },
  { name: "Campaigns", href: "/campaigns", icon: BellRing, current: false },
  { name: "Agents", href: "/agents", icon: Users, current: false },
  { name: "Calls", href: "/calls", icon: PhoneCall, current: false },
  { name: "Analytics", href: "/analytics", icon: BarChart3, current: false },
  { name: "Settings", href: "/settings", icon: Settings, current: false },
];

export default function Sidebar() {
  const [location] = useLocation();

  return (
    <div className="w-64 bg-white shadow-sm border-r border-gray-200 flex flex-col">
      {/* Logo */}
      <div className="flex items-center px-6 py-5 border-b border-gray-200">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-primary-500 rounded-lg flex items-center justify-center">
            <Phone className="h-4 w-4 text-white" />
          </div>
          <span className="ml-3 text-xl font-semibold text-gray-900">CallCenter</span>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-4 py-6 space-y-2">
        {navigation.map((item) => {
          const isActive = location === item.href || (item.href === "/dashboard" && location === "/");
          const Icon = item.icon;
          
          return (
            <Link key={item.name} href={item.href}>
              <div
                className={`flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors cursor-pointer ${
                  isActive
                    ? "text-primary-600 bg-primary-50"
                    : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
                }`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {item.name}
              </div>
            </Link>
          );
        })}
      </nav>

      {/* User Profile */}
      <div className="px-4 py-4 border-t border-gray-200">
        <div className="flex items-center">
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <Users className="h-4 w-4 text-gray-600" />
          </div>
          <div className="ml-3">
            <p className="text-sm font-medium text-gray-900">John Doe</p>
            <p className="text-xs text-gray-500">Admin</p>
          </div>
        </div>
      </div>
    </div>
  );
}
