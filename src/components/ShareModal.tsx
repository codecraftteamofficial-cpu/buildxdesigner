import React, { useState, useEffect, useMemo } from "react";
import { motion, AnimatePresence } from "motion/react";
import {
  X,
  Share2,
  Copy,
  Mail,
  MessageCircle,
  Users,
  Eye,
  EyeOff,
  Link2,
  Facebook,
  Twitter,
  Linkedin,
  QrCode,
  Download,
} from "lucide-react";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Badge } from "./ui/badge";
import { Switch } from "./ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "./ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "./ui/select";
import { toast } from "sonner";
import { ComponentData } from "../App";

interface ShareModalProps {
  isOpen: boolean;
  onClose: () => void;
  components: ComponentData[];
}

interface ShareSettings {
  isPublic: boolean;
  allowComments: boolean;
  allowDownload: boolean;
  expiresIn: string;
  password: string;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  onClose,
  components,
}) => {
  const [shareSettings, setShareSettings] = useState<ShareSettings>({
    isPublic: true,
    allowComments: false,
    allowDownload: true,
    expiresIn: "never",
    password: "",
  });

  const [shareUrl, setShareUrl] = useState("");

  useEffect(() => {
    if (!isOpen) return;
    if (typeof window !== "undefined") {
      setShareUrl(window.location.href);
    }
  }, [isOpen]);

  const embedCode = useMemo(
    () =>
      shareUrl
        ? `<iframe src="${shareUrl}" width="100%" height="500" frameborder="0" allowfullscreen></iframe>`
        : "",
    [shareUrl],
  );

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    toast.success(`${label} copied to clipboard!`);
  };

  const shareViaEmail = () => {
    const subject = encodeURIComponent("Check out my FullDev AI project");
    const body = encodeURIComponent(
      `I've created an amazing website using FullDev AI! Take a look: ${shareUrl}`,
    );
    window.open(`mailto:?subject=${subject}&body=${body}`);
  };

  const shareViaSocial = (platform: string) => {
    const text = encodeURIComponent(
      "Check out my amazing website built with FullDev AI!",
    );
    const url = encodeURIComponent(shareUrl);

    const urls = {
      twitter: `https://twitter.com/intent/tweet?text=${text}&url=${url}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${url}`,
      linkedin: `https://www.linkedin.com/sharing/share-offsite/?url=${url}`,
    };

    window.open(urls[platform as keyof typeof urls], "_blank");
  };

  const generateQRCode = () => {
    // In a real app, you would generate an actual QR code
    toast.success("QR code generated! (This is a demo)");
  };

  const handleSettingChange =
    (field: keyof ShareSettings) => (value: string | boolean) => {
      setShareSettings((prev) => ({ ...prev, [field]: value }));
    };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="absolute inset-0 bg-black/60 backdrop-blur-md"
        />

        {/* Modal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 40 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 40 }}
          transition={{ duration: 0.3 }}
          className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        >
          <Card className="shadow-2xl border-0">
            <CardHeader className="relative text-center pb-4">
              <button
                onClick={onClose}
                className="absolute top-4 right-4 p-2 hover:bg-muted rounded-full transition-colors"
              >
                <X className="w-4 h-4" />
              </button>

              <div className="w-16 h-16 mx-auto mb-4 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center shadow-lg">
                <Share2 className="w-8 h-8 text-white" />
              </div>

              <CardTitle className="text-2xl font-bold mb-2">
                Share Your Project
              </CardTitle>

              <p className="text-muted-foreground text-sm">
                Share your FullDev AI project with others or embed it anywhere
              </p>
            </CardHeader>

            <CardContent>
              <Tabs defaultValue="link" className="w-full">
                <TabsList className="grid w-full grid-cols-3">
                  <TabsTrigger value="link" className="flex items-center gap-2">
                    <Link2 className="w-4 h-4" />
                    Link
                  </TabsTrigger>
                  <TabsTrigger
                    value="social"
                    className="flex items-center gap-2"
                  >
                    <Users className="w-4 h-4" />
                    Social
                  </TabsTrigger>
                  <TabsTrigger
                    value="embed"
                    className="flex items-center gap-2"
                  >
                    <QrCode className="w-4 h-4" />
                    Embed
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="link" className="space-y-6 mt-6">
                  {/* Share Settings */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Share Settings</h3>

                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Visibility</Label>
                          <p className="text-sm text-muted-foreground">
                            Choose who can view this project
                          </p>
                        </div>
                        <Select
                          value={shareSettings.isPublic ? "public" : "private"}
                          onValueChange={(next: string) => {
                            if (next === "public" || next === "private") {
                              handleSettingChange("isPublic")(next === "public");
                            }
                          }}
                        >
                          <SelectTrigger className="w-[220px]">
                            <SelectValue placeholder="Select visibility" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="public">
                              Anyone with the link
                            </SelectItem>
                            <SelectItem value="private">Private</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Allow Comments</Label>
                          <p className="text-sm text-muted-foreground">
                            Viewers can leave feedback
                          </p>
                        </div>
                        <Switch
                          checked={shareSettings.allowComments}
                          onCheckedChange={(checked) =>
                            handleSettingChange("allowComments")(checked)
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <Label>Allow Download</Label>
                          <p className="text-sm text-muted-foreground">
                            Viewers can download the code
                          </p>
                        </div>
                        <Switch
                          checked={shareSettings.allowDownload}
                          onCheckedChange={(checked) =>
                            handleSettingChange("allowDownload")(checked)
                          }
                        />
                      </div>
                    </div>
                  </div>

                  {/* Password Protection */}
                  <div className="space-y-2">
                    <Label htmlFor="password">
                      Password Protection (Optional)
                    </Label>
                    <Input
                      id="password"
                      type="password"
                      placeholder="Enter password to protect your project"
                      value={shareSettings.password}
                      onChange={(e) =>
                        handleSettingChange("password")(e.target.value)
                      }
                    />
                  </div>

                  {/* Share URL */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <Label>Share URL</Label>
                      <Badge
                        variant="secondary"
                        className="flex items-center gap-1"
                      >
                        {shareSettings.isPublic ? (
                          <>
                            <Eye className="w-3 h-3" />
                            Public
                          </>
                        ) : (
                          <>
                            <EyeOff className="w-3 h-3" />
                            Private
                          </>
                        )}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-2">
                      <Input
                        value={shareUrl}
                        readOnly
                        className="font-mono text-sm"
                      />
                      <Button
                        variant="outline"
                        onClick={() => copyToClipboard(shareUrl, "Share URL")}
                      >
                        <Copy className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  {/* Quick Actions */}
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={shareViaEmail}
                    >
                      <Mail className="w-4 h-4 mr-2" />
                      Email
                    </Button>
                    <Button
                      variant="outline"
                      className="flex-1"
                      onClick={() => copyToClipboard(shareUrl, "Share URL")}
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Link
                    </Button>
                  </div>
                </TabsContent>

                <TabsContent value="social" className="space-y-6 mt-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">
                      Share on Social Media
                    </h3>
                    <p className="text-muted-foreground text-sm">
                      Share your amazing creation with your social networks
                    </p>
                  </div>

                  {/* Social Media Buttons */}
                  <div className="grid grid-cols-1 gap-3">
                    <Button
                      variant="outline"
                      className="w-full justify-start h-12 bg-blue-50 border-blue-200 hover:bg-blue-100"
                      onClick={() => shareViaSocial("twitter")}
                    >
                      <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center mr-3">
                        <Twitter className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium">Share on Twitter</div>
                        <div className="text-sm text-muted-foreground">
                          Tweet about your project
                        </div>
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full justify-start h-12 bg-blue-50 border-blue-200 hover:bg-blue-100"
                      onClick={() => shareViaSocial("facebook")}
                    >
                      <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center mr-3">
                        <Facebook className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium">Share on Facebook</div>
                        <div className="text-sm text-muted-foreground">
                          Post to your timeline
                        </div>
                      </div>
                    </Button>

                    <Button
                      variant="outline"
                      className="w-full justify-start h-12 bg-blue-50 border-blue-200 hover:bg-blue-100"
                      onClick={() => shareViaSocial("linkedin")}
                    >
                      <div className="w-8 h-8 bg-blue-700 rounded-full flex items-center justify-center mr-3">
                        <Linkedin className="w-4 h-4 text-white" />
                      </div>
                      <div className="text-left">
                        <div className="font-medium">Share on LinkedIn</div>
                        <div className="text-sm text-muted-foreground">
                          Share with your network
                        </div>
                      </div>
                    </Button>
                  </div>

                  {/* Direct Invite */}
                  <div className="space-y-3">
                    <Label>Direct Invite</Label>
                    <div className="flex gap-2">
                      <Input
                        placeholder="Enter email addresses separated by commas"
                        className="flex-1"
                      />
                      <Button>
                        <Mail className="w-4 h-4 mr-2" />
                        Send
                      </Button>
                    </div>
                  </div>
                </TabsContent>

                <TabsContent value="embed" className="space-y-6 mt-6">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Embed Options</h3>
                    <p className="text-muted-foreground text-sm">
                      Embed your project in other websites or generate a QR code
                    </p>
                  </div>

                  {/* Embed Code */}
                  <div className="space-y-2">
                    <Label>Embed Code</Label>
                    <div className="relative">
                      <textarea
                        value={embedCode}
                        readOnly
                        className="w-full h-24 p-3 font-mono text-sm border rounded-md resize-none bg-muted"
                      />
                    </div>
                    <Button
                      variant="outline"
                      onClick={() => copyToClipboard(embedCode, "Embed code")}
                      className="w-full"
                    >
                      <Copy className="w-4 h-4 mr-2" />
                      Copy Embed Code
                    </Button>
                  </div>

                  {/* QR Code */}
                  <div className="space-y-4">
                    <Label>QR Code</Label>
                    <div className="p-6 border rounded-lg text-center bg-muted">
                      <div className="w-32 h-32 mx-auto bg-gradient-to-br from-gray-300 to-gray-400 rounded-lg flex items-center justify-center mb-4">
                        <QrCode className="w-16 h-16 text-gray-600" />
                      </div>
                      <p className="text-sm text-muted-foreground mb-4">
                        Generate a QR code for easy mobile sharing
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={generateQRCode}
                        >
                          <QrCode className="w-4 h-4 mr-2" />
                          Generate QR
                        </Button>
                        <Button variant="outline" className="flex-1">
                          <Download className="w-4 h-4 mr-2" />
                          Download
                        </Button>
                      </div>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
