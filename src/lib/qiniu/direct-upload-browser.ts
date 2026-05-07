type TokenResponseOk = {
  success: true;
  data: {
    token: string;
    uploadUrl: string;
    baseUrl: string;
    dirPath?: string | null;
  };
};

type TokenResponseErr = {
  success: false;
  message?: string;
};

function sanitizeExt(fileName: string): string {
  const ext = fileName.split(".").pop();
  if (!ext || ext.length > 12) return "bin";
  return ext.replace(/[^\w\-]/g, "") || "bin";
}

/** 规整 dirPath 为 `a/b/` 形式（可为空）。 */
export function normalizeQiniuDirPath(dirPath: string | undefined | null): string {
  if (!dirPath) return "";
  return dirPath.replace(/^\/+|\/+$/g, "").replace(/\/{2,}/g, "/");
}

/** 上传 key：`{dir}crm-am/{caseId}/{ts}-{rand}.{ext}` */
export function buildCrmAmObjectKey(dirPath: string | undefined | null, caseId: string, fileName: string): string {
  const dir = normalizeQiniuDirPath(dirPath);
  const prefix = dir ? `${dir}/` : "";
  const ext = sanitizeExt(fileName);
  const ts = Date.now();
  const rand = Math.random().toString(36).slice(2, 10);
  return `${prefix}crm-am/${caseId}/${ts}-${rand}.${ext}`;
}

export function publicUrlFromQiniuKey(baseUrl: string, key: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  const k = key.replace(/^\/+/, "");
  return base ? `${base}/${k}` : k;
}

export async function fetchQiniuUploadToken(): Promise<TokenResponseOk["data"]> {
  const tokenResponse = await fetch("/api/qiniu-upload/token", { method: "GET" });
  const tokenData = (await tokenResponse.json()) as TokenResponseOk | TokenResponseErr;
  if (tokenResponse.status === 401) {
    throw new Error("UNAUTHORIZED");
  }
  if (!tokenResponse.ok || !tokenData.success || !("data" in tokenData) || !tokenData.data?.token) {
    const errMsg =
      "message" in tokenData && typeof tokenData.message === "string" ? tokenData.message : "TOKEN_FAILED";
    throw new Error(errMsg);
  }
  return tokenData.data;
}

/**
 * 浏览器表单直传七牛（与 `api-test/upload` 一致：multipart 字段 file、token、key）。
 * 返回可访问文件 URL（依赖 QINIU_BASE_URL）。
 */
export function uploadFileQiniuFormDirect(args: {
  file: File;
  token: string;
  uploadUrl: string;
  baseUrl: string;
  key: string;
  onProgress?: (percent: number) => void;
}): Promise<string> {
  return new Promise((resolve, reject) => {
    const xhr = new XMLHttpRequest();
    xhr.upload.addEventListener("progress", (e) => {
      if (e.lengthComputable && args.onProgress) {
        args.onProgress(Math.round((e.loaded / e.total) * 100));
      }
    });
    xhr.addEventListener("load", () => {
      if (xhr.status !== 200) {
        try {
          const err = JSON.parse(xhr.responseText) as { error?: string };
          reject(new Error(err.error || `HTTP ${xhr.status}`));
        } catch {
          reject(new Error(`HTTP ${xhr.status}`));
        }
        return;
      }
      try {
        const data = JSON.parse(xhr.responseText) as { key?: string; error?: string };
        if (data.key) {
          resolve(publicUrlFromQiniuKey(args.baseUrl, data.key));
        } else if (data.error) {
          reject(new Error(data.error));
        } else {
          reject(new Error("BAD_RESPONSE"));
        }
      } catch {
        reject(new Error("PARSE_ERROR"));
      }
    });
    xhr.addEventListener("error", () => reject(new Error("NETWORK")));
    const formData = new FormData();
    formData.append("file", args.file);
    formData.append("token", args.token);
    formData.append("key", args.key);
    xhr.open("POST", args.uploadUrl);
    xhr.send(formData);
  });
}
