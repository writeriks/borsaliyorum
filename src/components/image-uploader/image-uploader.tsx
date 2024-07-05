import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { ImagePlus } from "lucide-react";
import React, { ChangeEvent } from "react";

interface ImageUploaderProps {
  onImageUpload: (image: string) => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
  children?: React.ReactNode;
}

const ImageUploader: React.FC<ImageUploaderProps> = ({
  onImageUpload,
  fileInputRef,
  children,
}) => {
  const handleImageChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        onImageUpload(e.target?.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleImageUpload = () => {
    if (fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <>
      <Button
        className="flex items-center p-1 w-10 h-10 rounded-full"
        variant="default"
        onClick={handleImageUpload}
      >
        {children ? children : <ImagePlus />}
      </Button>
      <input
        type="file"
        title="Upload Image"
        ref={fileInputRef}
        className="hidden"
        accept="image/*"
        onChange={handleImageChange}
      />
    </>
  );
};

export default ImageUploader;