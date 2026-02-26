import type React from "react"

import { useState, useEffect, useRef } from "react"
import { Button } from "./ui/button"
import { X, Globe, Check, Loader2, AlertCircle, RefreshCw, ExternalLink, Calendar, CheckCircle2, Upload, Trash2, Image as ImageIcon } from "lucide-react"
import { Input } from "./ui/input"
import { Label } from "./ui/label"
import { publishProject, checkSubdomainAvailability, unpublishProject } from "../supabase/data/projectService"
import { supabase } from "../supabase/config/supabaseClient"
import { toast } from "sonner"
import { Project } from "../supabase/types/project"

interface PublishSiteModalProps {
    isOpen: boolean
    onClose: () => void
    project: Project | null
    onPublishSuccess: (url: string) => void
}

type AvailabilityState = "idle" | "checking" | "available" | "taken" | "error"

export function PublishSiteModal({ isOpen, onClose, project, onPublishSuccess }: PublishSiteModalProps) {
    const [subdomain, setSubdomain] = useState("")
    const [isPublishing, setIsPublishing] = useState(false)
    const [error, setError] = useState<string | null>(null)
    const [publishedUrl, setPublishedUrl] = useState<string | null>(null)
    const [availability, setAvailability] = useState<AvailabilityState>("idle")
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Takedown state
    const [showTakedownConfirm, setShowTakedownConfirm] = useState(false)
    const [takedownInput, setTakedownInput] = useState("")
    const [isTakingDown, setIsTakingDown] = useState(false)

    // Site Branding state
    const [siteTitle, setSiteTitle] = useState("")
    const [siteLogoUrl, setSiteLogoUrl] = useState("")
    const [isUploadingLogo, setIsUploadingLogo] = useState(false)
    const fileInputRef = useRef<HTMLInputElement>(null)

    const isAlreadyPublished = !!project?.isPublished
    const currentSubdomain = project?.subdomain ?? ""
    const publishedAt = project?.lastPublishedAt
        ? new Date(project.lastPublishedAt).toLocaleDateString("en-US", {
            year: "numeric",
            month: "long",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        })
        : null

    const wasOpenRef = useRef(false)

    useEffect(() => {
        // Only initialize when modal transitions from closed → open
        if (isOpen && !wasOpenRef.current && project) {
            if (project.subdomain) {
                setSubdomain(project.subdomain)
                setPublishedUrl(`https://${project.subdomain}.buildxdesigner.site`)
            } else {
                const suggested = project.name
                    .toLowerCase()
                    .replace(/[^a-z0-9-]/g, "-")
                    .replace(/-+/g, "-")
                    .replace(/^-|-$/g, "")
                setSubdomain(suggested)
                setPublishedUrl(null)
            }
            setAvailability("idle")
            setShowTakedownConfirm(false)
            setTakedownInput("")
            setIsTakingDown(false)
            setSiteTitle(project.siteTitle || "")
            setSiteLogoUrl(project.siteLogoUrl || "")
        }
        wasOpenRef.current = isOpen
    }, [isOpen, project])

    const validateSubdomain = (value: string) => {
        if (!value) return "Subdomain is required"
        if (value.length < 3) return "Subdomain must be at least 3 characters"
        if (value.length > 63) return "Subdomain must be less than 63 characters"
        if (!/^[a-z0-9-]+$/.test(value)) return "Only lowercase letters, numbers, and hyphens are allowed"
        if (/^-|-$/.test(value)) return "Cannot start or end with a hyphen"
        return null
    }

    const handleSubdomainChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "")
        setSubdomain(val)
        setError(null)

        const validationError = validateSubdomain(val)
        if (validationError || !project) {
            setAvailability("idle")
            return
        }

        // If subdomain didn't change from the saved one, no need to check
        if (val === currentSubdomain) {
            setAvailability("available")
            return
        }

        // Debounce the check
        setAvailability("checking")
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(async () => {
            const { available, error: checkError } = await checkSubdomainAvailability(val, project.id)
            if (checkError) {
                setAvailability("error")
            } else {
                setAvailability(available ? "available" : "taken")
            }
        }, 600)
    }

    const handleLogoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0]
        if (!file || !project) return

        if (!file.type.startsWith("image/")) {
            toast.error("Please upload an image file")
            return
        }

        setIsUploadingLogo(true)
        try {
            const fileExt = file.name.split(".").pop()
            const fileName = `${project.id}/logo-${Date.now()}.${fileExt}`

            const { data, error: uploadError } = await supabase.storage
                .from("project-assets")
                .upload(fileName, file, {
                    cacheControl: "3600",
                    upsert: true,
                })

            if (uploadError) throw uploadError

            const { data: { publicUrl } } = supabase.storage
                .from("project-assets")
                .getPublicUrl(data.path)

            setSiteLogoUrl(publicUrl)
            toast.success("Logo uploaded successfully")
        } catch (error: any) {
            console.error("Logo upload failed:", error)
            toast.error("Logo upload failed: " + (error.message || "Unknown error"))
        } finally {
            setIsUploadingLogo(false)
        }
    }

    const handleRemoveLogo = () => {
        setSiteLogoUrl("")
        if (fileInputRef.current) {
            fileInputRef.current.value = ""
        }
    }

    const handlePublish = async () => {
        const validationError = validateSubdomain(subdomain)
        if (validationError) {
            setError(validationError)
            return
        }
        if (availability === "taken") {
            setError("This subdomain is already taken. Please choose another.")
            return
        }

        setIsPublishing(true)
        setError(null)

        const layoutToPublish = [...(project!.project_layout || [])];
        const targetUrl = localStorage.getItem("target_supabase_url");
        const targetKey = localStorage.getItem("target_supabase_key");

        if (targetUrl && targetKey) {
            const configIndex = layoutToPublish.findIndex((c: any) => c.type === 'project-config');
            const configNode = {
                id: 'project-config',
                type: 'project-config',
                props: { supabaseUrl: targetUrl, supabaseKey: targetKey },
                style: { display: 'none' },
                position: { x: 0, y: 0 }
            };
            if (configIndex >= 0) {
                layoutToPublish[configIndex] = configNode;
            } else {
                layoutToPublish.push(configNode);
            }
        }

        try {
            const result = await publishProject(
                project!.id,
                subdomain,
                layoutToPublish,
                project!.pages || [],
                siteTitle,
                siteLogoUrl
            )

            if (result.error) {
                throw new Error(typeof result.error === "string" ? result.error : result.error.message || "Failed to publish")
            }

            if (result.url) {
                setPublishedUrl(result.url)
                onPublishSuccess(result.url)
                toast.success(isAlreadyPublished ? "Site redeployed successfully!" : "Site published successfully!", {
                    description: `Your site is live at ${result.url}`,
                })
            }
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred")
        } finally {
            setIsPublishing(false)
        }
    }

    const handleTakedown = async () => {
        if (takedownInput !== currentSubdomain) return

        setIsTakingDown(true)
        setError(null)

        try {
            const result = await unpublishProject(project!.id)
            if (result.error) {
                throw new Error(typeof result.error === "string" ? result.error : result.error.message || "Failed to takedown site")
            }

            toast.success("Site taken down successfully", {
                description: "Your site is no longer publicly accessible.",
            })
            // Passing empty string signals it's no longer published
            onPublishSuccess("")
            onClose()
        } catch (err: any) {
            setError(err.message || "An unexpected error occurred")
        } finally {
            setIsTakingDown(false)
        }
    }

    if (!isOpen || !project) return null

    const isFormUnchanged = subdomain === currentSubdomain
    const canPublish =
        !isPublishing &&
        !isTakingDown &&
        !!subdomain &&
        !validateSubdomain(subdomain) &&
        availability !== "taken" &&
        availability !== "checking" &&
        availability !== "error"

    return (
        <>
            <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm" onClick={onClose} />
            <div className="fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border bg-background p-6 shadow-lg duration-200 sm:rounded-lg">
                {/* Header */}
                <div className="flex flex-col space-y-1.5 text-center sm:text-left">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                            <Globe className="w-5 h-5 text-blue-500" />
                            <h3 className="text-lg font-semibold leading-none tracking-tight">
                                {isAlreadyPublished ? "Site Settings" : "Publish to Web"}
                            </h3>
                        </div>
                        <Button variant="ghost" size="icon" onClick={onClose} className="h-8 w-8">
                            <X className="w-4 h-4" />
                            <span className="sr-only">Close</span>
                        </Button>
                    </div>
                    <p className="text-sm text-muted-foreground">
                        {isAlreadyPublished
                            ? "Your site is live. You can update your subdomain or redeploy with the latest changes."
                            : "Make your site accessible to the world with a custom subdomain."}
                    </p>
                </div>

                {/* Currently Live Banner */}
                {isAlreadyPublished && publishedUrl && (
                    <div className="rounded-md bg-green-50 dark:bg-green-900/20 p-3 border border-green-200 dark:border-green-800">
                        <div className="flex items-center gap-2 text-green-700 dark:text-green-400 mb-1">
                            <CheckCircle2 className="w-4 h-4 shrink-0" />
                            <span className="font-medium text-sm">Site is Live</span>
                        </div>
                        <a
                            href={publishedUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-sm text-blue-600 dark:text-blue-400 hover:underline break-all flex items-center gap-1"
                        >
                            {publishedUrl}
                            <ExternalLink className="w-3 h-3 shrink-0 inline" />
                        </a>
                        {publishedAt && (
                            <div className="flex items-center gap-1.5 mt-1.5 text-xs text-muted-foreground">
                                <Calendar className="w-3 h-3" />
                                <span>Last deployed: {publishedAt}</span>
                            </div>
                        )}
                    </div>
                )}

                {/* Site Branding */}
                <div className="grid gap-4 py-2">
                    <div className="grid gap-2">
                        <Label htmlFor="siteTitle">Website Title</Label>
                        <Input
                            id="siteTitle"
                            value={siteTitle}
                            onChange={(e) => setSiteTitle(e.target.value)}
                            placeholder="My Awesome Website"
                            disabled={isPublishing || isTakingDown}
                        />
                        <p className="text-[10px] text-muted-foreground">
                            This title will appear in the browser tab.
                        </p>
                    </div>

                    <div className="grid gap-2">
                        <Label>Website Logo</Label>
                        <div className="flex items-center gap-4">
                            <div
                                className="w-16 h-16 rounded-lg border-2 border-dashed border-muted flex items-center justify-center overflow-hidden bg-muted/20 cursor-pointer hover:border-blue-400 transition-colors"
                                onClick={() => !isUploadingLogo && fileInputRef.current?.click()}
                            >
                                {siteLogoUrl ? (
                                    <img src={siteLogoUrl} alt="Logo" className="w-full h-full object-contain" />
                                ) : isUploadingLogo ? (
                                    <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
                                ) : (
                                    <ImageIcon className="w-6 h-6 text-muted-foreground" />
                                )}
                            </div>
                            <div className="flex flex-col gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-8 gap-2"
                                    onClick={() => fileInputRef.current?.click()}
                                    disabled={isUploadingLogo || isPublishing}
                                >
                                    <Upload className="w-3 h-3" />
                                    {siteLogoUrl ? "Change Logo" : "Upload Logo"}
                                </Button>
                                {siteLogoUrl && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        className="h-8 gap-2 text-red-500 hover:text-red-600 hover:bg-red-50"
                                        onClick={handleRemoveLogo}
                                        disabled={isUploadingLogo || isPublishing}
                                    >
                                        <Trash2 className="w-3 h-3" />
                                        Remove
                                    </Button>
                                )}
                            </div>
                            <input
                                type="file"
                                ref={fileInputRef}
                                className="hidden"
                                accept="image/*"
                                onChange={handleLogoUpload}
                            />
                        </div>
                    </div>
                </div>

                {/* Subdomain Input */}
                <div className="grid gap-4">
                    <div className="grid gap-2">
                        <Label htmlFor="subdomain">Subdomain</Label>
                        <div className="flex items-center gap-2">
                            <div className="relative flex-1">
                                <Input
                                    id="subdomain"
                                    value={subdomain}
                                    onChange={handleSubdomainChange}
                                    className={`pr-8 ${error || availability === "taken"
                                        ? "border-red-500 focus-visible:ring-red-500"
                                        : availability === "available"
                                            ? "border-green-500 focus-visible:ring-green-500"
                                            : ""
                                        }`}
                                    placeholder="my-awesome-site"
                                    disabled={isPublishing || isTakingDown}
                                />
                                {/* Availability indicator */}
                                <div className="absolute right-3 top-1/2 -translate-y-1/2">
                                    {availability === "checking" && (
                                        <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                                    )}
                                    {availability === "available" && (
                                        <Check className="w-4 h-4 text-green-500" />
                                    )}
                                    {availability === "taken" && (
                                        <AlertCircle className="w-4 h-4 text-red-500" />
                                    )}
                                </div>
                            </div>
                            <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">
                                .buildxdesigner.site
                            </span>
                        </div>

                        {/* Feedback messages */}
                        {availability === "available" && !isFormUnchanged && (
                            <div className="flex items-center gap-2 text-sm text-green-600">
                                <Check className="w-4 h-4" />
                                <span>Subdomain is available!</span>
                            </div>
                        )}
                        {availability === "taken" && (
                            <div className="flex items-center gap-2 text-sm text-red-500">
                                <AlertCircle className="w-4 h-4" />
                                <span>This subdomain is already taken. Please choose another.</span>
                            </div>
                        )}
                        {availability === "error" && (
                            <div className="flex items-center gap-2 text-sm text-yellow-600">
                                <AlertCircle className="w-4 h-4" />
                                <span>Could not check availability. You can still try to publish.</span>
                            </div>
                        )}
                        {error && !showTakedownConfirm && (
                            <div className="flex items-center gap-2 text-sm text-red-500">
                                <AlertCircle className="w-4 h-4" />
                                <span>{error}</span>
                            </div>
                        )}
                    </div>
                </div>

                {/* Actions */}
                <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 mt-4">
                    <Button variant="outline" onClick={onClose} disabled={isPublishing || isTakingDown}>
                        Cancel
                    </Button>
                    <Button
                        onClick={handlePublish}
                        disabled={!canPublish}
                        className={isAlreadyPublished ? "bg-blue-600 hover:bg-blue-700" : ""}
                    >
                        {isPublishing ? (
                            <>
                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                {isAlreadyPublished ? "Redeploying..." : "Publishing..."}
                            </>
                        ) : isAlreadyPublished ? (
                            <>
                                <RefreshCw className="mr-2 h-4 w-4" />
                                Redeploy
                            </>
                        ) : (
                            "Publish Site"
                        )}
                    </Button>
                </div>

                {/* Takedown Section (Only if published) */}
                {isAlreadyPublished && (
                    <div className="mt-6 pt-6 border-t border-border">
                        {!showTakedownConfirm ? (
                            <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
                                <div className="text-sm">
                                    <h4 className="font-medium text-foreground">Danger Zone</h4>
                                    <p className="text-muted-foreground">Make your site private again.</p>
                                </div>
                                <Button
                                    variant="outline"
                                    className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 dark:border-red-900/50 dark:hover:bg-red-900/20 w-full sm:w-auto"
                                    onClick={() => setShowTakedownConfirm(true)}
                                    disabled={isPublishing || isTakingDown}
                                >
                                    Takedown Website
                                </Button>
                            </div>
                        ) : (
                            <div className="p-4 bg-red-50 dark:bg-red-900/10 border border-red-200 dark:border-red-900/50 rounded-lg space-y-4">
                                <div className="space-y-2">
                                    <h4 className="font-semibold text-red-700 dark:text-red-400">Are you absolutely sure?</h4>
                                    <p className="text-sm text-red-600 dark:text-red-300">
                                        This will immediately make your site inaccessible. To confirm, please type your subdomain: <strong>{currentSubdomain}</strong>
                                    </p>
                                </div>
                                <Input
                                    value={takedownInput}
                                    onChange={(e) => setTakedownInput(e.target.value)}
                                    placeholder={currentSubdomain}
                                    className="border-red-200 focus-visible:ring-red-500"
                                    disabled={isTakingDown}
                                />
                                {error && showTakedownConfirm && (
                                    <div className="flex items-center gap-2 text-sm text-red-500">
                                        <AlertCircle className="w-4 h-4" />
                                        <span>{error}</span>
                                    </div>
                                )}
                                <div className="flex gap-2 justify-end">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => {
                                            setShowTakedownConfirm(false);
                                            setTakedownInput("");
                                        }}
                                        disabled={isTakingDown}
                                    >
                                        Cancel
                                    </Button>
                                    <Button
                                        variant="destructive"
                                        size="sm"
                                        onClick={handleTakedown}
                                        disabled={takedownInput !== currentSubdomain || isTakingDown}
                                    >
                                        {isTakingDown ? (
                                            <>
                                                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                                Taking down...
                                            </>
                                        ) : (
                                            "Confirm Takedown"
                                        )}
                                    </Button>
                                </div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    )
}
