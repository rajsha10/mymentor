export const uploadToCloudinary = async (file: File): Promise<string> => {
  const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error("Cloudinary configuration is missing in environment variables.");
  }

  const formData = new FormData();
  formData.append('file', file);
  formData.append('upload_preset', uploadPreset);

  const isImage = file.type.startsWith('image/');
  const extension = file.name.split('.').pop()?.toLowerCase();
  const isPdf = extension === 'pdf';
  
  // Explicitly set resource type based on file extension to avoid Cloudinary auto mistakes
  const resourceType = isPdf ? 'raw' : (isImage ? 'image' : 'auto');

  try {
    const response = await fetch(
      `https://api.cloudinary.com/v1_1/${cloudName}/${resourceType}/upload`,
      {
        method: 'POST',
        body: formData,
      }
    );

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Cloudinary Detailed Error:", errorData);
      throw new Error(errorData.error?.message || 'Failed to upload file to Cloudinary');
    }

    const data = await response.json();
    return data.secure_url;


  } catch (error) {
    console.error("Cloudinary upload error:", error);
    throw error;
  }
};
