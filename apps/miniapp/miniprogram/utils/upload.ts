import { clearLocalAuth, getApiUrl, getToken, redirectToLogin, request } from "./api";

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
  let policy: UploadPolicy;
  try {
    policy = await request<UploadPolicy>({
      url: "/files/upload-policy",
      method: "POST",
      data: {
        fileName: filePath.split("/").pop() || "image.jpg",
        mimeType,
        size: fileInfo.size
      }
    });
  } catch (error) {
    if (isLocalUploadFallbackError(error)) {
      return uploadToApi(filePath, {
        url: "/files/upload"
      });
    }

    throw error;
  }

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

export async function uploadAvatar(filePath: string): Promise<UploadedFile> {
  return uploadToApi(filePath, {
    url: "/files/avatar"
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

        if (res.statusCode === 401) {
          clearLocalAuth();
          redirectToLogin();
          reject({
            ...res,
            authRequired: true
          });
          return;
        }

        reject(res);
      },
      fail: reject
    });
  });
}

function uploadToApi(
  filePath: string,
  options: { url: string }
): Promise<UploadedFile> {
  return new Promise((resolve, reject) => {
    const token = getToken();

    wx.uploadFile({
      url: getApiUrl(options.url),
      filePath,
      name: "file",
      header: {
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      },
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          const body = JSON.parse(res.data) as { data: UploadedFile };
          resolve(body.data);
          return;
        }

        if (res.statusCode === 401) {
          clearLocalAuth();
          redirectToLogin();
          reject({
            ...res,
            authRequired: true
          });
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

function isLocalUploadFallbackError(error: unknown): boolean {
  if (!error || typeof error !== "object") {
    return false;
  }

  const response = error as WechatMiniprogram.RequestSuccessCallbackResult;
  const data = response.data as { message?: string } | undefined;
  return (
    response.statusCode === 400 &&
    typeof data?.message === "string" &&
    data.message.startsWith("OSS_")
  );
}
