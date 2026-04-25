import { request } from "./api";

type UploadPolicy = {
  uploadUrl: string;
  fileUrl: string;
  storageKey: string;
  formData: Record<string, string>;
};

type UploadedFile = {
  id: string;
  url: string;
  mimeType: string;
  size: number;
};

export async function uploadImage(filePath: string): Promise<UploadedFile> {
  const fileInfo = await getFileInfo(filePath);
  const mimeType = inferMimeType(filePath);
  const policy = await request<UploadPolicy>({
    url: "/files/upload-policy",
    method: "POST",
    data: {
      fileName: filePath.split("/").pop() || "image.jpg",
      mimeType,
      size: fileInfo.size
    }
  });

  await uploadToOss(filePath, policy);

  return request<UploadedFile>({
    url: "/files/confirm",
    method: "POST",
    data: {
      storageKey: policy.storageKey,
      url: policy.fileUrl,
      mimeType,
      size: fileInfo.size
    }
  });
}

function getFileInfo(filePath: string): Promise<WechatMiniprogram.GetFileInfoSuccessCallbackResult> {
  return new Promise((resolve, reject) => {
    wx.getFileInfo({
      filePath,
      success: resolve,
      fail: reject
    });
  });
}

function uploadToOss(filePath: string, policy: UploadPolicy): Promise<void> {
  return new Promise((resolve, reject) => {
    wx.uploadFile({
      url: policy.uploadUrl,
      filePath,
      name: "file",
      formData: policy.formData,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve();
          return;
        }

        reject(res);
      },
      fail: reject
    });
  });
}

function inferMimeType(filePath: string): string {
  const lower = filePath.toLowerCase();
  if (lower.endsWith(".png")) {
    return "image/png";
  }
  if (lower.endsWith(".webp")) {
    return "image/webp";
  }
  if (lower.endsWith(".gif")) {
    return "image/gif";
  }

  return "image/jpeg";
}
