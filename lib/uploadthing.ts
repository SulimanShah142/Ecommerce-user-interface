import { generateReactNativeHelpers } from "@uploadthing/expo";
import * as FileSystem from "expo-file-system/legacy";

const SERVER_ORIGIN = "http://192.168.1.3:8787";

const UPLOADTHING_URL = `${SERVER_ORIGIN}/api/uploadthing`;


const { uploadFiles } = generateReactNativeHelpers<any>({
  url: UPLOADTHING_URL,
});

const createUploadFile = async (uri: string, name: string, type: string) => {
  const fileInfo = await FileSystem.getInfoAsync(uri);
  if (!fileInfo.exists) {
    throw new Error(`Local file does not exist: ${uri}`);
  }

  return {
    uri,
    name,
    type,
    size: fileInfo.size ?? 0,
    lastModified: Date.now(),
  } as any;
};

export const uploadImage = async (uri: string): Promise<string> => {
  if (!uri) return "";

  const filename = uri.split("/").pop() ?? `image-${Date.now()}.jpg`;
  const uploadFile = await createUploadFile(uri, filename, "image/jpeg");

  console.log("📄 File to upload:", JSON.stringify({
    uri: uploadFile.uri,
    name: uploadFile.name,
    type: uploadFile.type,
    size: uploadFile.size,
    lastModified: uploadFile.lastModified,
  }));
  console.log("📤 Calling uploadFiles for imageUploader...");

  try {
    const result = await uploadFiles("imageUploader", {
      files: [uploadFile],
    });

    console.log("📥 uploadFiles result:", JSON.stringify(result));

    if (!result || result.length === 0) {
      throw new Error("UploadThing returned no upload result.");
    }

    const uploaded = result[0];
    const url = uploaded.url ?? uploaded.ufsUrl ?? uploaded.appUrl ?? "";
    console.log("✅ Upload successful:", url);
    return url;
  } catch (error: any) {
    console.error("❌ UploadThing Error:", error?.message ?? error);
    if (error?.data) {
      console.error("❌ UploadThing error data:", JSON.stringify(error.data));
    }
    throw error;
  }
};

export { uploadFiles };

