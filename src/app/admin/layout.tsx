import AdminSidebar from '@/components/admin/AdminSidebar'

// Impede que o Next.js tente pré-renderizar as páginas admin no build do Cloudflare
export const dynamic = 'force-dynamic'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-screen bg-black text-white">
      <AdminSidebar />
      <div className="flex-1 flex flex-col overflow-auto">{children}</div>
    </div>
  )
}
