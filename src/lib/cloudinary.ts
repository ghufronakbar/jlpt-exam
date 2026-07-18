import "server-only";
import { v2 as cloudinary } from "cloudinary";
import { env } from "@/constants";

cloudinary.config({
  cloud_name: env.CLOUDINARY_CLOUD_NAME,
  api_key: env.CLOUDINARY_API_KEY,
  api_secret: env.CLOUDINARY_API_SECRET,
});

export type SignedUploadParams = {
  timestamp: number;
  folder: string;
  signature: string;
  apiKey: string;
  cloudName: string;
};

// Client uploads directly to Cloudinary (never through our server) using these
// signed params — api_secret itself never leaves the server.
export function createSignedUploadParams(folder: string): SignedUploadParams {
  const timestamp = Math.round(Date.now() / 1000);
  const signature = cloudinary.utils.api_sign_request(
    { timestamp, folder },
    env.CLOUDINARY_API_SECRET,
  );

  return {
    timestamp,
    folder,
    signature,
    apiKey: env.CLOUDINARY_API_KEY,
    cloudName: env.CLOUDINARY_CLOUD_NAME,
  };
}
