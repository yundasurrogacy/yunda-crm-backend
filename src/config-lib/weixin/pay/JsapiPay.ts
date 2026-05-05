import crypto from "crypto";

const API_HOST = "https://api.mch.weixin.qq.com";

/**
 * 微信支付 直连商户 JSAPI 配置
 */
export interface JsapiPayConfig {
  mchid: string;
  appid: string;
  cert_serial_no: string;
  cert_private_key: string | Buffer;
  apiv3_secret: string;
  notify_url: string;
  notify_forward_url?: string;
  skip_callback_verify?: boolean;
  /** 微信支付公钥（PEM 内容），用于回调解密前验签（公钥模式） */
  wechatpay_public_key?: string;
}

/** 直连 JSAPI 下单请求体（微信 API） */
interface JsapiBody {
  appid: string;
  mchid: string;
  description: string;
  out_trade_no: string;
  notify_url: string;
  amount: { total: number; currency: string };
  payer: { openid: string };
  attach?: string;
}

/** 微信 attach 最大 127 字节，用短 key "f" 存 notify_forward_url */
const ATTACH_MAX_LEN = 127;
function buildAttachForForwardUrl(notifyForwardUrl: string): string | undefined {
  const url = notifyForwardUrl.trim();
  if (!url) return undefined;
  const attach = JSON.stringify({ f: url });
  return attach.length <= ATTACH_MAX_LEN ? attach : undefined;
}

/** 直连 JSAPI 下单返回（微信原始） */
interface JsapiPrepayResponse {
  prepay_id?: string;
  code?: string;
  message?: string;
  [key: string]: unknown;
}

/**
 * 调起支付参数（与 WeChatPay 组件 paymentData 一致）
 */
export interface PayParams {
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: string;
  paySign: string;
  appId?: string;
}

/** 直连查询订单返回（含 trade_state、transaction_id 等） */
export interface JsapiQueryResult {
  trade_state?: string;
  transaction_id?: string;
  out_trade_no?: string;
  amount?: { total?: number; payer_total?: number; currency?: string };
  payer?: { openid?: string };
  [key: string]: unknown;
}

/** 直连回调验签解密结果 */
export interface WxPayCallbackResource {
  original_type?: string;
  appid?: string;
  mchid?: string;
  out_trade_no?: string;
  transaction_id?: string;
  trade_type?: string;
  trade_state?: string;
  trade_state_desc?: string;
  bank_type?: string;
  attach?: string;
  success_time?: string;
  payer?: { openid: string };
  amount?: {
    total: number;
    payer_total: number;
    currency: string;
    payer_currency: string;
  };
  out_refund_no?: string;
  refund_id?: string;
  refund_status?: string;
  refund_success_time?: string;
  [key: string]: unknown;
}

export interface WxPayCallbackResult {
  id: string;
  create_time: string;
  event_type: string;
  resource_type: string;
  summary: string;
  resource: WxPayCallbackResource;
}

/** 直连退款参数 */
export interface JsapiRefundParams {
  out_trade_no: string;
  out_refund_no: string;
  refund_amount: number;
  total_amount: number;
  reason?: string;
}

function normalizePrivateKey(privateKey: string | Buffer): string {
  if (Buffer.isBuffer(privateKey)) return privateKey.toString("utf8").replace(/\\n/g, "\n").trim();
  const s = String(privateKey).replace(/\\n/g, "\n").trim();
  return s.includes("-----") ? s : `-----BEGIN PRIVATE KEY-----\n${s}\n-----END PRIVATE KEY-----`;
}

function signWithPrivateKey(str: string, privateKey: string | Buffer): string {
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(str);
  sign.end();
  return sign.sign(normalizePrivateKey(privateKey), "base64");
}

function buildAuth(config: JsapiPayConfig, method: string, urlPath: string, body?: string): string {
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = crypto.randomBytes(16).toString("hex");
  const signStr = body != null ? `${method}\n${urlPath}\n${timestamp}\n${nonceStr}\n${body}\n` : `${method}\n${urlPath}\n${timestamp}\n${nonceStr}\n\n`;
  const signature = signWithPrivateKey(signStr, config.cert_private_key);
  return `WECHATPAY2-SHA256-RSA2048 mchid="${config.mchid}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${config.cert_serial_no}"`;
}

