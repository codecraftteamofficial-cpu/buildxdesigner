"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "./ui/button"
import { X, Globe, Check, Loader2, AlertCircle } from "lucide-react"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { publishProject } from "../supabase/data/projectService"
import { toast } from "sonner"
import { Project } from "../supabase/types/project"

interface PublishSiteModalProps {
    isOpen: boolean
    onClose: () => void
    project: Project | null
    onPublishSuccess: (url: string) => void
}

export function PublishSiteModal({ isOpen, onClose, project, onPublishSuccess }: PublishSiteModalProps) {
    const [subdomain, setSubdomain] = useState("")
    const [isPublishing, setIsPublishing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [publishedUrl, setPublishedUrl] = useState<string | null>(null)

    useEffect(() => {
        if (isOpen && project) {
            if (project.subdomain) {
                setSubdomain(project.subdomain)
                setPublishedUrl(`https://${project.subdomain}.buildxdesigner.site`)
            } else {
                // Pre-fill with sanitized project name if no subdomain exists
                const suggested = project.name
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, "-")
                    .replace(/-+/g, "-")
                    .replace(/^-|-$/g, "")
                setSubdomain(suggested)
                setPublishedUrl(null)
            }
            setError(null)
        }
    }, [isOpen, project])

    if (!isOpen || !project) return null

    const validateSubdomain = (value: string) => {
        if (!value) return "Subdomain is required"
        if (value.length < 3) return "Subdomain must be at least 3 characters"
        if (value.length > 63) return "Subdomain must be less than 63 characters"
        if (!/^[a-z0-9-]+$/.test(value)) return "Only lowercase letters, numbers, and hyphens are allowed"
        if (/^-|-$/.test(value)) return "Cannot start or end with a hyphen"
        return null
    }

    const handlePublish = async () => {
        const validationError = validateSubdomain(subdomain)
        if (validationError) {
            setError(validationError)
            return
        }

        setIsPublishing(true)
        setError(null)

        try {
            const result = await publishProject(project.id, subdomain)

            if (result.error) {
                throw new Error(typeof result.error === 'string' ? result.error : result.error.message || "Failed to publish")
            }

            if (result.url) {
                setPublishedUrl(result.url)
                onPublishSuccess(result.url)
                toast.success("Site published successfully!", {
                    description: "Your site is now live."
                })
            }
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred")
        } finally {
            setIsPublishing(false)
        }
    }

    return (
        <>
            <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg">
                <div className="flex flex-col space-y-1.5 text-center sm:text-left">
                    <div className="flex items-center justify-between">
                        <h3 className="text-lg font-semibold leading-none tracking-tight">Publish to Web</h3>
                        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                            <X className="w-4 h-4" />
                            <span className="sr-only">Close</span>
                        </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        Make your site accessible to the world with a custom subdomain.
                    </p>
                </div>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="subdomain">Subdomain</Label>
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Input
                                    id="subdomain"
                                    value={subdomain}
                                    onChange={(e) => {
                                        const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
                                        setSubdomain(val)
                                        if (error) setError(null)
                                    }}
                                    className={`pr-8 ${error ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                                    placeholder="my-awesome-site"
                                    disabled={isPublishing}
                                />
                                {project.subdomain === subdomain && (
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-green-500">
                                        <Check className="w-4 h-4" />
                                    </div>
                                )}
                            </div>
                            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                                .buildxdesigner.site
                            </span>
                        </div>
                        {error && (
                            <div className="flex items-center gap-2 text-sm text-red-500">
                                <AlertCircle className="w-4 h-4" />
                                <span>{error}</span>
                            </div>
                        )}
                    </div>

                    {publishedUrl && !error && !isPublishing && (
                        <div className="mt-2 rounded-md bg-green-50 dark:bg-green-900/20 p-3 border border-green-200 dark:border-green-900">
                            <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-1">
                                <Globe className="w-4 h-4" />
                                <span className="font-medium text-sm">Site is Live</span>
                            </div>
                            <a
                                href={publishedUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all"
                            >
                                {publishedUrl}
                            </a>
                        </div>
                    )}
                </div>

                <div className="flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-2">
                    <Button variant="outline" onClick={onClose} disabled={isPublishing}>
                        Cancel
                    </Button>
                    <Button onClick={handlePublish} disabled={isPublishing}>
                        {isPublishing && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {project.isPublished ? "Update Site" : "Publish Site"}
                    </Button>
                </div>
            </div>
        </>
    )
}
