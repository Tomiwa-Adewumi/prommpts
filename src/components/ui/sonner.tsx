"use client"

import { Toaster as Sonner, ToasterProps } from "sonner"

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="dark"
      className="toaster group"
      toastOptions={{
        unstyled: true,
        classNames: {
          toast: 'flex items-center gap-3 w-full px-4 py-3 bg-zinc-900/95 backdrop-blur-xl border border-zinc-800 rounded-xl shadow-2xl',
          title: 'text-sm font-medium text-white',
          description: 'text-xs text-zinc-400 mt-0.5',
          actionButton: 'bg-[#F1E500] text-black text-xs font-bold px-3 py-1.5 rounded-lg hover:bg-[#d4c800] transition-colors',
          cancelButton: 'bg-zinc-800 text-zinc-300 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-zinc-700 transition-colors',
          closeButton: 'text-zinc-500 hover:text-white transition-colors',
          success: 'border-green-500/30 [&>div>svg]:text-green-500',
          error: 'border-orange-500/30 [&>div>svg]:text-orange-500',
          warning: 'border-yellow-500/30 [&>div>svg]:text-yellow-500',
          info: 'border-blue-500/30 [&>div>svg]:text-blue-500',
          icon: 'w-5 h-5 flex-shrink-0',
        },
      }}
      {...props}
    />
  )
}

export { Toaster }
