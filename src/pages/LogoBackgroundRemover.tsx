import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Upload, Download } from "lucide-react";
import { toast } from "sonner";
import { removeBackground, loadImage } from "@/utils/removeBackground";

const LogoBackgroundRemover = () => {
  const [originalImage, setOriginalImage] = useState<string | null>(null);
  const [processedImage, setProcessedImage] = useState<string | null>(null);
  const [processing, setProcessing] = useState(false);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Show original image
    setOriginalImage(URL.createObjectURL(file));
    setProcessedImage(null);
    setProcessing(true);

    try {
      toast.info("Processing image...", { description: "This may take a minute" });
      
      const img = await loadImage(file);
      const blob = await removeBackground(img);
      const url = URL.createObjectURL(blob);
      
      setProcessedImage(url);
      toast.success("Background removed successfully!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to remove background", { 
        description: "Please try again or use a different image" 
      });
    } finally {
      setProcessing(false);
    }
  };

  const handleDownload = () => {
    if (!processedImage) return;
    
    const link = document.createElement('a');
    link.href = processedImage;
    link.download = 'qrafts-logo-transparent.png';
    link.click();
  };

  return (
    <div className="min-h-screen bg-background p-8">
      <div className="max-w-4xl mx-auto space-y-8">
        <div className="text-center space-y-2">
          <h1 className="text-4xl font-bold">Logo Background Remover</h1>
          <p className="text-muted-foreground">
            Upload your QRAFTS logo and remove the background
          </p>
        </div>

        <div className="border-2 border-dashed border-border rounded-lg p-12 text-center">
          <input
            type="file"
            accept="image/*"
            onChange={handleFileUpload}
            className="hidden"
            id="file-upload"
          />
          <label htmlFor="file-upload">
            <Button asChild disabled={processing}>
              <span className="cursor-pointer">
                <Upload className="mr-2 h-4 w-4" />
                {processing ? "Processing..." : "Upload Logo"}
              </span>
            </Button>
          </label>
        </div>

        {originalImage && (
          <div className="grid md:grid-cols-2 gap-8">
            <div className="space-y-2">
              <h3 className="font-semibold">Original</h3>
              <div className="border rounded-lg p-4 bg-muted">
                <img src={originalImage} alt="Original" className="w-full h-auto" />
              </div>
            </div>

            {processedImage && (
              <div className="space-y-2">
                <h3 className="font-semibold">Transparent Background</h3>
                <div className="border rounded-lg p-4 bg-gradient-to-br from-muted to-background">
                  <img src={processedImage} alt="Processed" className="w-full h-auto" />
                </div>
                <Button onClick={handleDownload} className="w-full">
                  <Download className="mr-2 h-4 w-4" />
                  Download PNG
                </Button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default LogoBackgroundRemover;
