import Sidebar from "@/components/Sidebar";
import Header from "@/components/Header";

interface LayoutProps {
  children: React.ReactNode;
}

export default function Layout({ children }: LayoutProps) {
  return (
    <div className="flex h-screen bg-gray-50">
      <Sidebar />
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header />
        
        <main className="flex-1 overflow-y-auto pl-[15px] pr-[15px] pt-[15px] pb-[15px]">
          <div className="min-h-fit">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}