/** AES-256-GCM 解密（与微信回调 resource 格式一致） */
function decipherGcm(
  ciphertextBase64: string,
  associatedData: string,
  nonce: string,
  apiv3Key: string
): Record<string, unknown> {
  const keyBuf = Buffer.from(apiv3Key, "utf8");
  if (keyBuf.length !== 32) throw new Error(`wxpay_apiv3_secret 须为 32 字节，当前 ${keyBuf.length} 字节`);
  const raw = Buffer.from(ciphertextBase64, "base64");
  const authTag = raw.subarray(raw.length - 16);
  const data = raw.subarray(0, raw.length - 16);
  const decipher = crypto.createDecipheriv("aes-256-gcm", keyBuf, Buffer.from(nonce, "utf8"));
  decipher.setAuthTag(authTag);
  decipher.setAAD(Buffer.from(associatedData, "utf8"));
  const decoded = decipher.update(data, undefined, "utf8") + decipher.final("utf8");
  return JSON.parse(decoded) as Record<string, unknown>;
}

function verifySignWithPublicKey(
  timestamp: string,
  nonce: string,
  body: string,
  signature: string,
  publicKeyPem: string
): boolean {
  const pem = publicKeyPem.replace(/\\n/g, "\n").trim();
  const str = `${timestamp}\n${nonce}\n${body}\n`;
  return crypto.createVerify("RSA-SHA256").update(str, "utf8").verify(pem, signature, "base64");
}

function generateOrderNo(): string {
  return "WX" + Date.now() + Math.floor(Math.random() * 1000000);
}

/**
 * 直连商户 JSAPI 下单
 * 返回 paymentData 可直接给 WeChatPay 组件使用
 */
