import { WxAuthConfig } from "./miniprogram/WxAuth";
import { JsapiPayConfig } from "./pay/JsapiPay";
import type { PartnerJsapiPayConfig } from "./pay/PartnerJsapiPay";
export type { WxAuthConfig, JsapiPayConfig };

/**
 * 微信小程序配置
 */
export const wxAuthConfig: WxAuthConfig = {
  appId: process.env.WX_APP_ID || "",
  appSecret: process.env.WX_APP_SECRET || "",
};

/** 直连：微信支付公钥为证书内容（字符串），非路径 */
const wxpayPublicKey = process.env.wxpay_wechatpay_public_key?.replace(/\\n/g, "\n").trim() || undefined;

/**
 * 微信支付配置（直连商户）
 * 环境变量前缀：wxpay_*
 */
export const jsapiPayConfig: JsapiPayConfig = {
  mchid: process.env.wxpay_mchid || "",
  appid: process.env.wxpay_appid || "",
  cert_serial_no: process.env.wxpay_cert_serial_no || "",
  cert_private_key: process.env.wxpay_cert_private_key || "",
  apiv3_secret: process.env.wxpay_apiv3_secret || "",
  notify_url: process.env.wxpay_notify_url || "",
  notify_forward_url: process.env.wxpay_notify_forward_url || "",
  skip_callback_verify: process.env.wxpay_skip_callback_verify === "true",
  wechatpay_public_key: wxpayPublicKey,
};

/** 服务商：微信支付公钥为证书内容（字符串），非路径 */
const wxpaySpPublicKey = process.env.wxpay_sp_wechatpay_public_key?.replace(/\\n/g, "\n").trim() || undefined;

/**
 * 微信支付 服务商模式 配置
 * 环境变量前缀：wxpay_sp_*
 */
export const partnerJsapiPayConfig: PartnerJsapiPayConfig = {
  sp_mchid: process.env.wxpay_sp_mchid || "",
  sp_appid: process.env.wxpay_sp_appid || "",
  sp_cert_serial_no: process.env.wxpay_sp_cert_serial_no || "",
  sp_cert_private_key: process.env.wxpay_sp_cert_private_key || "",
  sp_apiv3_secret: process.env.wxpay_sp_apiv3_secret || "",
  api_host: "https://api.mch.weixin.qq.com",
  notify_url: process.env.wxpay_sp_notify_url || "",
  notify_forward_url: process.env.wxpay_sp_notify_forward_url || "",
  skip_callback_verify: process.env.wxpay_sp_skip_callback_verify === "true",
  wechatpay_serial: process.env.wxpay_sp_wechatpay_serial?.trim() || undefined,
  wechatpay_public_key: wxpaySpPublicKey,
};
