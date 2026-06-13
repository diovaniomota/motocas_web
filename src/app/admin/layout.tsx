import AdminSidebar from '@/components/admin/AdminSidebar'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-screen bg-black text-white">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-auto">{children}</div>
    </div>
  )
}
