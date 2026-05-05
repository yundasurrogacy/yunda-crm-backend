import crypto from "crypto";

/**
 * 微信支付 服务商模式 配置
 * sp_cert_serial_no：商户 API 证书序列号，用于请求签名头 Authorization
 * wechatpay_serial：微信支付公钥 ID（公钥模式），放入请求头 Wechatpay-Serial
 * wechatpay_public_key：微信支付公钥（PEM 内容），用于回调解密前验签
 */
export interface PartnerJsapiPayConfig {
  sp_mchid: string;
  sp_appid: string;
  sp_cert_serial_no: string;
  sp_cert_private_key: string;
  sp_apiv3_secret: string;
  api_host?: string;
  notify_url: string;
  notify_forward_url?: string;
  skip_callback_verify?: boolean;
  wechatpay_serial?: string;
  wechatpay_public_key?: string;
}

/**
 * 服务商 JSAPI 下单请求体（partner）
 */
interface PartnerJsapiBody {
  sp_appid: string;
  sp_mchid: string;
  sub_mchid: string;
  sub_appid?: string;
  description: string;
  out_trade_no: string;
  notify_url: string;
  amount: { total: number; currency: string };
  payer: { sp_openid?: string; sub_openid?: string };
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

/**
 * 服务商 JSAPI 下单返回（微信原始）
 */
interface PartnerJsapiResponse {
  prepay_id?: string;
  code?: string;
  message?: string;
  error?: string;
}

/**
 * 调起支付参数（与 WeChatPay 组件 paymentData 一致）
 * 公众号 JSAPI 调起必须带 appId，小程序不需要前端传但带上无害
 */
export interface PayParams {
  appId?: string;
  timeStamp: string;
  nonceStr: string;
  package: string;
  signType: string;
  paySign: string;
}

function normalizePrivateKey(privateKey: string): string {
  const s = privateKey.replace(/\\n/g, "\n").trim();
  return s.includes("-----") ? s : `-----BEGIN PRIVATE KEY-----\n${s}\n-----END PRIVATE KEY-----`;
}

function signWithPrivateKey(str: string, privateKey: string): string {
  const sign = crypto.createSign("RSA-SHA256");
  sign.update(str);
  sign.end();
  return sign.sign(normalizePrivateKey(privateKey), "base64");
}

function buildRequestHeaders(config: PartnerJsapiPayConfig, base: Record<string, string>): Record<string, string> {
  const headers = { ...base };
  if (config.wechatpay_serial?.trim()) headers["Wechatpay-Serial"] = config.wechatpay_serial.trim();
  return headers;
}

/** AES-256-GCM 解密（与微信回调 resource 格式一致：ciphertext base64，后 16 字节为 authTag） */
function decipherGcm(
  ciphertextBase64: string,
  associatedData: string,
  nonce: string,
  apiv3Key: string
): Record<string, unknown> {
  const keyBuf = Buffer.from(apiv3Key, "utf8");
  if (keyBuf.length !== 32) throw new Error(`APIv3 密钥须为 32 字节，当前 ${keyBuf.length} 字节`);
  const raw = Buffer.from(ciphertextBase64, "base64");
  const authTag = raw.subarray(raw.length - 16);
  const data = raw.subarray(0, raw.length - 16);
  const decipher = crypto.createDecipheriv("aes-256-gcm", keyBuf, Buffer.from(nonce, "utf8"));
  decipher.setAuthTag(authTag);
  decipher.setAAD(Buffer.from(associatedData, "utf8"));
  const decoded = decipher.update(data, undefined, "utf8") + decipher.final("utf8");
  return JSON.parse(decoded) as Record<string, unknown>;
}

/** 使用微信支付公钥验签（timestamp\\nnonce\\nbody\\n 的 RSA-SHA256） */
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

/**
 * 服务商模式 JSAPI 下单（partner/transactions/jsapi）
 * 返回 paymentData 可直接给 WeChatPay 组件使用
 */
export async function partnerJsapiPrepay(
  config: PartnerJsapiPayConfig,
  params: {
    openid: string;
    amount: number;
    description: string;
    out_trade_no?: string;
    sub_mchid: string;
    sub_appid?: string;
    /** 使用 sub_openid 时传 true（子商户公众号/小程序下的 openid） */
    useSubOpenid?: boolean;
    /** 本次支付使用的服务商 AppID（公众号或小程序），不传则用 config.sp_appid，便于同一接口兼容公众号/小程序 */
    sp_appid?: string;
    /** 支付结果回调地址，不传则用 config.notify_url */
    notify_url?: string;
    /** 下单时传入则写入 attach，回调时优先转发到此 URL（attach 限 127 字节，超长则忽略） */
    notify_forward_url?: string;
  }
): Promise<{ paymentData: string; payParams: PayParams; out_trade_no: string }> {
  const out_trade_no =
    params.out_trade_no ||
    "WX" + Date.now() + Math.floor(Math.random() * 1000000);
  const urlPath = "/v3/pay/partner/transactions/jsapi";
  const apiHost = config.api_host || "https://api.mch.weixin.qq.com";
  const fullUrl = apiHost + urlPath;

  const payer = params.useSubOpenid
    ? { sub_openid: params.openid }
    : { sp_openid: params.openid };

  const spAppId = params.sp_appid?.trim() || config.sp_appid;
  const notifyUrl = params.notify_url?.trim() || config.notify_url;
  const body: PartnerJsapiBody = {
    sp_appid: spAppId,
    sp_mchid: config.sp_mchid,
    sub_mchid: params.sub_mchid,
    description: params.description,
    out_trade_no,
    notify_url: notifyUrl,
    amount: { total: params.amount, currency: "CNY" },
    payer,
  };
  if (params.sub_appid) body.sub_appid = params.sub_appid;
  if (params.useSubOpenid && params.sub_appid) body.sub_appid = params.sub_appid;
  const attach = buildAttachForForwardUrl(params.notify_forward_url ?? "");
  if (attach) body.attach = attach;

  const bodyStr = JSON.stringify(body);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = crypto.randomBytes(16).toString("hex");
  const signStr = `POST\n${urlPath}\n${timestamp}\n${nonceStr}\n${bodyStr}\n`;
  const signature = signWithPrivateKey(signStr, config.sp_cert_private_key);
  const token = `WECHATPAY2-SHA256-RSA2048 mchid="${config.sp_mchid}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${config.sp_cert_serial_no}"`;

  const res = await fetch(fullUrl, {
    method: "POST",
    headers: buildRequestHeaders(config, {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: token,
    }),
    body: bodyStr,
  });

  const data = (await res.json()) as PartnerJsapiResponse;
  if (!res.ok || data.error) {
    const msg = data.message || data.error || res.statusText;
    throw new Error(String(msg));
  }
  const prepayId = data.prepay_id;
  if (!prepayId) {
    throw new Error("微信未返回 prepay_id");
  }

  const appIdForPay = params.sub_appid || spAppId;
  const timeStamp2 = Math.floor(Date.now() / 1000).toString();
  const nonceStr2 = crypto.randomBytes(16).toString("hex");
  const pkg = `prepay_id=${prepayId}`;
  const signType = "RSA";
  const paySignStr = `${appIdForPay}\n${timeStamp2}\n${nonceStr2}\n${pkg}\n`;
  const paySign = signWithPrivateKey(paySignStr, config.sp_cert_private_key);

  const payParams: PayParams = {
    appId: appIdForPay,
    timeStamp: timeStamp2,
    nonceStr: nonceStr2,
    package: pkg,
    signType,
    paySign,
  };
  const paymentData = JSON.stringify(payParams);

  return { paymentData, payParams, out_trade_no };
}

/** 服务商查询订单返回（含 trade_state、transaction_id 等） */
export interface PartnerQueryResult {
  trade_state?: string;
  transaction_id?: string;
  out_trade_no?: string;
  amount?: { total?: number; payer_total?: number; currency?: string };
  payer?: { openid?: string };
  [key: string]: unknown;
}

/**
 * 服务商模式 查询订单状态
 */
export async function partnerQueryOrder(
  config: PartnerJsapiPayConfig,
  params: { out_trade_no: string; sub_mchid: string }
): Promise<PartnerQueryResult> {
  const apiHost = config.api_host || "https://api.mch.weixin.qq.com";
  const pathWithQuery = `/v3/pay/partner/transactions/out-trade-no/${encodeURIComponent(params.out_trade_no)}?sp_mchid=${config.sp_mchid}&sub_mchid=${params.sub_mchid}`;
  const fullUrl = `${apiHost}${pathWithQuery}`;

  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = crypto.randomBytes(16).toString("hex");
  const signStr = `GET\n${pathWithQuery}\n${timestamp}\n${nonceStr}\n\n`;
  const signature = signWithPrivateKey(signStr, config.sp_cert_private_key);
  const token = `WECHATPAY2-SHA256-RSA2048 mchid="${config.sp_mchid}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${config.sp_cert_serial_no}"`;

  const res = await fetch(fullUrl, {
    method: "GET",
    headers: buildRequestHeaders(config, { Accept: "application/json", Authorization: token }),
  });
  const data = (await res.json()) as PartnerQueryResult & { error?: string; message?: string };
  if (!res.ok || data.error) {
    const msg = data.message || data.error || res.statusText;
    throw new Error(String(msg));
  }
  return data;
}

/** 服务商回调验签解密结果（与直连 WxPayCallbackResult 结构一致） */
export interface PartnerCallbackResult {
  id: string;
  create_time: string;
  event_type: string;
  resource_type: string;
  summary: string;
  resource: Record<string, unknown>;
}

/**
 * 服务商模式 回调验签与解密
 * 验签：若配置了 wechatpay_public_key 则用本地公钥验签；若 skip_callback_verify 则只解密。
 */
export async function partnerVerifyCallback(
  config: PartnerJsapiPayConfig,
  rawBody: string,
  headers: Record<string, string>
): Promise<PartnerCallbackResult> {
  const body = JSON.parse(rawBody) as Record<string, unknown>;
  const resource = body.resource as { ciphertext: string; associated_data?: string; nonce: string };
  if (!resource?.ciphertext || !resource?.nonce) {
    throw new Error("回调 body.resource 不完整");
  }
  const keyLen = Buffer.byteLength(config.sp_apiv3_secret, "utf8");
  if (keyLen !== 32) {
    throw new Error(
      `wxpay_sp_apiv3_secret 必须为 32 字节（通常为 32 个字符），当前为 ${keyLen} 字节。请检查商户平台「API 安全」中的 APIv3 密钥是否完整复制到服务器 .env，且无多余空格/换行`
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
        "未配置 wechatpay_public_key 且未开启 skip_callback_verify。请配置 wxpay_sp_wechatpay_public_key（PEM 内容），或设置 wxpay_sp_skip_callback_verify=true"
      );
    }
    const ok = verifySignWithPublicKey(timestamp, nonce, rawBody, signature, pubKey);
    if (!ok) throw new Error("回调验签失败");
  }

