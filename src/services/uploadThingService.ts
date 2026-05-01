/**
 * UploadThing service for MyMentor (V7 API).
 * Updated to match the latest UploadThing protocol for pure-client apps.
 */
export const uploadWithUploadThing = async (file: File): Promise<string> => {
  try {
    const TOKEN = import.meta.env.VITE_UPLOADTHING_TOKEN;
    if (!TOKEN) throw new Error("UploadThing Token missing in .env");

    const decodedToken = JSON.parse(atob(TOKEN));
    const apiKey = decodedToken.apiKey;

    // 1. Prepare Upload Request (V7 protocol)
    const requestResponse = await fetch(`https://api.uploadthing.com/v7/uploadFiles`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-uploadthing-api-key": apiKey,
      },
      body: JSON.stringify({
        files: [{ 
          name: file.name, 
          size: file.size, 
          type: file.type || "application/pdf" 
        }],
        isServerSide: true,
      }),
    });

    if (!requestResponse.ok) {
      const errorText = await requestResponse.text();
      console.error("UploadThing API Error Response:", errorText);
      throw new Error(`UploadThing Request Failed: ${requestResponse.status}`);
    }

    const data = await requestResponse.json();
    
    // V7 structure: response is an array of objects which contain a 'data' object
    if (!data[0] || !data[0].data) {
      throw new Error("Invalid response structure from UploadThing V7");
    }

    const { url, fields, fileKey } = data[0].data;

    // 2. Perform multipart upload to S3 using the presigned URL
    const formData = new FormData();
    Object.entries(fields).forEach(([key, value]) => {
      formData.append(key, value as string);
    });
    formData.append("file", file);

    const uploadResponse = await fetch(url, {
      method: "POST",
      body: formData,
    });

    if (!uploadResponse.ok) {
      throw new Error("Physical storage upload failed (S3)");
    }

    // 3. Return the final public URL
    return `https://utfs.io/f/${fileKey}`;
  } catch (error) {
    console.error("UploadThing Service Error:", error);
    throw error;
  }
};