export async function jsapiPrepay(
  config: JsapiPayConfig,
  params: {
    openid: string;
    amount: number;
    description: string;
    out_trade_no?: string;
    appid?: string;
    notify_url?: string;
    /** 下单时传入则写入 attach，回调时优先转发到此 URL（attach 限 127 字节，超长则忽略） */
    notify_forward_url?: string;
  }
): Promise<{ paymentData: string; payParams: PayParams; out_trade_no: string }> {
  const out_trade_no = params.out_trade_no || generateOrderNo();
  const appid = (params.appid?.trim() || config.appid) as string;
  const notifyUrl = params.notify_url?.trim() || config.notify_url;
  const urlPath = "/v3/pay/transactions/jsapi";
  const body: JsapiBody = {
    appid,
    mchid: config.mchid,
    description: params.description,
    out_trade_no,
    notify_url: notifyUrl,
    amount: { total: params.amount, currency: "CNY" },
    payer: { openid: params.openid },
  };
  const attach = buildAttachForForwardUrl(params.notify_forward_url ?? "");
  if (attach) body.attach = attach;
  const bodyStr = JSON.stringify(body);
  const token = buildAuth(config, "POST", urlPath, bodyStr);
  const res = await fetch(`${API_HOST}${urlPath}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: token,
    },
    body: bodyStr,
  });
  const result = (await res.json()) as JsapiPrepayResponse;
  if (!res.ok || result.code) {
    throw new Error(String(result.message || result.code || res.statusText));
  }
  const prepay_id = result.prepay_id;
  if (!prepay_id) throw new Error("微信未返回 prepay_id");

  const timeStamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = crypto.randomBytes(16).toString("hex");
  const pkg = `prepay_id=${prepay_id}`;
  const paySignStr = `${appid}\n${timeStamp}\n${nonceStr}\n${pkg}\n`;
  const paySign = signWithPrivateKey(paySignStr, config.cert_private_key);
  const payParams: PayParams = {
    timeStamp,
    nonceStr,
    package: pkg,
    signType: "RSA",
    paySign,
    appId: appid,
  };
  const paymentData = JSON.stringify({
    appId: payParams.appId,
    timeStamp: payParams.timeStamp,
    nonceStr: payParams.nonceStr,
    package: payParams.package,
    signType: payParams.signType,
    paySign: payParams.paySign,
  });
  return { paymentData, payParams, out_trade_no };
}

/**
 * 直连商户 查询订单状态
 */
export async function jsapiQueryOrder(
  config: JsapiPayConfig,
  params: { out_trade_no: string }
): Promise<JsapiQueryResult> {
  const urlPath = `/v3/pay/transactions/out-trade-no/${encodeURIComponent(params.out_trade_no)}?mchid=${config.mchid}`;
  const token = buildAuth(config, "GET", urlPath);
  const res = await fetch(`${API_HOST}${urlPath}`, {
    method: "GET",
    headers: { Accept: "application/json", Authorization: token },
  });
  const result = (await res.json()) as JsapiQueryResult & { code?: string; message?: string };
  if (!res.ok || result.code) {
    throw new Error(String(result.message || result.code || res.statusText));
  }
  return result as JsapiQueryResult;
}

/**
 * 直连商户 回调验签与解密
 * 验签：若配置了 wechatpay_public_key 则用本地公钥验签；若 skip_callback_verify 则只解密。
 */
export async function jsapiVerifyCallback(
  config: JsapiPayConfig,
  rawBody: string,
  headers: Record<string, string>
): Promise<WxPayCallbackResult> {
  const body = JSON.parse(rawBody) as Record<string, unknown>;
  const resource = body.resource as { ciphertext: string; associated_data?: string; nonce: string };
  if (!resource?.ciphertext || !resource?.nonce) {
    throw new Error("回调 body.resource 不完整");
  }
  const keyLen = Buffer.byteLength(config.apiv3_secret, "utf8");
  if (keyLen !== 32) {
    throw new Error(
      `wxpay_apiv3_secret 必须为 32 字节（通常为 32 个字符），当前为 ${keyLen} 字节。请检查商户平台「API 安全」中的 APIv3 密钥`
    );
  }
  if (!config.skip_callback_verify) {
    const timestamp = headers["wechatpay-timestamp"];
    const nonce = headers["wechatpay-nonce"];
    const signature = headers["wechatpay-signature"];
    if (!timestamp || !nonce || !signature) {
      throw new Error("回调头不完整（验签需要 Wechatpay-Timestamp/Nonce/Signature）");
    }
    const pubKey = config.wechatpay_public_key?.replace(/\\n/g, "\n").trim();
    if (!pubKey) {
      throw new Error(
        "未配置 wechatpay_public_key 且未开启 skip_callback_verify。请配置 wxpay_wechatpay_public_key（PEM 内容）或设置 wxpay_skip_callback_verify=true"
      );
    }
    const ok = verifySignWithPublicKey(timestamp, nonce, rawBody, signature, pubKey);
    if (!ok) throw new Error("回调验签失败");
  }
  const decrypted = decipherGcm(
    resource.ciphertext,
    resource.associated_data ?? "",
    resource.nonce,
    config.apiv3_secret
  );
  return {
    id: String(body.id ?? ""),
    create_time: String(body.create_time ?? ""),
    event_type: String(body.event_type ?? ""),
    resource_type: String(body.resource_type ?? ""),
    summary: String(body.summary ?? ""),
    resource: decrypted as WxPayCallbackResource,
  };
}

/**
 * 直连商户 退款（V3 退款接口，需证书）
 */
export async function jsapiRefund(
  config: JsapiPayConfig,
  params: JsapiRefundParams
): Promise<{ refund_id?: string; [key: string]: unknown }> {
  const urlPath = "/v3/refund/domestic/refunds";
  const body = {
    out_trade_no: params.out_trade_no,
    out_refund_no: params.out_refund_no,
    reason: params.reason || "用户申请退款",
    amount: {
      refund: params.refund_amount,
      total: params.total_amount,
      currency: "CNY" as const,
    },
    notify_url: config.notify_url,
  };
  const bodyStr = JSON.stringify(body);
  const token = buildAuth(config, "POST", urlPath, bodyStr);
  const res = await fetch(`${API_HOST}${urlPath}`, {
    method: "POST",
    headers: {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: token,
    },
    body: bodyStr,
  });
  const result = (await res.json()) as Record<string, unknown> & { code?: string; message?: string };
  if (!res.ok || result.code) {
    throw new Error(String(result.message || result.code || res.statusText));
  }
  return result;
}
