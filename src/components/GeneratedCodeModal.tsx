"use client"

import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Copy, Download, Check } from "lucide-react"

interface GeneratedCodeModalProps {
  isOpen: boolean
  onClose: () => void
  code: string
  components: any[]
}

export function GeneratedCodeModal({ isOpen, onClose, code, components }: GeneratedCodeModalProps) {
  const [copied, setCopied] = useState(false)

  const handleCopyCode = () => {
    navigator.clipboard.writeText(code)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  const handleDownloadCode = () => {
    const element = document.createElement("a")
    const file = new Blob([code], { type: "text/typescript" })
    element.href = URL.createObjectURL(file)
    element.download = "generated-component.tsx"
    document.body.appendChild(element)
    element.click()
    document.body.removeChild(element)
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col border-border bg-background">
        <DialogHeader>
          <DialogTitle>Generated Code</DialogTitle>
          <p className="text-sm text-muted-foreground mt-2">Your AI-generated React component is ready to use</p>
        </DialogHeader>

        <Tabs defaultValue="code" className="flex-1 flex flex-col">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="code">React Code</TabsTrigger>
            <TabsTrigger value="preview">Components ({components.length})</TabsTrigger>
          </TabsList>

          <TabsContent value="code" className="flex-1 overflow-auto">
            <div className="bg-muted/50 border border-border rounded-lg p-4 font-mono text-sm overflow-auto max-h-[500px] relative">
              <pre className="text-foreground whitespace-pre-wrap wrap-break-word">{code}</pre>

              {/* Copy button overlay */}
              <div className="absolute top-3 right-3 flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleCopyCode}
                  className="flex items-center gap-2 bg-transparent"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4" />
                      Copied!
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </Button>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="preview" className="flex-1 overflow-auto">
            <div className="p-4 space-y-3">
              <p className="text-sm text-muted-foreground">Generated {components.length} components:</p>
              <div className="grid gap-2">
                {components.map((comp, idx) => (
                  <div key={idx} className="p-3 bg-muted/30 border border-border rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-semibold text-sm text-foreground">{comp.type || `Component ${idx + 1}`}</p>
                        <p className="text-xs text-muted-foreground">ID: {comp.id}</p>
                      </div>
                      <span className="text-xs bg-blue-500/20 text-blue-400 px-2 py-1 rounded">{comp.type}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </TabsContent>
        </Tabs>

        <div className="flex gap-2 justify-end pt-4 border-t border-border">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            onClick={handleDownloadCode}
            className="bg-linear-to-r from-blue-600 to-violet-600 hover:from-blue-700 hover:to-violet-700"
          >
            <Download className="w-4 h-4 mr-2" />
            Download Code
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
