"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface TabsProps {
    value?: string
    onValueChange?: (value: string) => void
    children: React.ReactNode
    className?: string
}

const Tabs = React.forwardRef<HTMLDivElement, TabsProps>(
    ({ value, onValueChange, children, className, ...props }, ref) => (
        <TabsContext.Provider value={{ value, onValueChange }}>
            <div ref={ref} className={cn("w-full", className)} {...props}>
                {children}
            </div>
        </TabsContext.Provider>
    )
)
Tabs.displayName = "Tabs"

interface TabsListProps {
    children: React.ReactNode
    className?: string
}

const TabsList = React.forwardRef<HTMLDivElement, TabsListProps>(
    ({ children, className, ...props }, ref) => (
        <div
            ref={ref}
            className={cn(
                "inline-flex h-10 items-center justify-center rounded-md bg-gray-800 p-1 text-gray-300",
                className
            )}
            {...props}
        >
            {children}
        </div>
    )
)
TabsList.displayName = "TabsList"

interface TabsTriggerProps {
    value: string
    children: React.ReactNode
    className?: string
}

const TabsTrigger = React.forwardRef<HTMLButtonElement, TabsTriggerProps>(
    ({ value, children, className, ...props }, ref) => {
        const context = React.useContext(TabsContext)
        const isActive = context?.value === value

        return (
            <button
                ref={ref}
                onClick={() => context?.onValueChange?.(value)}
                className={cn(
                    "inline-flex items-center justify-center whitespace-nowrap rounded-sm px-3 py-1.5 text-sm font-medium transition-all focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-yellow-500 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50",
                    isActive
                        ? "bg-gray-700 text-white shadow-sm"
                        : "text-gray-400 hover:text-gray-300",
                    className
                )}
                {...props}
            >
                {children}
            </button>
        )
    }
)
TabsTrigger.displayName = "TabsTrigger"

interface TabsContentProps {
    value: string
    children: React.ReactNode
    className?: string
}

const TabsContent = React.forwardRef<HTMLDivElement, TabsContentProps>(
    ({ value, children, className, ...props }, ref) => {
        const context = React.useContext(TabsContext)
        const isActive = context?.value === value

        if (!isActive) return null

        return (
            <div
                ref={ref}
                className={cn("mt-2 ring-offset-background focus-visible:outline-none", className)}
                {...props}
            >
                {children}
            </div>
        )
    }
)
TabsContent.displayName = "TabsContent"

const TabsContext = React.createContext<{
    value?: string
    onValueChange?: (value: string) => void
}>({})

export { Tabs, TabsList, TabsTrigger, TabsContent, TabsContext }