  const decrypted = decipherGcm(
    resource.ciphertext,
    resource.associated_data ?? "",
    resource.nonce,
    config.sp_apiv3_secret
  );
  return {
    id: String(body.id ?? ""),
    create_time: String(body.create_time ?? ""),
    event_type: String(body.event_type ?? ""),
    resource_type: String(body.resource_type ?? ""),
    summary: String(body.summary ?? ""),
    resource: decrypted,
  };
}

/** 服务商退款参数 */
export interface PartnerRefundParams {
  out_trade_no: string;
  out_refund_no: string;
  refund_amount: number;
  total_amount: number;
  reason?: string;
  sub_mchid: string;
}

/**
 * 服务商模式 退款（V3 退款接口，需证书）
 */
export async function partnerRefund(
  config: PartnerJsapiPayConfig,
  params: PartnerRefundParams
): Promise<{ refund_id?: string; [key: string]: unknown }> {
  const apiHost = config.api_host || "https://api.mch.weixin.qq.com";
  const urlPath = "/v3/refund/domestic/refunds";
  const fullUrl = apiHost + urlPath;

  const body = {
    sub_mchid: params.sub_mchid,
    out_trade_no: params.out_trade_no,
    out_refund_no: params.out_refund_no,
    reason: params.reason || "用户申请退款",
    amount: {
      refund: params.refund_amount,
      total: params.total_amount,
      currency: "CNY",
    },
  };
  const bodyStr = JSON.stringify(body);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const nonceStr = crypto.randomBytes(16).toString("hex");
  const signStr = `POST\n${urlPath}\n${timestamp}\n${nonceStr}\n${bodyStr}\n`;
  const signature = signWithPrivateKey(signStr, config.sp_cert_private_key);
  const token = `WECHATPAY2-SHA256-RSA2048 mchid="${config.sp_mchid}",nonce_str="${nonceStr}",signature="${signature}",timestamp="${timestamp}",serial_no="${config.sp_cert_serial_no}"`;

  const res = await fetch(fullUrl, {
    method: "POST",
    headers: buildRequestHeaders(config, {
      Accept: "application/json",
      "Content-Type": "application/json",
      Authorization: token,
    }),
    body: bodyStr,
  });
  const data = (await res.json()) as Record<string, unknown> & { error?: string; message?: string };
  if (!res.ok || data.error) {
    const msg = (data.message || data.error || res.statusText) as string;
    throw new Error(String(msg));
  }
  return data;
}
